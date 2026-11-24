Un rilascio non è la fine della pipeline: è il momento in cui ciò che hai costruito viene esposto agli utenti. Le decisioni che contano si prendono prima, quando scegli come versionare, come marcare un artefatto e come tornare indietro. Gli esercizi con soluzioni seguono una pipeline realistica: build, pubblicazione, staging, approvazione, deploy.

## Obiettivi

- Collegare la versione del progetto all'artefatto pubblicato senza ambiguità.
- Scrivere un workflow che scatti su un tag e generi una release.
- Usare le approvazioni di ambiente per bloccare un deploy in produzione.
- Progettare e simulare un rollback a un digest precedente.
- Verificare che l'artefatto rilasciato sia quello testato.

## Versionare e pubblicare

La fonte di verità della versione deve essere una sola. Se il `package.json` dice `1.4.2`, il tag dice `v1.4.2` e l'artefatto dice altro, prima o poi qualcuno rilascerà il pacchetto sbagliato. Due approcci sono accettabili: la versione sta nel progetto e il tag è verificato contro di essa, oppure il tag è la fonte e la pipeline inietta la versione. La discrepanza deve far fallire il workflow.

Il versioning semantico (`MAJOR.MINOR.PATCH`) è un contratto con chi usa il pacchetto. Il workflow di pubblicazione scatta su un tag e produce l'artefatto, un'attestazione e una release con allegati.

```yaml
name: Release
on:
  push:
    tags: ["v*.*.*"]

permissions:
  contents: write
  packages: write

jobs:
  pubblica:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm pack
      - name: Pubblica pacchetto
        run: npm publish --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Crea release
        uses: softprops/action-gh-release@v2
        with:
          files: "*.tgz"
```

La release allega l'archivio prodotto dalla build, non lo ricostruisce: l'utente scarica ciò che è stato testato.

## Ambienti e promozione

La promozione diventa una questione di ambiente: due job, con un ambiente protetto sul secondo. Staging può essere automatico; produzione richiede approvazione.

```yaml
jobs:
  staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: ./deploy.sh "$DIGEST"
        env:
          DIGEST: ${{ inputs.digest }}
          KUBE_TOKEN: ${{ secrets.KUBE_TOKEN }}

  produzione:
    needs: staging
    runs-on: ubuntu-latest
    environment:
      name: produzione
      url: https://example.com
    steps:
      - run: ./deploy.sh "$DIGEST"
        env:
          DIGEST: ${{ inputs.digest }}
          KUBE_TOKEN: ${{ secrets.KUBE_TOKEN }}
```

Lo stesso `KUBE_TOKEN` prende valore per ambiente: il workflow non contiene credenziali. Con una regola di approvazione il job attende un revisore; con un vincolo di branch, il deploy da altri rami viene rifiutato. Il digest arriva come output del job precedente, non digitato a mano.

## Rollback e verifica

Il rollback si prepara con tre domande: qual è l'identità della versione in esercizio, la precedente è ancora nel registro, le migrazioni lo permettono? Se la seconda risposta è "forse", il registro pulisce troppo o i tag vengono riassegnati.

Per i container il rollback è il redeploy del digest precedente:

```bash
# identifica la versione attuale prima di intervenire
kubectl get deployment web -o jsonpath='{.spec.template.spec.containers[0].image}'
# torna alla versione precedente già registrata
kubectl set image deployment/web web=registry.example.com/web@sha256:1f2c...
kubectl rollout status deployment/web --timeout=120s
```

Dopo il rollback la verifica non è "il pod è avviato", ma che la funzionalità critica risponda senza errori.

Per confermare che l'artefatto sia quello testato, confronta i digest:

```bash
docker pull registry.example.com/web:v1.4.2
docker inspect --format '{{index .RepoDigests 0}}' registry.example.com/web:v1.4.2
```

Il digest deve coincidere con quello in produzione e con l'attestazione.

## Errori comuni

