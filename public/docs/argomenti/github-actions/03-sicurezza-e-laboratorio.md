Un workflow è codice che gira con i permessi del repository: questa doppia natura lo rende un bersaglio. Un'azione di terze parti può cambiare sotto lo stesso tag, un titolo di pull request può contenere comandi, un token troppo ampio può pubblicare pacchetti o modificare il codice. La sicurezza di una pipeline è ciò che rende credibile il risultato. La lezione copre permessi minimi, pinning, injection, eventi pericolosi e OIDC, con un laboratorio.

## Obiettivi

- Dichiarare permessi minimi e limitare i trigger pericolosi.
- Collegare una action a un commit invece che a un tag mobile.
- Riconoscere e neutralizzare le injection da contesti non fidati.
- Delegare l'autenticazione al cloud con OIDC, senza credenziali statiche.
- Riprodurre un audit di sicurezza su un workflow reale.

## Permessi e trigger

Il token `GITHUB_TOKEN` accompagna ogni job. Se il workflow non dichiara `permissions`, eredita il default del repository o dell'organizzazione, che può essere ampio. La contromisura è una riga in cima, raccomandata da GitHub:

```yaml
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

I permessi si restringono anche per job: una release richiede `contents: write` solo per creare la release. Parti da `contents: read` e aggiungi in modo incrementale.

Il trigger introduce un rischio parallelo. `pull_request` da un fork ha token di sola lettura e nessun segreto. `pull_request_target` gira nella base con segreti e token di scrittura, e serve a operazioni come etichettare PR esterne. Se lì esegui codice del fork, esegui codice non fidato con le tue credenziali: è tra le vulnerabilità più sfruttate.

## Pinning e azioni di terze parti

`uses: some/action@v1` punta a un tag mobile, che il maintainer può spostare: il codice che gira oggi non è quello revisionato ieri. Il pinning immutabile usa un commit SHA completo:

```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
- uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
```

Lo SHA è immutabile: se il maintainer cambia il codice, tu resti sul tuo. Il commento con la versione aiuta; Dependabot automatizza gli aggiornamenti, che vanno revisionati.

## Injection e autenticazione senza segreti

Le espressioni come `${{ github.event.pull_request.title }}` vengono sostituite nello script prima dell'esecuzione: un titolo con backtick o `$(...)` diventa parte del comando. La difesa è passare i dati non fidati come variabili d'ambiente:

```yaml
- name: Commento PR
  env:
    TITOLO: ${{ github.event.pull_request.title }}
  run: printf '%s\n' "$TITOLO"
```

Vale anche per nomi di branch, messaggi di commit e input di `workflow_dispatch`.

Una chiave cloud statica nei segreti è una credenziale a lunga vita. OIDC ottiene un token breve in cambio di un'identità verificata dal provider, e richiede `id-token: write`:

```yaml
permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: produzione
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@a03048d87541d1d9fcf2ecf528a4a65ba9bd7838 # v5.0.0
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-web
          aws-region: eu-west-1
      - run: ./scripts/deploy.sh
```

Il ruolo cloud si fida solo del repository, branch e ambiente indicati: un fork non può assumerlo. Il rischio residuo è che ogni workflow di quel branch ottenga lo stesso token: per questo il vincolo su branch e ambiente fa parte del progetto.

## Errori comuni

- **`pull_request_target` con checkout e test del fork**: espone i segreti a codice arbitrario. Usa `pull_request`.
- **Pin al tag mobile di una action di terze parti**: il codice può cambiare senza che il workflow lo sappia.
- **Espressioni non fidate dentro `run`**: passano per `env`, mai interpolate.
- **Permessi predefiniti con codice di terze parti**: un token ampio è un bersaglio.
- **Credenziali cloud statiche**: senza OIDC rotazione e revoca diventano compiti dimenticati.

## Esercizi

1. Aggiungi a un workflow "test" i permessi minimi e spiega perché `contents: write` sarebbe un errore.
2. Converti `uses: some/action@v1` in un pin immutabile, descrivendo la procedura di aggiornamento.
3. Individua l'injection in `run: echo "${{ github.event.pull_request.body }}"` e riscrivilo.
4. Spiega perché `pull_request_target` è pericoloso con i fork e quando resta utile.
5. Scrivi i permessi per un job di deploy con OIDC, indicando cosa abilita ognuno.
6. Definisci una checklist di cinque controlli per l'audit di un workflow.

<details>
<summary>Soluzione</summary>

```yaml
permissions:
  contents: read
```

`contents: write` permetterebbe di modificare codice tag e release, e diventa un bersaglio con codice di terze parti. Il job di test legge il codice e scrive solo nei log: `read` basta.

</details>

<details>
<summary>Soluzione</summary>

```bash
git clone --depth 1 --branch v1 https://github.com/some/action /tmp/action
git -C /tmp/action rev-parse HEAD
```

L'output è lo SHA da usare come `some/action@<sha> # v1.x.y`. Per aggiornare ripeti la procedura e fai revisionare il diff: se il tag viene spostato, il workflow resta sullo SHA approvato.

</details>

<details>
<summary>Soluzione</summary>

```yaml
- name: Mostra corpo PR
  env:
    CORPO: ${{ github.event.pull_request.body }}
  run: printf '%s\n' "$CORPO"
```

La sostituzione di `${{ }}` avviene prima dell'esecuzione: un corpo con backtick diventerebbe parte del comando. Con `env` il testo è un dato, e `printf` con quoting evita anche i caratteri speciali.

</details>

<details>
<summary>Soluzione</summary>

Il workflow gira nella base con segreti e token di scrittura: un checkout dal fork esegue codice dell'attaccante con quelle credenziali. Resta utile solo per etichettare o commentare, mai per eseguire test.

</details>

<details>
<summary>Soluzione</summary>

```yaml
permissions:
  contents: read
  id-token: write
```

`contents: read` serve al checkout, `id-token: write` a richiedere il token OIDC. Il vincolo di fiducia si imposta sul lato cloud per repository, branch e ambiente.

</details>

<details>
<summary>Soluzione</summary>

1. Il workflow dichiara `permissions` e sono minimi?
2. Le action di terze parti sono pin a SHA?
3. Ci sono `pull_request_target` che eseguono codice del fork o `run` con espressioni non fidate?
4. I segreti sono esposti ai soli job che ne hanno bisogno e il deploy è protetto?
5. Le credenziali cloud sono OIDC, con rotazione e registro degli accessi?

</details>

## In sintesi

- `permissions: contents: read` come default, con aumenti motivati per job.
- Pin delle action a SHA completo, con aggiornamenti revisionati.
- Espressioni non fidate solo tramite `env`, mai interpolate in `run`.
- `pull_request_target` non esegue codice di fork; OIDC sostituisce le credenziali statiche.

## Fonti

- GitHub, Security hardening for GitHub Actions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- GitHub, Utilizzo sicuro di GitHub Actions: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub, OpenID Connect e credenziali cloud: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers
- GitHub, Injection di script: https://docs.github.com/en/actions/concepts/security/script-injections
