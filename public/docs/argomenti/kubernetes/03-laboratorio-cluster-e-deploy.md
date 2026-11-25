In questo laboratorio crei un cluster locale con `kind`, deployi un servizio con `Deployment` e `Service`, provochi tre guasti classici — readiness fallita, `OOMKilled`, immagine inesistente — e li diagnostichi leggendo `Events`, `EndpointSlice` e `status`. Alla fine esegui un rollout con rollback e hai un ciclo di diagnosi completo da ripetere su qualunque manifest.

## Obiettivi

- Creare un cluster `kind` con due nodi e caricare un'immagine locale senza registry.
- Deployare Deployment, Service e ConfigMap con rollout verificato.
- Reprimere tre guasti e riconoscere la causa dai segnali del cluster.
- Eseguire un rollout e un rollback, misurando il tempo e la continuità del servizio.

## Cluster e strumenti

Servono Docker, `kind` e `kubectl` allineati alla stessa minor del cluster (per esempio Kubernetes 1.34). Il file di configurazione crea un control plane e due worker, così il rollout ha nodi diversi su cui lavorare.

```bash
cat > kind-lab.yaml <<'YAML'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
YAML

kind create cluster --name lab --config kind-lab.yaml --image kindest/node:v1.34.0
kubectl cluster-info --context kind-lab
kubectl get nodes
```

L'immagine `kindest/node` deve avere la stessa minor del `kubectl`: un client molto più recente accetta il cluster ma alcune risorse non compaiono.

## Applicazione e manifest

L'applicazione è `hashicorp/http-echo`, che risponde con il testo passato negli argomenti: sufficiente per provare service, probe e rollout senza costruire un'immagine.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
data:
  APP_MODE: demo
  GREETING: "ciao dal cluster"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels: {app: web}
spec:
  replicas: 2
  minReadySeconds: 5
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxSurge: 1, maxUnavailable: 0}
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
      annotations:
        checksum/config: "rev-1"
    spec:
      containers:
        - name: web
          image: hashicorp/http-echo:1.0.0
          args: ["-text=$(GREETING)", "-listen=:5678"]
          ports: [{containerPort: 5678}]
          envFrom:
            - configMapRef: {name: web-config}
          readinessProbe:
            httpGet: {path: /, port: 5678}
            periodSeconds: 3
          resources:
            requests: {cpu: 50m, memory: 32Mi}
            limits: {cpu: 200m, memory: 64Mi}
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector: {app: web}
  ports: [{port: 80, targetPort: 5678}]
```

```bash
kubectl apply -f web.yaml
kubectl rollout status deploy/web --timeout=120s
kubectl get pods --show-labels
kubectl get endpointslices -l kubernetes.io/service-name=web -o wide
kubectl run curl --rm -it --image=curlimages/curl --restart=Never -- \
  sh -c 'for i in 1 2 3; do curl -s http://web:80/; done'
```

Se il `Service` risponde tre volte con il testo della `ConfigMap`, funzionano DNS interno, endpoint e probe. Per un rollout da cambio di configurazione, aggiorna l'annotazione a `rev-2` e ripeti l'`apply`.

## Tre guasti e come si riconoscono

| Guasto | Modifica | Segnale | Diagnosi |
| --- | --- | --- | --- |
| readiness fallita | porta della probe errata | `Pod Running`, endpoint slice vuota | `describe` mostra `Readiness probe failed` |
| OOMKilled | richiesta `/big` con limite 64Mi | `restarts` in aumento | `Last State: Terminated, Reason: OOMKilled` |
| immagine assente | tag inesistente | `ImagePullBackOff` | `Events` riporta `manifest unknown` |

```bash
# 1) readiness: porta sbagliata nel manifest
kubectl patch deploy/web --type=json \
  -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":9999}]'
kubectl get endpointslices -l kubernetes.io/service-name=web -o wide   # nessun indirizzo
kubectl describe pod -l app=web | grep -A2 'Readiness probe failed' | head
kubectl rollout undo deploy/web

# 2) OOMKilled: riduci il limite e forza riavvio del container
kubectl set resources deploy/web --limits=memory=16Mi
kubectl rollout status deploy/web
kubectl get pods -l app=web
kubectl describe pod -l app=web | grep -E 'Last State|Reason|Exit Code'
kubectl rollout undo deploy/web

# 3) immagine inesistente
kubectl set image deploy/web web=hashicorp/http-echo:9.9.9
kubectl get pods -l app=web -w    # ImagePullBackOff
kubectl describe pod -l app=web | grep -A3 'Failed'
kubectl rollout undo deploy/web
```

L'ordine di lettura è fisso: `get pods`, `describe pod` per gli eventi, `logs` solo se il container è partito, `get endpointslices` per i problemi di connettività. Invertirlo porta a leggere log inesistenti.

## Rollout con continuità di servizio

Con due repliche e `maxUnavailable: 0` esegui un cambio di immagine mentre un ciclo di `curl` misura le risposte non riuscite. Il ciclo gira in un Pod per essere nella stessa rete del `Service`.

```bash
kubectl run load --rm -it --image=curlimages/curl --restart=Never -- \
  sh -c 'p=0;f=0; i=0; while [ $i -lt 200 ]; do
    i=$((i+1)); if curl -s -m 2 -o /dev/null -w "" http://web:80/; then p=$((p+1)); else f=$((f+1)); fi
  done; echo "ok=$p fail=$f"'

# in un secondo terminale
kubectl set image deploy/web web=hashicorp/http-echo:1.0.0
kubectl rollout status deploy/web --timeout=120s
kubectl rollout history deploy/web
```

Il risultato atteso è `fail=0`; ogni failure indica `minReadySeconds` troppo basso, readiness prematura o `maxUnavailable` maggiore di zero. `kubectl rollout history` mostra le revisioni; `kubectl rollout undo deploy/web --to-revision=N` torna indietro solo se il vecchio `ReplicaSet` esiste ancora.

Il laboratorio è superato con quattro prove registrate: la risposta del `Service` prima e dopo il rollout, lo stato `ImagePullBackOff` letto e spiegato, un `OOMKilled` con exit code 137, e un rollback che riporta la revisione precedente. Ripeti poi la stessa sequenza con `kubectl delete pod` su un Pod e verifica che `ReplicaSet` ne crei un altro con nome diverso: è il comportamento che rende superfluo intervenire a mano.

## Errori comuni

- **Guardare i log di un Pod in `ImagePullBackOff`**: i log non esistono; servono gli `Events`, che dicono dell'errore di pull.
- **Aumentare `cpu` per risolvere un `OOMKilled`**: la CPU non c'entra, il limite da alzare è quello di memoria.
- **Fare `rollout undo` senza `revisionHistoryLimit` sufficiente**: la revisione desiderata non esiste più e il comando ritorna un errore.
- **Usare `kubectl edit` come strumento di deploy**: modifica lo stato vivo ma non il manifest, e il prossimo `apply` la sovrascrive.
- **Fermare il ciclo di `curl` al primo errore**: un errore isolato è segnale di continuità rotta; va contato sull'intera sequenza.

## In sintesi

Il laboratorio collega manifest, probe, risorse e diagnosi in un flusso unico: normale, guasto, lettura dei segnali, correzione. La procedura di emergenza sta in tre comandi (`get pods`, `describe pod`, `get endpointslices`) e non richiede strumenti aggiuntivi. Il rollout con `maxSurge` e `maxUnavailable` verificato da un ciclo di richieste è la prova che l'aggiornamento non interrompe il servizio.

## Fonti

- [kind - Kubernetes in Docker](https://kind.sigs.k8s.io/)
- [Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
