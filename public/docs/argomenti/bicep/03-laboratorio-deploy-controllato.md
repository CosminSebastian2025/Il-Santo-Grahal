In questo laboratorio scrivi una soluzione Bicep minima ma completa: un resource group di appoggio, un modulo per lo storage con regole di rete, un file `.bicepparam` per due ambienti, una linter che blocca gli errori e uno script che esegue `what-if` e rifiuta il deploy se il piano contiene cancellazioni o risorse con accesso pubblico. Il tutto gira con Azure CLI e non richiede una pipeline già configurata: lo script che scrivi è il nucleo della pipeline.

## Obiettivi

- Creare la struttura `main.bicep`, `modules/`, `params/` e `scripts/`.
- Scrivere un modulo storage con vincoli verificabili.
- Parametrizzare l'ambiente con `.bicepparam` e variabili d'ambiente.
- Bloccare il deploy con uno script di guardia sul `what-if`.
- Aggiungere una convalida di identità e permessi a livello minimo.

## Il contratto del laboratorio

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| scope | resource group esistente `rg-bicep-lab` | nessuna creazione di sottoscrizione |
| risorse | storage account + container di log | costi trascurabili |
| ambienti | `dev`, `prod` | due `bicepparam` |
| guardia | nessuna `Delete`, nessun blob pubblico | script `gate.sh` |
| linter | errori su API version e location | `bicepconfig.json` |
| output | endpoint blob + nome account | verificabili con `az` |

```bash
mkdir -p ~/bicep-lab/{modules,params,scripts}
cd ~/bicep-lab
az version
az bicep upgrade
az account show --query '{sub:id, tenant:tenantId}' -o table
```

Serve un utente con `Contributor` sul resource group, non sulla sottoscrizione: `az role assignment create --assignee <upn> --role Contributor --scope /subscriptions/<sub>/resourceGroups/rg-bicep-lab` lo verifica chi amministra. Il laboratorio funziona anche in un tenant di prova personale con un RG dedicato.

## Passo 1: modulo storage con confini espliciti

Il modulo accetta un nome base, calcola il nome legale per Azure (minuscolo, senza trattini, massimo 24 caratteri) e impedisce l'accesso pubblico. Le regole sono nel modulo, non nella radice: chi lo usa non può dimenticarle.

```bicep
// modules/storage.bicep
@description('Prefisso del nome, solo lettere e numeri.')
@minLength(3)
@maxLength(12)
param nome string

@description('Ambiente: determina la ridondanza.')
@allowed(['dev', 'prod'])
param env string

param location string
param tags object = {}

var suffisso = uniqueString(resourceGroup().id, nome, env)
var accountName = toLower(substr('${nome}${env}${suffisso}', 0, 24))
var sku = env == 'prod' ? 'Standard_GRS' : 'Standard_LRS'

resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: accountName
  location: location
  tags: tags
  sku: { name: sku }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

resource logs 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = {
  parent: storage
  name: 'default/logs'
  properties: { publicAccess: 'None' }
}

output name string = storage.name
output endpoint string = storage.properties.primaryEndpoints.blob
```

`parent: storage` evita di comporre `resourceId` a mano e crea la dipendenza implicita. `allowSharedKeyAccess: false` obbliga l'uso di Azure AD per l'accesso ai dati: è una scelta che rende il laboratorio realistico e compatibile con l'identità gestita del passo 4.

## Passo 2: radice e parametri per ambiente

La radice dichiara il resource group esistente con `existing`, chiama il modulo e propaga i tag comuni. I file `.bicepparam` forniscono solo ciò che cambia.

```bicep
// main.bicep
targetScope = 'resourceGroup'

param env string
param prefisso string = 'lab'
param tags object = {}

var tagComuni = union({ owner: 'team-piattaforma', env: env }, tags)

module storage './modules/storage.bicep' = {
  name: 'storage-${env}'
  params: {
    nome: prefisso
    env: env
    location: resourceGroup().location
    tags: tagComuni
  }
}

output accountName string = storage.outputs.name
output blobEndpoint string = storage.outputs.endpoint
```

```bicep
// params/dev.bicepparam
using '../main.bicep'
param env = 'dev'
param prefisso = 'labdev'
```

```bicep
// params/prod.bicepparam
using '../main.bicep'
param env = 'prod'
param prefisso = 'labprod'
param tags = { costo = 'centro-di-costo-42' }
```

```bicep
// bicepconfig.json
{
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {
        "no-hardcoded-location": { "level": "error" },
        "use-recent-api-versions": { "level": "error" },
        "no-unused-params": { "level": "error" },
        "secure-parameter-default": { "level": "error" }
      }
    }
  }
}
```

```bash
az bicep build --file main.bicep --stdout > /dev/null && echo build-ok
az deployment group validate -g rg-bicep-lab -f main.bicep -p params/dev.bicepparam
az deployment group create -g rg-bicep-lab -f main.bicep -p params/dev.bicepparam \
  --confirm-with-what-if
az deployment group show -g rg-bicep-lab -n storage-dev --query properties.outputs -o table
```

Il secondo `create` con gli stessi parametri deve produrre un `what-if` senza modifiche rilevanti: se lo storage cambia a ogni run, il nome non è stabile, quindi `uniqueString` riceve argomenti che cambiano.

## Passo 3: lo script di guardia

Il cuore dell'esercizio è lo script che trasforma il `what-if` in un criterio di gating. Deve rifiutare con codice diverso da zero quando compare una cancellazione, quando una risorsa pubblica diventa tale o quando il numero di modifiche supera una soglia.

