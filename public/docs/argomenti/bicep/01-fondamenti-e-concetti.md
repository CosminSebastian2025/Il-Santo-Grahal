Bicep è il linguaggio dichiarativo con cui si descrivono risorse Azure: sostituisce i template JSON di ARM con una sintassi più corta e sicura rispetto ai tipi, ma compila esattamente negli stessi JSON. Non è un linguaggio generico come HCL: è pensato per un solo cloud, quindi ha accesso diretto a tipi delle risorse Azure, funzioni integrate e controllo statico dell'API version. In questa lezione impari come è fatto un file `.bicep`, come funziona la compilazione in ARM, quali sono i tipi e come si legge il diff prima del deploy.

## Obiettivi

- Riconoscere i blocchi di un file Bicep: `targetScope`, `param`, `var`, `resource`, `output`.
- Capire la relazione tra file `.bicep` e template JSON ARM compilato.
- Scrivere risorse con `resource … 'tipo@apiVersion'` e proprietà tipizzate.
- Usare parametri decorati, `@secure()`, `@allowed` e `@minLength`.
- Scegliere `what-if` o `--confirm-with-what-if` prima di ogni deploy.

## Da JSON a Bicep: cosa cambia

Un template ARM JSON ha parametri, variabili, risorse e output, con nomi come `$schema`, `contentVersion` e `"[parameters('x')]"`. Bicep produce lo stesso JSON ma elimina le parentesi e i percorsi `resourceId()` a favore dei riferimenti diretti.

```bicep
targetScope = 'resourceGroup'

param location string = resourceGroup().location
param prefix string
param env string = 'dev'

var storageName = toLower('st${prefix}${env}${uniqueString(resourceGroup().id)}')

@description('Account di storage applicativo, TLS 1.2 minimo.')
resource storage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: substr(storageName, 0, 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

output storageId string = storage.id
output primaryEndpoint string = storage.properties.primaryEndpoints.blob
```

| Concetto ARM | Bicep | Nota |
| --- | --- | --- |
| `"[parameters('env')]"` | `env` | accesso diretto, niente interpolazione |
| `"[resourceId('...','name')]"` | riferimento `storage.id` | risolto in compilazione |
| `dependsOn` manuale | implicito dall'uso di `storage` | il grafo nasce dai riferimenti |
| `copy` loop | `[for x in lista: {...}]` | cicli dichiarativi |
| `condition` | `if (cond) { ... }` | risorsa condizionale |

La compilazione è deterministica e offline: `bicep build main.bicep` produce `main.json`. L'estensione VS Code e la CLI `Azure CLI` (`az bicep build`) usano lo stesso compilatore. Il template generato si può usare con `az deployment group create --template-file main.json` o direttamente con il `.bicep`, che viene compilato al volo.

```bash
az bicep version
az bicep build --file main.bicep --outfile main.json
az bicep decompile --file legacy.json   # reverse, utile per migrazioni
bicep lint main.bicep
```

## Tipi, parametri e validazione

Bicep ha tipi semplici (`string`, `int`, `bool`, `object`, `array`), tipi `null`, tipi letterali (`'dev'`) e union di tipi (`'dev' | 'test' | 'prod'`). I decoratori aggiungono vincoli che il compilatore e Azure verificano prima di creare risorse.

```bicep
@description('Ambiente di destinazione')
@allowed(['dev', 'test', 'prod'])
param env string

@secure()
@minLength(12)
param adminPassword string

@minValue(1)
@maxValue(10)
param instanceCount int = 2

@metadata({ owner: 'team-piattaforma' })
param tags resourceInput<'Microsoft.Resources/tags@2024-03-01'>.properties.tags

type appConfig = {
  name: string
  tier: 'Free' | 'Basic' | 'Standard'
  replicas: int
}
```

