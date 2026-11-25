In questo laboratorio costruisci `notes`, un chart che installa una piccola API con ConfigMap, Deployment, Service, Ingress e un Job di migrazione, poi lo distribuisci su due ambienti, verifichi il rollback e lo pubblichi su un registry OCI locale. Serve un cluster raggiungibile (kind, k3d o minikube) e Helm 4. Ogni passo produce un comando con output atteso, così sai subito se qualcosa è andato storto.

## Obiettivi

- Creare il chart da zero senza `helm create` e renderizzare i manifest con `helm template`.
- Valori diversi per staging e produzione con overlay e schema di validazione.
- Installare con `--atomic`, provocare un failure e osservare il rollback automatico.
- Pubblicare il chart su un registry OCI e reinstallarlo da lì.
- Lasciare il cluster pulito e la history sotto controllo.

## Scheletro e contratto dei valori

Il contratto del chart sono i valori: `replicaCount`, `image.repository`, `image.tag`, `ingress.enabled`, `ingress.host`, `resources`, `env`. Tutto il resto è implementazione. Il Job di migrazione esiste solo se `migrate.enabled` è vero, perché in locale non serve.

```bash
kubectl create namespace notes-dev
mkdir -p notes/templates notes/ci
cat > notes/Chart.yaml <<'EOF'
apiVersion: v2
name: notes
version: 0.1.0
appVersion: "1.4.0"
description: API di note con migrazione pre-upgrade
type: application
kubeVersion: ">=1.28.0-0"
EOF
```

```yaml
# notes/values.yaml
replicaCount: 2
image:
  repository: ghcr.io/example/notes-api
  tag: ""            # vuoto = usa appVersion
  pullPolicy: IfNotPresent
migrate:
  enabled: true
ingress:
  enabled: false
  host: notes.local
resources:
  requests: { cpu: 50m, memory: 64Mi }
  limits:   { cpu: 500m, memory: 256Mi }
env:
  LOG_LEVEL: info
  DB_POOL: "5"
```

I template riusano gli helper minimi: `notes.fullname` e `notes.selectorLabels`. Il tag dell'immagine segue la regola `default .Chart.AppVersion`, quindi `appVersion: "1.4.0"` determina l'immagine se non override.

```gotemplate
{{- define "notes.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

```bash
cd notes
helm lint . --strict
helm template dev . --show-only templates/deployment.yaml | grep image:
# atteso: image: "ghcr.io/example/notes-api:1.4.0"
```

## Overlay di ambiente, schema e install

Staging e produzione differiscono per repliche, log e ingress. L'overlay `values-prod.yaml` si limita a ciò che cambia: duplicare tutti i valori crea divergenze silenziose quando il default cambia.

```yaml
# notes/values-prod.yaml
replicaCount: 4
migrate:
  enabled: true
ingress:
  enabled: true
  host: notes.example.com
env:
  LOG_LEVEL: warn
```

Per impedire valori sbagliati aggiungi lo schema, che `helm lint` e `helm install` applicano prima del rendering.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["replicaCount", "image"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": { "tag": { "type": "string" } }
    },
    "ingress": { "type": "object", "required": ["enabled", "host"] }
  }
}
```

```bash
helm install notes-dev . -n notes-dev -f values-prod.yaml --wait --timeout 5m
helm list -n notes-dev
helm get values notes-dev -n notes-dev -a   # computed values inclusi
kubectl get deploy,svc,job -n notes-dev -l app.kubernetes.io/instance=notes-dev
```

`helm get values -a` mostra anche i valori calcolati, cioè `global` e i default applicati: è il modo corretto per capire cosa ha visto davvero il renderer. Se il Job di migrazione non compare, controlla `migrate.enabled` nell'overlay prima di sospettare gli hook.

## Failure controllato e rollback

Il test più utile è un deploy che fallisce. Metti un tag inesistente e lascia che `--atomic` faccia il suo lavoro: la release torna alla revisione precedente e il Service resta servito dal vecchio ReplicaSet.

```bash
helm upgrade notes-dev . -n notes-dev -f values-prod.yaml \
  --set image.tag=9.9.9 --atomic --wait --timeout 90s
# atteso: Error: UPGRADE FAILED: ... context deadline exceeded
#         Rollback "notes-dev" successfully rolled back to revision 1
helm history notes-dev -n notes-dev
kubectl get pods -n notes-dev   # i pod della revisione 1 sono ancora Running
```

Il secondo test riguarda l'impatto della history: cinque upgrade equivalgono a cinque Secret con il manifest reso completo. Con `--history-max 3` il numero resta limitato anche dopo decine di deploy.

