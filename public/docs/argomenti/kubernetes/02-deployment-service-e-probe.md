Un `Deployment` corretto non si riconosce dal numero di righe del manifest ma da tre scelte: come avviene il rollout, quando un Pod è considerato pronto e come il traffico raggiunge solo i Pod pronti. In questa lezione costruisci un servizio con update progressivo, probe coerenti con l'applicazione e limiti di risorse che permettono allo scheduler di lavorare.

## Obiettivi

- Configurare `strategy`, `maxSurge`, `maxUnavailable` e `minReadySeconds` per un rollout senza interruzioni.
- Scrivere startup, readiness e liveness probe distinguendo i casi d'uso.
- Definire `requests` e `limits` e capire l'effetto sulla QoS e sullo scheduling.
- Collegare `Service` e `Pod` tramite selettore e leggere gli endpoint.

## Rollout e strategia di aggiornamento

Il `Deployment` gestisce due strategie: `Recreate`, che elimina tutti i Pod prima di crearne di nuovi, e `RollingUpdate`, il default, che crea e distrugge in modo incrementale. Il numero di Pod in più si chiama surge, quello di Pod disponibili in meno si chiama unavailable. Con 3 repliche, `maxSurge: 1` e `maxUnavailable: 0` si ha sempre capacità piena e un solo Pod nuovo per volta.

```yaml
spec:
  replicas: 3
  minReadySeconds: 10
  progressDeadlineSeconds: 300
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: web
          image: ghcr.io/esempio/web:1.4.0
```

`minReadySeconds: 10` impedisce che un Pod appena pronto venga conteggiato come disponibile e sostituito subito: con `0` il rollout può completarsi prima che l'applicazione abbia smesso di restituire errori di warming. `progressDeadlineSeconds` trasforma un rollout bloccato in un errore visibile nel campo `status`, invece di lasciare il `Deployment` in attesa per sempre.

```bash
kubectl rollout status deploy/web --timeout=180s
kubectl rollout history deploy/web
kubectl rollout undo deploy/web --to-revision=3
kubectl rollout pause deploy/web   # canary manuale con cambio immagine
kubectl set image deploy/web web=ghcr.io/esempio/web:1.5.0
kubectl rollout resume deploy/web
```

Lo storico dei rollout contiene le revisioni precedenti, ma solo i `ReplicaSet` non ancora eliminati hanno il template importabile: con `revisionHistoryLimit` basso il rollback a una revisione vecchia fallisce. Se continui a usare una versione specifica dell'immagine (tag semantico, non `latest`), il rollback è affidabile quanto lo sono le immagini nel registry.

## Probe: tre domande diverse

| Probe | Domanda | Se fallisce | Uso corretto |
| --- | --- | --- | --- |
| `startupProbe` | l'app è stata avviata? | il container viene ucciso | applicazioni con avvio lento |
| `readinessProbe` | l'app può ricevere traffico? | il Pod viene tolto dagli endpoint | dipendenze a valle, cache fredda |
| `livenessProbe` | l'app è viva o in stallo? | il container viene riavviato | deadlock, loop interni |

La `livenessProbe` su un endpoint che contatta il database è un errore classico: quando il database è lento, il Pod viene riavviato, la coda di lavoro si allunga e il problema peggiora. La liveness deve verificare solo lo stato del processo. La readiness può dipendere da una cache o da una connessione, perché togliere il Pod dalla rotazione è una reazione proporzionata.

```yaml
        startupProbe:
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 2
          failureThreshold: 30
        readinessProbe:
          httpGet: {path: /ready, port: 8080}
          periodSeconds: 5
          failureThreshold: 2
        livenessProbe:
          httpGet: {path: /healthz, port: 8080}
          periodSeconds: 20
          failureThreshold: 3
```

Con `startupProbe` attiva, le altre due non vengono valutate finché l'avvio non è completato: è il modo corretto di gestire una JVM o un'app con migrazioni lunghe, invece di allungare `initialDelaySeconds` della liveness che poi vale per tutto il ciclo di vita.

## Risorse, QoS e scheduling

`requests` è ciò che lo scheduler garantisce in termini di CPU e memoria; `limits` è il tetto massimo. La memoria oltre il limite termina il container (`OOMKilled`), la CPU oltre il limite viene solo rallentata. Tre combinazioni danno le classi QoS:

| Classe | Condizione | Rischio in caso di pressione |
| --- | --- | --- |
| `Guaranteed` | requests uguali ai limits per ogni container | ultima candidata all'eviction |
| `Burstable` | requests < limits | eviction se supera le requests |
| `BestEffort` | né requests né limits | prima candidata all'eviction |

```yaml
          resources:
            requests: {cpu: 100m, memory: 128Mi}
            limits: {cpu: 500m, memory: 256Mi}
```

Senza `requests` lo scheduler non sa quanto spazio logico occupa il Pod su un nodo e il cluster diventa sovraccarico pur sembrando vuoto. `OOMKilled` con memoria reale molto inferiore al limite è spesso segno di un `limit` troppo basso per il picco, non di un leak: `kubectl describe pod` riporta `Last State: Terminated, Reason: OOMKilled` e `kubectl top pod` mostra l'andamento.

## Service ed endpoint

Il `Service` seleziona i Pod per label e ne pubblica gli indirizzi in `EndpointSlice`. Se il selettore non corrisponde, il `Service` esiste ma non ha endpoint e ogni connessione riceve un errore. `kubectl get endpointslices` è il comando che distingue "il servizio non ha Pod" da "i Pod non sono pronti": una readiness fallita toglie l'indirizzo dalla slice anche se il Pod è `Running`.

```bash
kubectl get pods --show-labels
kubectl get endpointslices -l kubernetes.io/service-name=web -o wide
kubectl run curl --rm -it --image=curlimages/curl --restart=Never -- \
  curl -sS http://web:80/healthz
```

Il Pod `curl` effimero verifica la risoluzione DNS interna e la connettività con la rete del cluster senza esporre la porta sul host. Se il comando risponde e il nome `web` non si risolve, il problema è il `Service`, non la rete.

```bash
kubectl rollout restart deploy/web
kubectl describe pod -l app=web | grep -E 'Readiness|Liveness|Events' -A2
```

## Errori comuni

- **`livenessProbe` su endpoint che interroga dipendenze esterne**: un rallentamento del database diventa un riavvio di tutti i Pod.
- **`maxUnavailable: 0` senza `maxSurge`**: il rollout non può procedere e resta bloccato finché non scade `progressDeadlineSeconds`.
- **Senza `requests`**: i nodi apparentemente liberi vengono sovraccaricati e l'eviction colpisce a caso.
- **Image con tag `latest`**: il rollout dichiara una revisione ma il contenuto può essere diverso; usare tag immutabili o digest.
- **`minReadySeconds` a zero con app che scaldano**: i Pod nuovi ricevono traffico prima di essere in grado di servirlo.

## In sintesi

Il rollout è controllato da `maxSurge`, `maxUnavailable`, `minReadySeconds` e `progressDeadlineSeconds`: quattro campi che decidono il comportamento in caso di errore. Le probe rispondono a domande diverse e non vanno confuse, soprattutto la liveness. `requests` e `limits` cambiano scheduling e QoS. Il `Service` pubblica solo i Pod pronti, e leggere `EndpointSlice` spiega la maggior parte dei problemi di connettività.

## Fonti

- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Services](https://kubernetes.io/docs/concepts/services-networking/service/)