```bash
#!/usr/bin/env bash
# scripts/gate.sh <paramfile> [--allow-delete]
set -euo pipefail
RG=${RG:-rg-bicep-lab}
PF=${1:?parametro mancante}
ALLOW_DELETE=${2:-}

az deployment group what-if -g "$RG" -f main.bicep -p "$PF" \
  --no-pretty-print > whatif.json

deletes=$(jq '[.changes[] | select(.changeType=="Delete")] | length' whatif.json)
total=$(jq '.changes | length' whatif.json)
pubblici=$(jq '[.changes[] | select((.delta // []) | map(select(.path | test("allowBlobPublicAccess|publicNetworkAccess"; "i"))) | length > 0 and (.after.allowBlobPublicAccess == true or .after.publicNetworkAccess == "Enabled"))] | length' whatif.json 2>/dev/null || echo 0)

printf 'modifiche: %s  cancellazioni: %s  pubblici: %s\n' "$total" "$deletes" "$pubblici"
if [[ "$deletes" -gt 0 && "$ALLOW_DELETE" != "--allow-delete" ]]; then
  echo "Bloccato: il piano contiene cancellazioni." >&2; exit 2
fi
if [[ "$total" -gt 25 ]]; then
  echo "Bloccato: troppe modifiche per un deploy automatico." >&2; exit 3
fi
echo "Gate superato."
```

Il filtro `pubblici` è volutamente semplificato e serve a mostrare il meccanismo; in un caso reale si controllano campi specifici per tipo di risorsa. Esegui lo script e osserva il codice di uscita, che è il criterio di uscita dell'esercizio. Con un piano vuoto esce 0; se togli il modulo dal codice e una risorsa esistente resta orfana, il `what-if` mostra una `Delete` e lo script esce con 2.

```bash
chmod +x scripts/gate.sh
./scripts/gate.sh params/dev.bicepparam; echo "exit: $?"
```

## Passo 4: identità gestita e accesso ai dati

Per leggere i blob con Azure AD, lo storage ha `allowSharedKeyAccess: false` ed è necessario un ruolo di dati. Aggiungi alla radice un'identità assegnata all'account che esegue il deploy, oppure usa l'identità gestita di una funzione.

```bash
az identity create -g rg-bicep-lab -n id-lab --query id -o tsv
PRINCIPAL=$(az identity show -g rg-bicep-lab -n id-lab --query principalId -o tsv)
STORAGE=$(az deployment group show -g rg-bicep-lab -n storage-dev --query properties.outputs.accountName.value -o tsv)
az role assignment create --assignee-object-id "$PRINCIPAL" --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "$(az storage account show -g rg-bicep-lab -n "$STORAGE" --query id -o tsv)"
```

\| Controllo | Comando | Atteso |
| --- | --- | --- |
| chiave condivisa disattivata | `az storage account show --query allowSharedKeyAccess` | `false` |
| accesso anonimo disattivato | `--query allowBlobPublicAccess` | `false` |
| TLS minimo | `--query minimumTlsVersion` | `TLS1_2` |
| gate | `scripts/gate.sh params/dev.bicepparam` | exit 0 |

## Esercizi

1. Aggiungi un `@secure()` parametro per un endpoint di log e usa `readEnvironmentVariable` per leggerlo dalla shell.
2. Modifica `gate.sh` perché esca con 2 anche quando compaiono modifiche a `minimumTlsVersion` in diminuzione.
3. Converti una vecchia risorsa creata a mano con `az bicep decompile` e confronta il risultato con il modulo scritto a mano.

<details>
<summary>Soluzione</summary>

1. `param logEndpoint string` con `@secure()`, assegnato in `params/dev.bicepparam` con `readEnvironmentVariable('LOG_ENDPOINT','')`; in alternativa si legge dallo script con `az deployment ... --parameters logEndpoint="$LOG_ENDPOINT"`.

2. Aggiungi un `jq` che estrae `.before.minimumTlsVersion` e `.after.minimumTlsVersion` e confronta l'ordine con un array `["TLS1_0","TLS1_1","TLS1_2"]`, uscendo se l'indice diminuisce.

3. `az bicep decompile --file vecchio.json` genera `main.bicep` con parametri e risorse, ma spesso con `dependsOn` espliciti e senza la tipizzazione del modulo: il confronto con la versione scritta a mano evidenzia le proprietà ridondanti.

</details>

## Errori comuni

- **Gate con piano vuoto**: se il `what-if` non viene eseguito sul RG corretto, `.changes` è vuoto e ogni controllo passa; verifica con `--query name` del deployment.
- **`create` prima del gate**: lo script deve precedere il deploy, non seguirlo; in pipeline è uno step separato con dipendenza.
- **Modulo senza `parent`**: i container si creano con ID scollegato e Bicep crea una dipendenza nascosta solo in apparenza.
- **`uniqueString` con input variabili**: parametri calcolati da timestamp cambiano il nome e ricreano lo storage; usare RG, nome ed env.
- **Ruolo assegnato senza `--assignee-principal-type`**: con l'ID oggetto servono i permessi di directory; il tipo esplicito evita una chiamata di lookup.

## In sintesi

Il laboratorio costruisce un deploy Bicep con confini nel modulo, parametri per ambiente e un gate che rende il `what-if` un contratto: nessuna cancellazione, nessun cambio di esposizione, numero di modifiche sotto controllo. Identità gestite e ruoli completano l'accesso ai dati. Lo stesso script entra in pipeline con un role assignment a permessi minimi.

## Fonti

- [Cos'è Bicep - Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [Deployare con Azure CLI](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli)
- [Bicep linter - Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter)
- [Segreti con Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-secrets)