```bash
for v in 1.4.1 1.4.2 1.4.3 1.4.4; do
  helm upgrade notes-dev . -n notes-dev -f values-prod.yaml --set image.tag=$v --history-max 3
done
kubectl get secret -n notes-dev -l owner=helm | wc -l
```

Helm conserva lo stato con il driver `secret` nel namespace della release e, in alternativa, con il backend SQL per installazioni molto grandi; in ogni caso la history serve ai rollback vicini nel tempo, non come archivio storico del deploy.

## Pubblicazione su registry OCI

Un chart pronto si pubblica su un registry OCI compatibile. In locale un registry Docker in ascolto come `localhost:5000` accetta anche manifest OCI con media type Helm.

```bash
docker run -d -p 5000:5000 --name registry registry:2
helm package . -d ../dist
helm push ../dist/notes-0.1.0.tgz oci://localhost:5000/charts --plain-http
helm show chart oci://localhost:5000/charts/notes --version 0.1.0 --plain-http
helm install notes-oci oci://localhost:5000/charts/notes --version 0.1.0 \
  -n notes-dev --plain-http --wait
```

Il riferimento OCI identifica chart e versione con due componenti separati: `oci://host/path/nome` e `--version`. Se `--version` manca, Helm prende l'ultima pubblicata, che in produzione è esattamente ciò che non vuoi. `--plain-http` esiste solo per registry locali senza TLS e va rimosso in ogni altro contesto.

| Passo | Comando | Verifica |
| --- | --- | --- |
| pacchetto | `helm package .` | `notes-0.1.0.tgz` in `dist/` |
| pubblicazione | `helm push ... oci://` | digest stampato |
| ispezione | `helm show chart --version` | versione e appVersion corretti |
| install da OCI | `helm install ... --version` | release in `helm list` |

## Esercizi

1. Aggiungi un `values-ci.yaml` e rendi `helm template` obbligatorio in CI con `--validate` su un cluster efimero.
2. Introduci un subchart `redis` disattivato di default con `condition` e verifica con `helm dependency update`.
3. Rendilo un chart `type: library` che espone solo `notes.labels`, e fai dipendere `notes` da lui.
4. Aggiungi un test Pod con `helm.sh/hook: test` e fallo girare con `helm test`.
5. Misura la differenza fra `--history-max 3` e default su una history di dieci revisioni.

<details>
<summary>Soluzione</summary>

1. `values-ci.yaml` imposta `replicaCount: 1` e `migrate.enabled: false`; il job CI esegue `helm template ci . -f values-ci.yaml --set image.tag=$GIT_SHA` e `helm lint --strict`.

2. In `Chart.yaml` la dipendenza ha `condition: redis.enabled`; `helm dependency update` crea `charts/redis-<ver>.tgz` e `Chart.lock`, che va committato.

3. Il chart di libreria ha solo `Chart.yaml` con `type: library` e `templates/_helpers.tpl`; il chart applicativo lo dichiara come dipendenza e chiama `include "common.labels"`.

4. Il Pod di test usa `helm.sh/hook: test` e `hook-delete-policy: before-hook-creation`; `helm test notes-dev -n notes-dev` lo esegue e collega il risultato alla release.

5. Dieci upgrade producono dieci Secret `sh.helm.release.v1.notes-dev.v*` più quello della release corrente. Con `--history-max 3` restano solo le ultime tre revisioni, quindi il numero di Secret è costante e `helm rollback` funziona solo entro quella finestra.

</details>

## Errori comuni

- **Fare `helm upgrade` senza controllare `helm get values`**: si aggiorna pensando a un overlay vecchio che non era quello applicato.
- **Contare su `--atomic` per ogni errore**: il rollback è affidabile per fallimenti di readiness, non per migrazioni che hanno già modificato lo schema del database.
- **Omettere `--version` in un install da OCI**: la versione cambia sotto i piedi a chi riproduce il deploy.
- **Usare `--plain-http` fuori dal laboratorio**: espone chart e valori su rete in chiaro.
- **Pubblicare senza aver reso il chart**: `helm template` non eseguito significa manifest nuovi mai visti.

## In sintesi

Il laboratorio ha attraversato il ciclo completo: chart minimale scritto a mano, valori stratificati con schema, install con `--wait`, failure indotta con rollback automatico, history limitata e pubblicazione OCI con versione fissata. Il risultato è un oggetto versionato che un altro team può installare senza leggere i template, che è il vero criterio di qualità di un chart.

## Fonti

- [Helm - helm package](https://helm.sh/docs/helm/helm_package/)
- [Helm - Use OCI-based registries](https://helm.sh/docs/topics/registries/)
- [Helm - Chart Tests](https://helm.sh/docs/topics/chart_tests/)
- [Helm - helm lint](https://helm.sh/docs/helm/helm_lint/)