- **Tag scollegato dalla versione del progetto**: due fonti divergono e la release dichiara una versione inesistente.
- **Immagine ricostruita al deploy**: il digest non coincide e il rollback non sa cosa ripristinare.
- **Approvazione dell'ambiente ma workflow modificabile da un branch feature**: serve il vincolo su branch o tag.
- **Rollback provato solo nei documenti**: fallisce proprio durante l'incidente.

## Esercizi

1. Spiega perché pubblicare l'archivio prodotto da `npm pack` è preferibile a far compilare il sorgente agli utenti.
2. Scrivi il frammento che attiva la release solo per tag `v` più tre numeri, con i permessi minimi per creare una release.
3. Il tag `v1.5.0` esiste ma il `package.json` dichiara `1.4.2`. Descrivi il controllo da aggiungere e il comportamento atteso.
4. Progetta il rollback dopo una migrazione che elimina una colonna: perché il redeploy del digest precedente può non bastare?
5. Spiega la differenza tra deploy automatico in staging e deploy in produzione con approvazione, in termini di chi preme il pulsante.
6. Verifica che l'immagine in produzione sia quella attesa: quali comandi usi e cosa confronti?

<details>
<summary>Soluzione</summary>

L'archivio contiene i byte verificati dai test, non richiede toolchain e si confronta per digest. Il sorgente richiederebbe versioni specifiche di ambiente e dipendenze, e ogni compilazione potrebbe differire: l'integrità ricadrebbe sull'utente.

</details>

<details>
<summary>Soluzione</summary>

```yaml
on:
  push:
    tags: ["v[0-9]+.[0-9]+.[0-9]+"]
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: softprops/action-gh-release@v2
```

Il filtro è un pattern glob. `contents: write` è l'unico permesso necessario: senza dichiarazione il token eredita il default del repository.

</details>

<details>
<summary>Soluzione</summary>

Aggiungi uno step che estrae la versione e la confronta con il ref, prima della pubblicazione:

```yaml
- name: Verifica coerenza versione
  run: |
    VERSIONE=$(node -p "require('./package.json').version")
    if [ "v$VERSIONE" != "${GITHUB_REF_NAME}" ]; then
      echo "Tag ${GITHUB_REF_NAME} non coerente con versione $VERSIONE"
      exit 1
    fi
```

Se fallisce, il job si interrompe prima di `npm publish`: nessun pacchetto ambiguo.

</details>

<details>
<summary>Soluzione</summary>

Il codice precedente si aspetta la colonna eliminata e fallisce contro lo schema nuovo. Servono migrazioni compatibili all'indietro: un rilascio che smette di usarla senza rimuoverla, poi uno che la elimina. Così il rollback funziona finché la colonna esiste.

</details>

<details>
<summary>Soluzione</summary>

Lo staging parte dopo la build: rischio limitato, feedback immediato. La produzione ha un gate umano se l'ambiente richiede una review: il revisore controlla metadati e artefatto. Nel deployment continuo il gate diventa canary e rollback automatico, ma serve sempre un modo per fermarsi.

</details>

<details>
<summary>Soluzione</summary>

```bash
kubectl get deployment web -o jsonpath='{.spec.template.spec.containers[0].image}'
docker pull registry.example.com/web:v1.4.2
docker inspect --format '{{index .RepoDigests 0}}' registry.example.com/web:v1.4.2
```

Confronti il digest nel cluster con quello del registro per il tag e con l'attestazione. Se coincidono, l'immagine è quella testata; altrimenti il tag è stato riassegnato. `crane digest` o `cosign verify` automatizzano il controllo.

</details>

## In sintesi

- La versione ha una sola fonte di verità e il workflow verifica la coerenza tra tag e progetto.
- La release allega l'artefatto della build, non lo ricostruisce.
- Gli ambienti trasferiscono segreti e regole di approvazione senza esporre credenziali nel workflow.
- Il rollback promuove un digest precedente ed è affidabile solo con migrazioni compatibili e registro conservato.

## Fonti

- GitHub, Release management per le action: https://docs.github.com/en/actions/how-tos/create-and-publish-actions/release-and-maintain-actions
- GitHub, Sintassi del workflow: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub, Ambienti di deployment: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub, Attestazioni degli artefatti: https://docs.github.com/en/actions/concepts/security/artifact-attestations
