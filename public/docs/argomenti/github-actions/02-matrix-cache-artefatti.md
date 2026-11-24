Quando un workflow funziona per una versione di Node, il passo successivo è farlo funzionare per tre sistemi operativi e due versioni senza copiare lo stesso YAML quattro volte. Le strategie `matrix`, la cache delle dipendenze e gli artefatti sono i tre strumenti con cui GitHub Actions risponde a questa esigenza: rispettivamente per moltiplicare l'esecuzione, per ridurre i tempi e per trasferire risultati. Usati male, producono però pipeline lente, cache che non colpiscono mai e file che si perdono. Questa lezione copre il funzionamento reale, compresi i limiti.

## Obiettivi

- Scrivere una matrix utile, sapendo quanti job genera e come limitarli.
- Distinguere la cache delle dipendenze dall'artefatto di build, con policy di conservazione diverse.
- Scrivere chiavi di cache che colpiscono davvero e capire quando invalidarle.
- Condividere file tra job con upload/download senza esporre dati sensibili.

## Strategy matrix

Una matrix dichiara variabili e il workflow genera un job per ogni combinazione. Due assi di due valori producono quattro job; tre assi con tre valori ne producono nove, più i possibili `include` ed `exclude`.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      max-parallel: 3
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: ["20", "22"]
        exclude:
          - os: macos-latest
            node: "20"
        include:
          - os: ubuntu-latest
            node: "22"
            coverage: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

Tre comportamenti da conoscere. `fail-fast: true` è il default: al primo job fallito gli altri vengono annullati, il che è utile per risparmiare minuti ma nasconde gli altri fallimenti indipendenti. In una matrix di compatibilità conviene `false`, per vedere in un solo giro tutti i sistemi che si rompono. `max-parallel` limita i job simultanei, utile con servizi esterni rate-limited. E `include` non aggiunge solo una riga: se contiene una combinazione già esistente, la arricchisce con i valori in più; se contiene valori nuovi, genera job aggiuntivi. Questa differenza spiega perché una matrix cresciuta per aggiunte successive genera più job del previsto.

Regola pratica sulla dimensione: una matrix di dodici combinazioni implica dodici runner e dodici checkout. Se la build non cambia per sistema operativo, valuta un job che testa su tutti e uno che compila solo dove serve. La matrix ha senso quando l'esito *può* divergere per valore.

## Cache

La cache salva directory tra esecuzioni, usando una chiave. Il primo run non trova nulla (`cache miss`), esegue il download delle dipendenze e a fine job salva la cache; i run successivi con la stessa chiave la ripristinano.

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

La regola della chiave: identifica *esattamente* il contenuto della cache. `hashFiles` sul lock file è la scelta canonica, perché il lock cambia solo quando cambiano le dipendenze. Le `restore-keys` sono il ripiego: se la chiave esatta non c'è, si prova con il prefisso e si ottiene una cache parziale, che riduce il download di ciò che non è cambiato. Senza prefissi, una modifica al lock produce sempre un miss totale.

La cache non è affidabile e non è uno storage di applicazione: può essere evicta per limite di spazio (la piattaforma ha un limite complessivo per repository), non è condivisa tra branch in modo arbitrario (il ripristino resta circoscritto al branch e alla base) e su una cache hit il passo di download non esegue nulla. Una pipeline corretta senza cache deve restare corretta.

| Aspetto | Cache | Artefatto |
| --- | --- | --- |
| Scopo | Ridurre i tempi | Trasferire risultati |
| Chiave | Obbligatoria, con hash del contenuto | Nome e versione, gestiti da te |
| Durata | Limitata, eviction possibile | Dipende dalla policy di conservazione impostata |
| Fonte attendibile | No | Sì, se prodotto dal workflow giusto |

## Artefatti

Un artefatto trasferisce file da un job all'altro, o li rende scaricabili. In GitHub Actions tipicamente si usa `actions/upload-artifact` in un job e `actions/download-artifact` in un altro. Il caso classico: build in un job, test di integrazione in un altro.

```yaml
upload:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci && npm run build
    - uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/
        retention-days: 7

consuma:
  needs: upload
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
```

Tre avvertenze. Gli artefatti sono pubblici rispetto a chi ha accesso ai log e alla repository, quindi non contengono segreti o file `.env`. La conservazione è limitata nel tempo e va allineata alla vita del progetto: un artefatto che dovrebbe essere un rilascio appartiene a un registro, non alla pipeline. Infine, un artefatto caricato da un workflow `pull_request` è reperibile da chi lavora su quel workflow: non è un canale fidato per autenticare un deploy. Per la provenienza esistono strumenti dedicati, come le attestazioni degli artefatti, che firmano il legame tra digest e build.

## Errori comuni

- **Chiave di cache basata sulla data o su un numero casuale**: non colpisce mai e la cache diventa solo un costo.
- **Cache senza versionamento della directory**: una dipendenza aggiornata trova una cache stale della versione precedente e il test passa per errore. Include il lock file nell'hash, sempre.
- **Artefatto con segreti o file `.env`**: il file è scaricabile da chi ha accesso alla run. Cura la lista di ciò che carichi.
- **Matrix troppo ampia**: dodici combinazioni per un test che non cambia per OS. Riduci prima di ottimizzare.
- **Trattare la cache come persistenza**: la build che funziona solo con la cache in realtà non funziona.

## In sintesi

- La matrix moltiplica i job per combinazione: controlla `exclude`, `include`, `fail-fast` e `max-parallel`.
- La cache è un'ottimizzazione con chiave derivata dal contenuto (di solito l'hash del lock) e un prefisso per il ripristino parziale.
- Gli artefatti trasferiscono file tra job e li rendono scaricabili, ma non sono un registro né un canale fidato.
- Non mettere segreti in cache o artefatti: né l'una né gli altri sono progettati per custodirli.

## Fonti

- GitHub, Varianti di job con una matrix: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub, Dipendency caching: https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching
- GitHub, Artefatti di workflow: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- GitHub, Attestazioni degli artefatti: https://docs.github.com/en/actions/concepts/security/artifact-attestations
