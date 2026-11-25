Un file Bicep che crea due risorse è una prova; un repository Bicep che gestisce più ambienti ha bisogno di moduli, configuration set, parametri separati per ambiente, un registry per i moduli condivisi e una pipeline che verifica il template prima di toccare Azure. In questa lezione vedi come organizzare il codice, come evitare di ripetere i parametri, come usare l'estensione Bicep per pipeline e come tenere sotto controllo i segreti e il deployment history.

## Obiettivi

- Strutturare moduli Bicep e pubblicarli in un registry privato.
- Usare gli ambienti azd e i file `.bicepparam` con `readEnvironmentVariable`.
- Aggiungere la linter integration e `what-if` in una pipeline.
- Gestire segreti con Key Vault e identità gestite, non con parametri in chiaro.
- Ridurre il deployment history e valutare `what-if` con `--result-format`.

## Moduli e registry

Un modulo Bicep ha solo parametri e output: nessuno stato, nessun provider. La sua interfaccia è il contratto; cambiarla significa una nuova versione. I moduli condivisi tra repository si pubblicano in un Azure Container Registry dedicato con alias Bicep.

```bash
az bicep publish --file modules/storage.bicep \
  --target br:acrbicep.azurecr.io/bicep/modules/storage:v1.0.0

az bicep restore --file main.bicep
```

Il file `bicepconfig.json` nella radice fissa l'alias e le regole della linter: senza alias `br/` non è risolto e ogni modulo deve usare l'URL completo.

```json
{
  "moduleAliases": {
    "br": {
      "acrbicep": { "registry": "acrbicep.azurecr.io", "modulePath": "bicep/modules" }
    }
  },
  "analyzers": { "core": { "enabled": true, "rules": { "no-hardcoded-location": { "level": "error" }, "use-recent-api-versions": { "level": "warning" }, "no-unused-params": { "level": "warning" } } } }
}
```

```bicep
module storage 'br/acrbicep:storage:v1.0.0' = {
  name: 'storage-${env}'
  params: {
    nome: 'st${prefix}${env}'
    location: location
    sku: env == 'prod' ? 'Standard_GRS' : 'Standard_LRS'
  }
}
```

| Pratica | Motivo | Controllo |
| --- | --- | --- |
| versioni semver nel registry | rollback e diff leggibili | `bicep restore` blocca versioni assenti |
| una API version per modulo | proprietà coerenti | linter `use-recent-api-versions` |
| `output` solo necessari | meno accoppiamento tra moduli | review |
| `bicepconfig.json` condiviso | regole uguali su tutte le macchine | file in repository |

## Parametri, ambienti e azd

I file `.bicepparam` sostituiscono il parametro JSON e possono calcolare valori da strutture Bicep. `readEnvironmentVariable` permette di leggere variabili della pipeline senza scriverle nel repository; gli ambienti `azd` gestiscono la stessa variabile per ogni ambiente con un file di stato locale.

```bicep
// main.bicepparam
using './main.bicep'

param env = readEnvironmentVariable('APP_ENV', 'dev')
param prefix = 'guida'
param adminPassword = readEnvironmentVariable('ADMIN_PASSWORD', '')
```

```bash
azd env new dev
azd env set APP_ENV dev
azd env set ADMIN_PASSWORD "$(openssl rand -base64 24)"
azd provision --preview
azd provision
```

| Meccanismo | Dove vive il valore | Uso |
| --- | --- | --- |
| `param` con default | nel file `.bicep` | valore sicuro per tutti |
| file `.bicepparam` | nel repository | configurazione non segreta |
| variabile d'ambiente | nella pipeline o shell | valori per run |
| `azd env` | `.azure/<env>/.env` locale | ambienti per sviluppatore |
| Key Vault | in Azure | segreti veri |

Per i segreti la strada è diversa: non passare la password a Bicep, ma creare la risorsa con un riferimento a Key Vault, oppure usare identità gestita e `Microsoft.KeyVault/vaults/secrets`. Un `param` `@secure()` è protetto nei log ma resta nel deployment history come valore letto.

