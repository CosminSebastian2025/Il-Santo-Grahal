Un file dentro `.github/workflows/` può sembrare solo configurazione, ma è un programma che gira su un'altra macchina, con i permessi del repository e spesso con i segreti del progetto. Capire la struttura in workflow, job e step è quindi il primo passo per scrivere automazioni prevedibili e per non concedere più di quanto serve. In questa lezione partiamo dalla sintassi minima, distinguiamo ciò che condivide stato e ciò che non lo condivide, e chiudiamo con il modello di esecuzione dei runner, che spiega perché due job non vedono lo stesso filesystem.

## Obiettivi

- Riconoscere la struttura di un workflow: trigger, job, step e runner.
- Sapere cosa condividono i job e cosa no, e come collegarli con dipendenze e output.
- Scrivere espressioni e condizioni che evitano job inutili.
- Capire come vengono eseguiti i runner e quando conviene usarne uno self-hosted.
- Leggere il blocco `permissions` e ciò che il token del workflow può fare.

## Dalla sintassi al modello di esecuzione

Un workflow è un file YAML in `.github/workflows/` con tre parti obbligatorie: un nome, uno o più trigger in `on`, e uno o più job in `jobs`. Gli step stanno dentro un job e girano in sequenza sullo stesso runner. I job, di default, girano in parallelo su runner distinti.

```yaml
name: Verifica
on:
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm run lint
```

Due proprietà di questa struttura meritano attenzione. La prima: ogni job parte da un runner pulito, quindi serve sempre un checkout esplicito. La seconda: gli step condividono il filesystem del runner, quindi il filesystem è più che altro un canale implicito tra step dello stesso job, e non un canale tra job.

Un job è un'unità di *isolamento* e di *fatturazione*. Se metti tutto in un job non spendi tempo a orchestrare, ma paghi in coerenza: un test di integrazione lento allunga anche il lint. Se separi troppo, moltiplichi i minuti di macchina e la complessità di orchestrazione.

## Collegare job, condividere dati

La dipendenza tra job si dichiara con `needs`. Senza di essa, il job parte appena il workflow è attivo, indipendentemente dall'esito degli altri. Con `needs: build`, il job parte solo se `build` è riuscito; se `build` fallisce o viene annullato, i dipendenti vengono saltati.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      versione: ${{ steps.meta.outputs.versione }}
    steps:
      - id: meta
        run: echo "versione=1.4.2" >> "$GITHUB_OUTPUT"

  pubblica:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Pubblico ${{ needs.build.outputs.versione }}"
```

Tre meccanismi devono restare distinti nella testa:

| Meccanismo | Ambito | Vita |
| --- | --- | --- |
| Variabile d'ambiente | Step o job | Finché gira il job |
| Output di step | Job corrente | Passa tramite `$GITHUB_OUTPUT` |
| Output di job | Job dipendenti | Dichiarato in `outputs` del job |
| File (`$GITHUB_WORKSPACE`) | Solo quel job | Cancellato alla fine |

Un file creato da un job non è visibile a un altro job: per passare un artefatto tra job servono gli strumenti dedicati (upload/download di artefatti) oppure la cache, che però non è pensata per questo. Confondere i due ambiti è la causa più frequente di workflow "funziona in locale ma non in CI".

Le espressioni si valutano con `${{ }}` e permettono condizioni motivate: `if: github.event_name == 'push'` oppure `if: contains(github.event.pull_request.labels.*.name, 'deploy')`. Le condizioni vanno usate per saltare lavoro inutile, non per nascondere un job che fallisce.

## Runner, permessi e contesto

I runner GitHub-hosted partono da immagini standard (Ubuntu, Windows, macOS) e sono effimeri: ogni job inizia da una macchina nuova, con una dotazione di strumenti aggiornata a intervalli regolari. Questo garantisce riproducibilità rispetto allo stato del disco, ma non rispetto alle versioni degli strumenti: finché non fissi esplicitamente le versioni, un aggiornamento dell'immagine può cambiare l'esito. Un runner self-hosted è utile quando servono hardware specifico, accesso a una rete interna o costi prevedibili, ma introduce responsabilità di manutenzione e un rischio di sicurezza: un workflow di fork su un runner self-hosted può eseguire codice non fidato dentro la tua rete, e va evitato o isolato.

Il blocco `permissions` merita una lezione a sé, ma il principio si vede già qui. Il token `GITHUB_TOKEN` esiste in ogni workflow e il suo ambito di default dipende dalle impostazioni del repository o dell'organizzazione, che possono essere permissive. Dichiarare `permissions: contents: read` in cima al workflow è la difesa migliore e più semplice: senza, un job che legge il codice potrebbe anche scrivere su repository, pacchetti o issue.

Il contesto disponibile è ampio: `github.repository`, `github.ref`, `github.sha`, `github.event_name`, `runner.os`. Saperli leggere evita molti hard-code, come scrivere `main` quando ci si riferisce al branch predefinito; `github.event.repository.default_branch` è più robusto.

## Errori comuni

- **Dimenticare `checkout`**: il job parte e fallisce su un file mancante. Ogni job ha bisogno del proprio checkout.
- **Aspettarsi che il filesystem persista tra job**: i job girano su macchine diverse. Usa artefatti o output dichiarati.
- **Scrivere `if` con `needs` assente**: un job condizionato a `main` che dipende da nulla parte comunque, magari con `always()` implicito. Verifica l'ordine con `needs`.
- **Lasciare i permessi predefiniti**: un token troppo ampio è un rischio reale se uno step esegue codice di terze parti.
- **Fissare `ubuntu-latest` e pretendere stabilità**: l'immagine cambia. Fissa la versione dell'OS quando la riproducibilità conta.

## In sintesi

- Workflow = trigger + job; job = step sequenziali su un runner effimero; i job di default sono paralleli.
- `needs` crea dipendenze, `outputs` e `$GITHUB_OUTPUT` trasportano valori, gli artefatti trasportano file.
- I runner sono macchine nuove per ogni job: nessuno stato ereditato, nessun filesystem condiviso.
- `permissions` esplicito e versioni degli strumenti fissate rendono il workflow prevedibile e più sicuro.

## Fonti

- GitHub, Sintassi del workflow: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub, Runner di GitHub Actions: https://docs.github.com/en/actions/concepts/runners
- GitHub, Passare informazioni tra job: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs
- GitHub, Controllo dei permessi del token: https://docs.github.com/en/actions/concepts/security/github_token
