Una pipeline di integrazione continua non serve a "lanciare i test": serve a rendere ripetibile ciò che altrimenti una persona farebbe in modo diverso ogni venerdì pomeriggio. Appena un progetto supera due o tre sviluppatori, la domanda non è più se automatizzare ma che cosa blindare. Questa lezione costruisce il vocabolario e i principi: senza una struttura chiara, il primo workflow scritto in fretta diventa un insieme di comandi copiati che nessuno osa toccare.

## Obiettivi

- Distinguere integrazione continua, delivery continua e deployment continuo.
- Progettare le fasi di una pipeline: verifica, build, artefatto, pubblicazione.
- Scegliere il trigger corretto per ogni evento.
- Comprendere perché feedback rapido e ripetibilità valgono più della quantità di controlli.
- Riconoscere gli antipattern tipici di una pipeline fragile.

## I tre livelli di automazione

I termini vengono usati come sinonimi, ma descrivono responsabilità diverse. La differenza non è tecnica: è il punto in cui interviene una decisione umana.

| Pratica | Cosa automatizza | Chi decide il rilascio | Errore tipico |
| --- | --- | --- | --- |
| Integrazione continua (CI) | Verifica e build a ogni integrazione nel ramo condiviso | Non è previsto un rilascio | Test lenti o che ignorano le modifiche |
| Delivery continua | Tutto fino a un artefatto pronto e verificato | Una persona approva il deploy | Artefatti ricostruiti al momento del deploy |
| Deployment continuo | Anche la messa in esercizio | Nessuno, se i controlli passano | Mancanza di osservabilità e di rollback |

Nell'integrazione continua la regola vera è che il ramo principale resta sempre verde. Un merge che rompe la build va corretto o annullato subito: una base rossa inquina tutti i branch aperti e rende inutile il segnale. La delivery continua si ferma appena prima del rilascio, con un pulsante che qualcuno preme. Il deployment continuo sposta quel pulsante nella pipeline, cosa ragionevole solo quando esiste un modo affidabile di osservare l'effetto del cambio e di tornare indietro.

## Le fasi di una pipeline

Una pipeline si legge dall'inizio alla fine come una serie di promesse: ogni fase ha un contratto chiaro su cosa entra, cosa esce e quando può essere saltata.

1. **Verifica statica**: lint e controllo dei tipi, veloce e per prima, perché interrompe presto chi ha commesso l'errore.
2. **Test**: unitari, poi di integrazione; i primi devono durare secondi.
3. **Build**: la build deve essere prodotto una sola volta per commit.
4. **Pubblicazione dell'artefatto**: push in un registro con identificativo legato al commit.
5. **Pubblicazione nel sistema di destinazione**: deploy in staging o produzione.

La fase più sottovalutata è la terza. Il principio che riduce molti problemi è: *costruisci una volta, promuovi molte volte*. Se lo staging prova la build 417 e la produzione ricostruisce dallo stesso commit, hai perso la certezza che sia lo stesso binario.

```yaml
name: Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verifica:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build:
    needs: verifica
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

Il frammento illustra la struttura, non un sistema completo: manca l'artefatto, ciò che trasforma una serie di job in una vera pipeline.

## Trigger e feedback

Il trigger definisce quando la pipeline ha senso, non solo come parte.

- **`push` sul ramo principale** verifica che il merge non abbia rotto nulla; ogni push genera una esecuzione.
- **`pull_request`** esegue la pipeline sull'unione virtuale tra branch e base, cioè su ciò che diventerebbe il ramo principale. È il controllo che impedisce di mergiare codice rotto.
- **`pull_request_target`** gira nel contesto del repository di destinazione con i segreti: è pericoloso con i fork.
- **`schedule`** serve per i controlli indipendenti dai commit, come l'audit delle dipendenze.
- **`workflow_dispatch`** serve quando un umano deve decidere di partire, ad esempio per un deploy.

Due regole rendono utile il feedback. La prima è la durata: una pipeline da cinquanta minuti per un test unitario viene ignorata. La seconda è la specificità: il trigger deve escludere ciò che non conta, senza però saltare controlli rilevanti, che è peggio di eseguire troppo.

## Ripetibilità

Una pipeline affidabile produce lo stesso esito sullo stesso commit. Le cause più comuni di non determinismo sono dipendenze senza versione bloccata, differenze tra macchina dello sviluppatore e runner, test che dipendono dall'ordine o dall'ora.

Il file di lock (`package-lock.json`, `poetry.lock`, `go.sum`) va in repository e usato in modalità deterministica (`npm ci`, non `npm install`). Versioni del runtime e variabili d'ambiente vanno fissate esplicitamente nel workflow. I test devono girare in qualsiasi ordine; quelli che scrivono su un database condiviso sono un problema di progettazione.

Esiste poi il principio opposto: non replicare la produzione sulla pipeline. Se un test richiede un cluster completo per girare, forse stai testando l'infrastruttura e non l'applicazione.

## Errori comuni

- **Ricostruire l'artefatto a ogni ambiente**: si perde il legame tra ciò che è testato e ciò che viene rilasciato.
- **Lasciare il ramo principale rosso**: il team impara a ignorare il segnale. Correggi o annulla il merge subito.
- **Pipeline lentissime per test veloci**: sposta lint e unitari per primi, esegui i lenti in parallelo.
- **Dipendere da stato manuale** (staging acceso a mano, variabile impostata nel pannello): documenta e versiona la configurazione.
- **Ammettere test non deterministici**: chi rilancia fino al verde non ha più un segnale.

## In sintesi

- CI verifica, delivery produce un artefatto approvato, deployment lo mette in esercizio: cambia il punto della decisione umana.
- Costruisci una volta, promuovi molte volte: l'identificativo dell'artefatto resta invariato.
- Il trigger è una scelta di prodotto: `pull_request` per proteggere il ramo, `workflow_dispatch` per i deploy.
- Ripetibilità (lock file, versioni fissate, test indipendenti) vale più della quantità di controlli.

## Fonti

- GitHub, Integrazione continua con GitHub Actions: https://docs.github.com/en/actions/get-started/continuous-integration
- GitHub, Eventi che attivano un workflow: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- SLSA, specifica v1.0: https://slsa.dev/spec/v1.0/
