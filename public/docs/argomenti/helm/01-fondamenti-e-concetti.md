Helm è il gestore di pacchetti di Kubernetes: prende un insieme di manifest YAML, lo descrive come grafico parametrizzato e lo installa con un nome e una versione tracciati nel cluster. Non è un generatore di YAML qualunque, perché gestisce il ciclo di vita della release, cioè installazione, aggiornamento, rollback e rimozione. In questa lezione impari l'anatomia di un chart, il rendering dei template e il modo in cui Helm registra lo stato delle release.

## Obiettivi

- Riconoscere la struttura di un chart e il ruolo di `Chart.yaml`, `values.yaml` e `templates/`.
- Scrivere template Go che usano `.Values`, `.Release` e `_helpers.tpl`.
- Collegare valori di default, file `-f` e override da riga di comando sapendo chi vince.
- Distinguere `helm template`, `helm install` e `helm upgrade` e dove finisce lo stato.
- Installare un chart da repository e da registry OCI con gli stessi comandi.

## Anatomia di un chart

Un chart è una cartella con nome e versione dichiarati in `Chart.yaml`. `helm create` genera uno scheletro completo, che è anche il modo più rapido per vedere le convenzioni correnti. Con Helm 4 lo scheletro include namespace helper, deployment, service, ingress, serviceaccount e i test in `templates/tests/`.

```bash
helm create webapp
tree -L 2 webapp
helm lint webapp
```

| Percorso | Ruolo |
| --- | --- |
| `Chart.yaml` | `apiVersion: v2`, `name`, `version`, `appVersion`, dipendenze |
| `values.yaml` | valori di default del chart |
| `templates/` | manifest YAML con espressioni Go `{{ }}` |
| `templates/_helpers.tpl` | definizioni riusabili: nomi, label, selector |
| `charts/` | dipendenze espanse in sottocartelle |
| `crds/` | CRD installate prima dei template e mai aggiornate da Helm |
| `values.schema.json` | JSON Schema che valida i valori in ingresso |

`apiVersion: v2` è l'API dei chart da Helm 3 in poi ed è quella usata anche da Helm 4. `version` è la versione del chart e cambia quando cambia il pacchetto; `appVersion` è la versione dell'applicazione contenuta e non conta per l'ordinamento delle release del chart. Sono due assi indipendenti: puoi correggere una label del chart senza toccare l'immagine dell'app, e viceversa.

## Template, valori e rendering

I template sono testo con espressioni tra doppie graffe. Il contesto di rendering espone `.Values` (i valori), `.Release` (nome, namespace, revisione, `IsInstall`), `.Chart` (metadati) e `.Capabilities` (versione Kubernetes e API disponibili). Le funzioni di `sprig` allargano il linguaggio: `toYaml`, `nindent`, `default`, `quote`, `trunc` sono quelle che scrivi ogni giorno.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "webapp.fullname" . }}
  labels:
    {{- include "webapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "webapp.selectorLabels" . | nindent 6 }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

`nindent` inserisce una riga vuota e poi indenta: serve per includere blocchi YAML dentro altri blocchi senza rompere la sintassi. Il `default .Chart.AppVersion` evita di duplicare la versione dell'immagine in due file. I template sono solo testo: `helm template` li stampa senza toccare il cluster, ed è il primo comando da usare quando un manifest esce malformato.

```bash
helm template demo webapp -f staging.yaml --show-only templates/deployment.yaml
helm template demo webapp --set replicaCount=3 | yq '.spec.replicas' -
```

I valori hanno una precedenza precisa: `values.yaml` del chart, poi i valori dei subchart, poi ogni `-f` nell'ordine dato, poi `--set` e `--set-string`, infine i valori calcolati o importati. `--reuse-values` in upgrade parte dai valori dell'ultima release invece che da quelli del chart: comodo, ma rende invisibili i default nuovi e per questo da usare con cautela.

## Release e ciclo di vita

Una release è un'istanza nominata di un chart in un namespace, con una revisione incrementale. Helm 3 e 4 non usano più Tiller: agiscono con le credenziali di chi lancia il comando e salvano lo stato in Secret (default) o ConfigMap nel namespace della release. Da qui `helm history`, `helm rollback` e `helm get manifest` leggono la verità, non dal repository.

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install webapp bitnami/nginx --namespace demo --create-namespace --wait
helm history webapp -n demo
helm rollback webapp 1 -n demo --wait
helm uninstall webapp -n demo
```

`--install` rende l'upgrade idempotente rispetto all'esistenza della release. `--wait` blocca fino a quando le risorse sono pronte, segnalando failure vere invece di lasciare un deployment a metà. Per la distribuzione su registry OCI il comando è analogo con `oci://` davanti al riferimento; la registrazione in `helm repo` non serve.

| Comando | Effetto sul cluster |
| --- | --- |
| `helm template` | nessuno, stampa i manifest |
| `helm lint` | nessuno, verifica struttura e valori |
| `helm install` | crea risorse e revisione 1 |
| `helm upgrade` | crea revisione N+1 con diff applicato |
| `helm rollback` | nuova revisione con il contenuto di una precedente |

## Errori comuni

- **Mettere la versione dell'immagine solo in `values.yaml`**: si disallinea da `appVersion` e nasconde l'aggiornamento reale dell'applicazione.
- **Usare `latest` come tag di default**: rende le release non riproducibili e `helm rollback` non torna alla stessa immagine.
- **Fare `kubectl apply` sulle stesse risorse gestite da Helm**: lo stato della release perde coerenza e il successivo upgrade sovrascrive le modifiche.
- **Dimenticare `--create-namespace`**: l'install su un namespace nuovo fallisce prima di creare qualsiasi cosa.
- **Contare su `--reuse-values` in produzione**: i default nuovi del chart non vengono applicati e i valori rimossi restano per sempre.

## In sintesi

Helm separa il pacchetto (chart versionato), la configurazione (values) e l'istanza installata (release revisionata). I template sono testo reso con i valori, quindi `helm template` è lo strumento diagnostico principale. Lo stato vive nel cluster e non nel repository, il che rende install e upgrade idempotenti con `--install` e il rollback immediato. Il passo successivo è progettare chart robusti con helper, schema e dipendenze.

## Fonti

- [Helm - Charts](https://helm.sh/docs/topics/charts/)
- [Helm - Chart Template Guide](https://helm.sh/docs/chart_template_guide/)
- [Helm - Using Helm](https://helm.sh/docs/intro/using_helm/)
- [Helm - Quickstart](https://helm.sh/docs/intro/quickstart/)