## Pipeline: linter, preview e deploy

L'estensione Bicep per Azure Pipelines (`AzureResourceManagerTemplateDeploymentV3`) supporta validazione, `what-if` e deployment con conferma. In GitHub Actions si usa `azure/arm-deploy` con `deploymentMode` e `parameters`. In entrambi i casi il pattern è: build, lint, `what-if`, approvazione, deploy.

```yaml
# azure-pipelines.yml (estratto)
pool:
  vmImage: ubuntu-latest
steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'sc-produzione'
      scriptType: bash
      inlineScript: |
        set -euo pipefail
        az bicep build --file main.bicep --stdout > /dev/null
        az deployment group validate -g rg-app-dev -f main.bicep -p main.bicepparam
  - task: AzureResourceManagerTemplateDeployment@3
    inputs:
      deploymentScope: Resource Group
      resourceGroupName: rg-app-dev
      location: westeurope
      templateLocation: Linked artifact
      csmFile: main.bicep
      csmParametersFile: main.bicepparam
      deploymentMode: Incremental
      deploymentOutputs: deployOutputs
      action: Create or update resource group
```

| Modalità deploy | Comportamento | Rischio |
| --- | --- | --- |
| Incremental | crea/aggiorna, non cancella | risorse orfane |
| Complete | cancella ciò che non è nel template | cancellazioni inattese |
| Validate | solo verifica | nessuna modifica |
| what-if | diff previsto | default del servizio mostrati come modifica |

`Complete` è pericoloso su resource group condivisi: cancella qualunque risorsa non dichiarata, inclusi quelli creati da altri strumenti. Si usa solo su resource group dedicati al deployment. `what-if` con `--result-format ResourceIdOnly` produce un elenco compatto per la revisione in PR, mentre `--no-pretty-print` dà JSON per un controllo automatico.

```bash
az deployment group what-if -g rg-app-dev -f main.bicep -p main.bicepparam \
  --no-pretty-print > whatif.json
jq '[.changes[] | select(.changeType=="Delete")] | length' whatif.json
```

## Segreti, identità e storia dei deployment

Un deployment con `@secure()` lascia comunque traccia nella history del resource group, leggibile da chi ha `Microsoft.Resources/deployments/read`. Riduci l'esposizione con `--what-if` in CI, storage dei segreti in Key Vault e politica di retention sulla history.

```bicep
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${prefix}-${env}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

resource appSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'db-password'
  properties: { value: adminPassword }
}
```

L'alternativa migliore è non passare il valore a Bicep: si crea il segreto fuori dal deployment (CLI, pipeline con variabile protetta) e lo si referenzia. In ogni caso ruota i segreti con regolarità: un valore che passa una volta da un template è da considerare esposto.

## Errori comuni

- **`bicepconfig.json` senza alias**: i moduli `br/...` non si risolvono e la build fallisce sulla macchina di chi non ha la config in radice.
- **Parametri di produzione nel `.bicepparam`**: valori non segreti sì, password no; usare variabili d'ambiente protette dal sistema di pipeline.
- **`Complete` su resource group condiviso**: cancella risorse di altri team; limitarsi a `Incremental` o a RG dedicati.
- **Ignorare i warning della linter**: `no-hardcoded-location` e `use-recent-api-versions` prevengono errori che si scoprono solo al deploy.
- **Pubblicare moduli senza versioni immutabili**: sovrascrivere `v1.0.0` rompe la riproducibilità; pubblicare una nuova versione.

## In sintesi

Un repository Bicep scalabile separa moduli versionati nel registry, file di parametri per ambiente, segreti fuori dal codice e una pipeline che valida, fa `what-if` e deploya in modo incrementale. La linter e la configurazione condivisa riducono la deriva tra macchine. Il laboratorio ricostruisce questo flusso con risorse minime e un controllo automatico sul `what-if`.

## Fonti

- [Bicep linter - Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter)
- [Deployare con Azure CLI](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli)
- [Estensione Bicep per Azure Pipelines](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-extension)
- [Configuration set e moduli](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/patterns-configuration-set)