| Decoratore | Effetto | Errore tipico evitato |
| --- | --- | --- |
| `@secure()` | valore mai nei log | password in output |
| `@allowed()` | valori ammessi | ambiente sconosciuto |
| `@minLength`, `@maxLength` | lunghezza | nome storage oltre 24 |
| `@minValue`, `@maxValue` | intervallo numerico | repliche a 0 |
| `@description()` | documentazione nel template | interfaccia non documentata |

I tipi definiti con `type` (dal 2024, usabili anche come parametri) permettono di modellare oggetti di configurazione e di riusarli nei moduli. `@secure()` non significa che il valore è cifrato nel deployment history: quello dipende dal registro dei deployment e dal provider di segreti.

## Risorse, moduli e scope

Le risorse hanno un tipo completo con API version: `Microsoft.Storage/storageAccounts@2024-01-01`. La versione è obbligatoria e non c'è fallback: cambiarla significa chiedere un'altra API, con proprietà potenzialmente diverse. Lo scope predefinito è il resource group; `targetScope = 'subscription'` o `'managementGroup'` cambia le risorse ammesse e il comando di deploy.

```bicep
module rete './modules/vnet.bicep' = {
  name: 'vnet-${env}'
  params: {
    vnetName: 'vnet-${prefix}-${env}'
    location: location
    addressPrefixes: ['10.20.0.0/16']
    tags: tags
  }
}

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: 'app-${prefix}-${env}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: appPlan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
    }
  }
}
```

Il modulo Bicep è un file `.bicep` in una sottodirectory, compilato insieme alla radice; si può puntare anche a un modulo pubblicato nel Bicep Registry (`br:myregistry.azurecr.io/modulo:v1`). Non c'è uno stato separato come in Terraform: l'unica fonte di verità è Azure, e il confronto avviene tra il template e la risorsa viva.

```bash
az deployment group what-if \
  --resource-group rg-app-dev \
  --template-file main.bicep \
  --parameters env=dev prefix=app

az deployment group create \
  --resource-group rg-app-dev \
  --template-file main.bicep \
  --parameters env=dev prefix=app \
  --confirm-with-what-if
```

| Comando | Cosa restituisce | Uso |
| --- | --- | --- |
| `what-if` | modifiche previste per risorsa | revisione prima del merge |
| `create --confirm-with-what-if` | conferma interattiva | deploy manuale sicuro |
| `validate` | errori di template e API | preflight in CI |
| `decompile` | Bicep da JSON esistente | migrazione da ARM |

`what-if` distingue `Create`, `Modify`, `Delete` e `Ignore`. Le proprietà che Bicep non conosce appaiono come `Modify` anche se identiche, perché il servizio non le espone: va letto con cautela, non assunto come diff perfetto.

## Errori comuni

- **Omettere l'API version**: `Microsoft.Web/sites` senza `@versione` non compila; non esiste un default.
- **`dependsOn` ovunque**: crea cicli e nasconde le dipendenze reali; il riferimento alla proprietà è sufficiente nella maggior parte dei casi.
- **Parametri senza `@secure()`**: password e connection string finiscono nel deployment history e nei log.
- **`uniqueString` senza scope stabile**: se cambia il resource group, il nome dello storage cambia e la risorsa viene ricreata.
- **Assumere che `what-if` mostri solo differenze reali**: alcune proprietà riportate come modifiche sono conseguenze di default del servizio.

## In sintesi

Bicep è un livello di zucchero sintattico sopra i template ARM, con tipi, validazioni e riferimenti diretti al posto delle stringhe. Compila in JSON e si deploya con Azure CLI o con una pipeline. Non ha stato: il confronto è tra codice e cloud, mediato da `what-if`. La prossima lezione amplia lo schema a moduli, configuration set e pipeline di revisione.

## Fonti

- [Cos'è Bicep - Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview)
- [Bicep file - Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/file)
- [Confronto tra JSON e Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/compare-template-syntax)
- [Documentazione Azure Resource Manager Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
