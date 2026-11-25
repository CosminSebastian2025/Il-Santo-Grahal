Un chart che funziona sull'esempio generato da `helm create` diventa un problema quando lo installano dieci team con immagini diverse, namespace diversi e cluster con versioni diverse. Questa lezione riguarda proprio quel passaggio: librerie di template condivise, dependenze tra chart, hook per le migrazioni e controlli che impediscono a un valore sbagliato di arrivare in produzione. L'obiettivo è un chart che si comporti da contratto stabile verso chi lo installa.

## Obiettivi

- Estrarre nomi e label in `_helpers.tpl` e usarli in modo coerente in tutte le risorse.
- Aggiungere dipendenze con `condition` e `import-values`, distinguendo chart di applicazione e di libreria.
- Usare gli hook per ordinare migrazioni e job rispetto al Deployment.
- Validare i valori con `values.schema.json` e `helm lint`.
- Progettare upgrade sicuri con `--atomic`, `--wait` e limite di history.

## Helper, librerie e coerenza

Un helper è un template definito con `define` e invocato con `include`. La convenzione `nomeChart.fullname` risolve le collisioni fra chart, e `nomeChart.labels` centralizza le label che Kubernetes e gli strumenti di osservabilità si aspettano. Se una sola risorsa sfugge a questa regola, il selector del Service non corrisponde più ai pod e il debug costa più di quanto sia costato scrivere il template.

```gotemplate
{{- define "webapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "webapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "webapp.labels" -}}
helm.sh/chart: {{ include "webapp.chart" . }}
{{ include "webapp.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
```

| Elemento | File | Nota |
| --- | --- | --- |
| `fullname` | `_helpers.tpl` | tronca a 63 caratteri per i limiti Kubernetes |
| `selectorLabels` | `_helpers.tpl` | immutabile dopo l'installazione |
| `labels` | `_helpers.tpl` | può cambiare, non usarlo nei selector |
| `type: library` | `Chart.yaml` | espone solo helper, non installa nulla |

Un chart di libreria ha `type: library` e nessun manifest in `templates/`: si distribuisce via OCI o repository e si include come dipendenza. Serve per aziende con decine di chart, perché i nomi degli helper diventano l'API condivisa e una correzione alle label si propaga ovunque con un solo upgrade di versione del chart di libreria.

## Dipendenze, condizioni e valori importati

Le dipendenze si dichiarano in `Chart.yaml` e si materializzano in `charts/` con `helm dependency update`. `condition` collega l'attivazione di un subchart a un valore booleano del parent, così Redis e Postgres restano opzionali senza duplicare il chart. `import-values` permette invece a un subchart di esporre valori che il parent usa nei propri template.

```yaml
dependencies:
  - name: postgresql
    version: "^16.0.0"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
    alias: db
  - name: common
    version: "^2.0.0"
    repository: oci://registry-1.docker.io/bitnamicharts
```

```bash
helm dependency update webapp      # risolve e scarica in charts/
helm dependency build webapp       # usa Chart.lock senza risolvere
helm upgrade --install webapp . --set postgresql.enabled=false
```

`Chart.lock` fissa le versioni risolte: va committato, altrimenti due build nello stesso giorno possono produrre manifest diversi. L'`alias: db` evita di usare valori come `postgresql.auth.password` quando il chart si chiama `db` nel contratto del parent.

## Hook, validazione e upgrade sicuri

Gli hook sono risorse annotate con `helm.sh/hook` che Helm applica in momenti precisi del ciclo di vita e con una policy di cancellazione. Il caso classico è una migrazione di schema: `pre-install` e `pre-upgrade` con `hook-weight` negativo la fanno eseguire prima del rollout, mentre `hook-delete-policy: before-hook-creation` permette di ripetere il Job a ogni upgrade.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "webapp.fullname" . }}-migrate
  annotations:
    helm.sh/hook: pre-install,pre-upgrade
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          args: ["migrate", "--yes"]
```

`values.schema.json` valida i valori prima del rendering: tipi, enum e campi obbligatori. È l'unico modo per fermare un `replicaCount: "3"` come stringa che più avanti romperà un `range`. `helm lint --strict` tratta i warning come errori e conviene metterlo in CI assieme a `helm template` per ogni file di ambiente.

Per gli upgrade il comportamento predefinito è aggressivo: se un pod non parte, la release resta in stato `failed` con la vecchia revisione non ripristinata. `--atomic` fa rollback automatico in caso di errore, `--wait` aspetta che le risorse diventino pronte entro `--timeout`, `--cleanup-on-fail` rimuove le risorse appena create. `--history-max` limita quante revisioni restano nel namespace: ogni revisione è un Secret con l'intero manifest reso, e in cluster molto attivi la storia infinita pesa anche sull'etcd.

| Flag | Effetto | Quando usarlo |
| --- | --- | --- |
| `--atomic` | rollback se `--wait` fallisce | deploy automatici |
| `--wait` | attende readiness | sempre in pipeline |
| `--timeout 10m` | limite dell'attesa | migrazioni lente |
| `--cleanup-on-fail` | cancella risorse nuove | risorse opzionali |
| `--history-max 5` | pota le revisioni | cluster a molti deploy |

## Errori comuni

- **Cambiare le label usate nel selector**: il campo è immutabile e l'upgrade fallisce con un errore di patch sul Deployment.
- **Aggiungere un hook senza policy di cancellazione**: al secondo upgrade il Job esiste già e la release si blocca in `pre-upgrade`.
- **Non committare `Chart.lock`**: le versioni delle dipendenze cambiano senza che tu abbia toccato nulla.
- **Validare i valori solo a runtime**: senza schema errori banali come stringhe al posto di interi arrivano fino al cluster.
- **Lasciare `--history-max` infinito**: la storia delle release riempie gli oggetti del namespace senza beneficio.

## In sintesi

Un chart maturo separa le convenzioni (helper e chart di libreria), la composizione (dipendenze con condizioni) e i controlli (schema, lint, hook con policy). Gli upgrade si progettano, non si sperano: `--wait` e `--atomic` trasformano un errore in rollback invece che in un servizio a metà, e la history limitata mantiene il cluster leggero. Il passo successivo è mettere il tutto alla prova costruendo un chart da zero.

## Fonti

- [Helm - Chart Template Guide](https://helm.sh/docs/chart_template_guide/)
- [Helm - Library Charts](https://helm.sh/docs/topics/library_charts/)
- [Helm - Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
- [Helm - helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
