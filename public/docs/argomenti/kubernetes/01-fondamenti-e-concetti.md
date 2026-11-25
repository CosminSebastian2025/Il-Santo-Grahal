Kubernetes è un orchestratore di container: riceve la descrizione dello stato desiderato di un'applicazione, la conserva in un database distribuito e lavora in ciclo chiuso per farla coincidere con lo stato reale del cluster. Non esegue comandi una volta e dimentica il risultato: confronta continuamente l'osservato con il voluto e correggi la differenza. Questa lezione spiega da quali pezzi è fatto un cluster e quali oggetti si scrivono.

## Obiettivi

- Descrivere i componenti di control plane e nodi e il percorso di una richiesta `kubectl apply`.
- Distinguere oggetti dichiarativi, controller e reconcile loop.
- Riconoscere Pod, Deployment, Service e ConfigMap e quando servirne uno diverso.
- Sapere quali campi sono identificativi e immutabili e perché `metadata` conta quanto `spec`.

## Architettura del cluster

Il control plane è composto da `kube-apiserver`, `etcd`, `kube-scheduler` e `kube-controller-manager`; su ogni nodo girano `kubelet`, il container runtime (containerd) e il plugin di rete. L'`apiserver` è l'unico punto di accesso a `etcd`: nessun componente interno parla direttamente con il database. Lo scheduler non esegue nulla: assegna un Pod a un nodo scrivendo il campo `spec.nodeName`, e il kubelet di quel nodo lo realizza.

| Componente | Dove | Compito | Non fa |
| --- | --- | --- | --- |
| `kube-apiserver` | control plane | validazione, autenticazione, watch | non avvia container |
| `etcd` | control plane | stato e revisioni delle risorse | non conosce il significato degli oggetti |
| `kube-scheduler` | control plane | scelta del nodo | non avvia container |
| `kube-controller-manager` | control plane | controller integrati | non esegue Pod |
| `kubelet` | nodo | realizza i Pod assegnati | non decide dove metterli |
| CNI | nodo | rete pod-to-pod | non filtra senza policy |

Quando esegui `kubectl apply -f deployment.yaml`, il client invia una richiesta all'`apiserver` con il manifest; il server valida contro schema e admission, scrive in `etcd` e notifica i watcher. Il `ReplicaSet` controller del `kube-controller-manager` crea i Pod, lo scheduler li assegna, i kubelet li avviano e aggiornano `status`. Il tempo tra `apply` e Pod `Running` dipende da questa sequenza, non da un'unica azione.

## Il ciclo di controllo

Un controller è un programma che legge lo stato desiderato, legge lo stato reale, calcola la differenza e agisce. Il `Deployment` non crea Pod: crea un `ReplicaSet`, che crea Pod. Ogni livello ha un solo compito, e questa catena permette le strategie di rilascio: il `Deployment` controlla quanti ReplicaSet esistono e con quali repliche.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: {app: web}
spec:
  replicas: 3
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
        - name: web
          image: ghcr.io/esempio/web:1.4.0
          ports: [{containerPort: 8080}]
```

Il campo `selector` è immutabile e deve corrispondere a `template.metadata.labels`: se non corrisponde, l'`apiserver` rifiuta l'oggetto; se lo modifichi dopo, l'`apply` fallisce finché non elimini e ricrei. Questa rigidità esiste perché il `Deployment` possiede i `ReplicaSet` tramite quella selezione, e cambiarne il significato romperebbe il legame.

```bash
kubectl apply -f deployment.yaml
kubectl get deploy,rs,pod -l app=web
kubectl describe pod -l app=web | grep -A3 Events
```

`kubectl describe` mostra gli eventi (`Scheduled`, `Pulled`, `Created`, `Started`): sono la prima cosa da leggere quando un Pod non parte, prima dei log, che in quel caso possono non esistere.

## Servizi, configurazione e segreti

I Pod sono effimeri e hanno indirizzi che cambiano. Il `Service` fornisce un indirizzo stabile e un selettore verso i Pod pronti, tramite `Endpoints` o `EndpointSlice` aggiornati dai controller. La forma più usata nei cluster moderni è `ClusterIP` per la comunicazione interna e `Ingress` o `Gateway` per l'esterno; `NodePort` e `LoadBalancer` servono quando non c'è un livello di ingresso.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: {app: web}
  ports:
    - port: 80
      targetPort: 8080
```

La configurazione si separa dall'immagine con `ConfigMap` e `Secret`. Entrambi finiscono nel Pod come variabili d'ambiente o file montati. `ConfigMap` è testo semplice ed è visibile a chi può leggere la risorsa; `Secret` è codificato in base64, non cifrato: chi ha accesso a `etcd` o al permesso `get secrets` lo legge in chiaro. Per i segreti veri servono cifratura a riposo in `etcd`, gestione chiavi esterna e `RBAC` ristretto.

| Risorsa | Uso | Attenzione |
| --- | --- | --- |
| `ConfigMap` | parametri non sensibili | un aggiornamento non riavvia il Pod |
| `Secret` | credenziali, token, certificati | base64 non è cifratura |
| `Service` | indirizzo stabile | senza Pod pronti il traffico va in errore |
| `Ingress` | HTTP su host e path | richiede un Ingress Controller |

Un errore frequente con `ConfigMap` è aspettarsi il riavvio automatico: le variabili d'ambiente vengono lette all'avvio del container e un aggiornamento della `ConfigMap` non le cambia. I file montati si aggiornano con qualche secondo di ritardo, ma l'applicazione deve rileggerli per accorgersene. La soluzione robusta è un checksum della configurazione nell'annotazione del `Deployment`, che cambia quando cambia il contenuto e forza un rollout.

## Dove eseguire i primi passi

Per imparare l'API: `kind` crea un cluster in container Docker, `minikube` un nodo con driver locale. Gli stessi manifest funzionano in un cluster gestito, dove cambiano solo accesso (`kubeconfig`) e classi di storage.

## Errori comuni

- **Modificare `selector` del `Deployment`**: campo immutabile, l'apply fallisce; per cambiarne il significato occorre ricreare l'oggetto.
- **Trattare `Secret` come cifrato**: base64 è encoding; senza cifratura a riposo e RBAC chi ha accesso al namespace legge le credenziali.
- **Aspettarsi che una `ConfigMap` aggiornata riavvii i Pod**: serve una modifica al template o un checksum che la rifletta.
- **Mettere `label` incoerenti tra Service e Pod**: il `Service` resta senza endpoint e il traffico fallisce senza errori espliciti nel pod.
- **Usare `kubectl run` in produzione**: crea oggetti non tracciati da un manifest; le risorse vanno dichiarate e versionate.

## In sintesi

Kubernetes è un ciclo di controllo: l'`apiserver` conserva il voluto, i controller confrontano con il reale, i kubelet realizzano i Pod. `Deployment`, `ReplicaSet` e Pod sono una catena di controller con selettori immutabili. `Service`, `ConfigMap` e `Secret` completano l'operatività, con i limiti di quest'ultimo da tenere a mente. Un cluster `kind` permette di sperimentare l'API prima di toccare un ambiente corretto.

## Fonti

- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [Cluster Architecture](https://kubernetes.io/docs/concepts/overview/components/)
- [Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
