Una pipeline che compila e testa è utile, ma diventa un sistema di rilascio solo quando trasporta un risultato tra ambienti senza che nessuno lo ricostruisca. Il collo di bottiglia allora non è il codice ma gli artefatti, gli ambienti e i segreti, le tre cose che di solito vengono improvvisate. Questa lezione spiega come trattarle come oggetti versionati e con permessi espliciti, e come evitare che un deploy dipenda da una persona che ricorda dove si trova una password.

## Obiettivi

- Distinguere artefatto, cache e output temporaneo, e capire perché l'artefatto è immutabile.
- Modellare gli ambienti con regole di approvazione e protezioni minime.
- Trattare i segreti come input esterni, conoscendone i limiti.
- Progettare il rollback come parte della pipeline, non come incidente.

## Artefatti: identità e immutabilità

Un artefatto è il risultato stabile di una build: un pacchetto, un'immagine container, un archivio. Ha due proprietà che lo distinguono da tutto il resto: **un'identità univoca** e **l'immutabilità**.

L'identità è quasi sempre un digest crittografico del contenuto, per i container nella forma `sha256:...`. Il tag, come `v1.4.2` o `latest`, è un'etichetta comoda che può essere spostata: per questo i sistemi seri permettono il deploy per digest. L'immutabilità significa che chi scarica quell'identità riceve sempre gli stessi byte.

| Concetto | Vita | Dove vive | Può essere sovrascritto |
| --- | --- | --- | --- |
| Artefatto di build | Mesi o anni | Registro o storage artefatti | Mai |
| Cache della pipeline | Giorni o settimane | Storage della cache | Sì, ed è normale |
| File temporaneo del job | Minuti | Filesystem del runner | Sparisce a fine job |

Artefatto e cache non vanno confusi. La cache ottimizza i tempi ma non è affidabile: può essere persa e la pipeline deve restare corretta senza. Se l'artefatto finale dipende da una cache, non hai un artefatto ma una scommessa.

A ogni artefatto associa metadati: hash del commit, ramo, numero di run, digest. Quando in produzione compare un bug, la prima domanda è da quale commit è nato quel binario, e la risposta deve stare nella release.

## Ambienti e promozione

Un ambiente è un'istanza del sistema con un livello di fiducia diverso. Il modello minimo ne prevede tre: sviluppo o preview, staging, produzione. Tre regole lo rendono utile.

Prima: l'ambiente dichiara le proprie regole di accesso e approvazione, non le scopre al deploy. Seconda: la promozione sposta l'identità dell'artefatto, non ricostruisce nulla. Terza: ogni deployment è registrato con chi, quando e con quale artefatto; senza registro non esiste rollback attendibile.

In GitHub Actions un ambiente dichiarato nel workflow può avere review obbligatorie, tempo di attesa e lista di revisori:

```yaml
jobs:
  deploy-produzione:
    runs-on: ubuntu-latest
    environment:
      name: produzione
      url: https://example.com
    needs: deploy-staging
    steps:
      - run: ./scripts/deploy.sh
        env:
          API_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          IMAGE_DIGEST: ${{ needs.deploy-staging.outputs.digest }}
```

Il blocco `environment` non è decorativo: una regola di protezione configurata sull'ambiente blocca il job finché un revisore non approva, e i segreti omonimi possono avere valori diversi per ambiente. Un `DEPLOY_TOKEN` di staging e uno di produzione con lo stesso nome lasciano il workflow identico: cambia solo il contesto.

Un ambiente costruito a mano con dati di produzione reali e senza protezioni è un rischio: serve a provare le migrazioni ma espone dati personali e accessi. Se deve esistere, usa dati anonimizzati e una scadenza.

## Segreti e rollback

Un segreto è una credenziale: token, chiave privata, password. La regola non è "non stamparlo nei log" ma "non deve esistere nel codice, in nessuna forma". Uno script che legge un `.env` versionato è il primo passo verso una credenziale pubblica: i file `.env` appartengono al `.gitignore`.

Tre abitudini riducono quasi tutti gli incidenti. Permessi minimi, un token per integrazione con lo scope strettamente necessario. Rotazione programmata, e immediata al primo sospetto. Mascheramento consapevole: i sistemi di CI oscurano i valori nei log ma non proteggono da uno script che li trasforma o li scrive su file. Un segreto è un input che l'ambiente riceve per un tempo limitato.

Il rollback chiude il ciclo. Un rilascio è completo solo quando esiste una procedura per tornare alla versione precedente. Le opzioni si scelgono prima dell'incidente: redeploy del digest precedente, blu-verde con traffico commutabile, canary con percentuali. Le migrazioni del database sono la parte delicata: se il nuovo codice ha rinominato una colonna, tornare indietro non basta a meno che le migrazioni siano compatibili all'indietro (espandi e contrai, in due rilasci). Progettare questa compatibilità costa meno che scrivere runbook sotto pressione.

## Errori comuni

- **Usare `latest` nei deploy**: non sai cosa rilasci e non torni indietro con precisione.
- **Segreti nelle variabili di ambiente versionate del repository**: sono visibili senza audit.
- **Staging senza protezioni che punta al database di produzione**: un test distruttivo diventa un incidente.
- **Rollback documentato ma mai provato**: le procedure non testate falliscono quando servono.
- **Cache e artefatti mescolati**: se la build necessaria sta solo nella cache, prima o poi sparisce.

## In sintesi

- L'artefatto ha digest univoco e immutabile; il tag è un'etichetta, la cache un'ottimizzazione.
- Gli ambienti definiscono accesso, approvazione e segreti; la promozione sposta l'artefatto.
- I segreti sono input esterni con permessi minimi e rotazione; il mascheramento non basta.
- Il rollback va scelto e provato prima dell'incidente; la compatibilità delle migrazioni è parte del progetto.

## Fonti

- GitHub, Ambienti di deployment: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub, Segreti in GitHub Actions: https://docs.github.com/en/actions/concepts/security/secrets
- GitHub, Storia degli deployment: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/view-deployment-history
- GitHub, Artefatti di workflow: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
