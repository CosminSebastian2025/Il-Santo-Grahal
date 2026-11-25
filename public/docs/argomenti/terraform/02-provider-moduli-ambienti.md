Una configurazione Terraform che funziona su un computer non è ancora un'infrastruttura gestibile da un team. Servono provider versionati, stato remoto con lock, moduli con interfacce stabili, ambienti separati e un modo per sapere che l'infrastruttura rispetta le regole prima di applicarla. Questa lezione copre il passaggio da singolo `.tf` a struttura di repository: provider, moduli, backend, ambienti, test e revisione automatizzata.

## Obiettivi

- Fissare provider e versioni e differenziare i profili per ambiente.
- Spostare lo stato su un backend remoto e gestire il lock.
- Scrivere un modulo con variabili, output e vincoli tramite `validation`.
- Separare gli ambienti senza duplicare il codice.
- Aggiungere `terraform test` e la revisione del piano in CI.

## Provider e versioni

Il provider è il plugin che traduce le risorse HCL in chiamate API. Il blocco `terraform` va in un file dedicato, `versions.tf`, così la policy di versione è visibile e revisionabile.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.9.0, < 2.0.0"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.40" }
    random  = { source = "hashicorp/random", version = "~> 3.7" }
  }
  backend "azurerm" {
    resource_group_name  = "rg-tfstate-prod"
    storage_account_name = "sttfstateprod001"
    container_name       = "tfstate"
    key                  = "prod/app.tfstate"
    use_azuread_auth     = true
  }
}
```

`~> 4.40` accetta 4.x a partire da 4.40 ma non 5.0: è il compromesso tra aggiornamenti di sicurezza e rotture di major. `.terraform.lock.hcl` va committato perché fissa gli hash delle build esatte dei provider; la CI lo verifica con `terraform init -lockfile=readonly`.

| Vincolo | Significato | Uso |
| --- | --- | --- |
| `= 4.40.1` | versione esatta | riproduzione di un incidente |
| `~> 4.40` | `>= 4.40, < 5.0` | default consigliato |
| `>= 4.0` | qualunque versione nuova | sconsigliato in produzione |
| `-lockfile=readonly` | errori su hash cambiati | CI |

## Stato remoto e lock

Con state remoto più persone possono lavorare sullo stesso ambiente: il backend gestisce un lock che impedisce due `apply` simultanei, e il filesystem cloud conserva versioni precedenti. In Azure il backend `azurerm` usa un blob con versioning e soft delete. Il blocco `backend` non accetta variabili: si passano con `-backend-config` in una fase di `init`.

```bash
terraform init \
  -backend-config="key=prod/app.tfstate" \
  -backend-config="resource_group_name=rg-tfstate-prod" \
  -migrate-state

terraform force-unlock 8f1c-2d3a      # solo se un lock è rimasto orfano
terraform state pull | head -20        # leggere lo stato remoto in locale
```

Un lock orfano si verifica quando un processo viene ucciso: `force-unlock` è giustificato solo dopo aver controllato che nessun altro job sia in corso, perché il lock non ha timeout rimovibile dall'esterno.

## Moduli e ambienti

Il modulo è una directory di `.tf` chiamata con `module`. L'interfaccia conta più dell'implementazione: variabili tipizzate, output documentati, niente riferimenti a risorse esterne al modulo.

```hcl
# modules/storage/main.tf
variable "nome" { type = string }
variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.env)
    error_message = "env non ammesso."
  }
}
variable "rete_consentita" {
  type    = list(string)
  default = []
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_storage_account" "this" {
  name                     = lower(substr("st${var.nome}${var.env}${random_string.suffix.result}", 0, 24))
  resource_group_name      = var.rg
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = var.env == "prod" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
  network_rules {
    default_action = "Deny"
    ip_rules       = var.rete_consentita
  }
}

output "id"  { value = azurerm_storage_account.this.id }
output "url" { value = azurerm_storage_account.this.primary_blob_endpoint }
```

Il modulo riceve `rg` e `location` e li usa: vanno dichiarati anche loro come variabili, omessi sopra per brevità. Il nome dello storage account ha limite di 24 caratteri e solo lettere e numeri, motivo per cui `substr` è obbligatorio e non un vezzo.

| Struttura | Esempio | Quando |
| --- | --- | --- |
| directory per ambiente | `env/dev/`, `env/prod/` | stato e credenziali separati |
| workspaces | `terraform workspace select prod` | stesso codice, stato diverso |
| Terragrunt o simili | generazione dei backend | molti ambienti e moduli |

La directory per ambiente resta la scelta più chiara: ogni ambiente ha il suo backend, le sue variabili e il suo ciclo di approvazione. I workspace funzionano ma lo stato condiviso nel backend unico nasconde il rischio di selezionare l'ambiente sbagliato.

## Test e revisione in CI

Dal 1.6 `terraform test` esegue file `.tftest.hcl` con blocchi `run`. Sono test di configurazione: pianificano e applicano su risorse reali o, meglio, su provider locali come `null` e `random` per i calcoli.

```hcl
# tests/naming.tftest.hcl
mock_provider "azurerm" {}

run "nome_rispetta_limiti" {
  command = plan
  variables {
    nome = "log"
    env  = "prod"
    rg   = "rg-test"
    location = "westeurope"
  }
  assert {
    condition     = length(azurerm_storage_account.this.name) <= 24
    error_message = "Il nome supera i 24 caratteri."
  }
}
```

```bash
terraform init -backend=false
terraform test -verbose
terraform plan -out=tf.plan && terraform show -no-color tf.plan | head -80
```

In CI il piano diventa l'artefatto da revisionare: lo si salva con `-out`, lo si mostra in forma leggibile senza colori e lo si applica solo il commit approvato. `tfsec`/`trivy` o le policy nativi (`terraform policy`) coprono le regole di sicurezza, mentre `fmt -check` e `validate` coprono i difetti banali. Un `apply` automatico dopo merge è accettabile solo con lock e revisione: una pipeline che applica un piano non revisionato sposta il rischio dalla revisione al caso.

## Errori comuni

- **Lasciare `.terraform/` nel repository**: contiene binari dei provider, grandi e non portabili; va in `.gitignore` insieme a `*.tfstate` e `*.tfplan`.
- **Modificare lo stato a mano**: lo stato è JSON ma ha struttura interna e digest; usare `state mv`, `import` o `taint`.
- **Riusare un modulo con `provider` dentro**: il modulo non deve dichiarare provider, altrimenti l'eredità di configurazione si rompe; i provider appartengono alla configurazione radice.
- **Ambienti nello stesso stato**: un `apply` di test può toccare risorse di produzione; backend separati per ambiente.
- **Ignorare il lockfile**: senza commit di `.terraform.lock.hcl` i collaboratori usano versioni di provider diverse e il piano cambia.

## In sintesi

Un repository Terraform maturo ha versioni fissate nel lockfile, stato remoto con lock, moduli con interfaccia tipizzata e validazioni, ambienti in directory separate con backend distinti e test che girano prima del piano. Il piano salvato e revisionato è il vero artefatto di deploy; `apply` è solo l'esecuzione. Il laboratorio mette insieme questi pezzi su un ambiente locale, senza cloud.

## Fonti

- [Providers](https://developer.hashicorp.com/terraform/language/providers)
- [Modules](https://developer.hashicorp.com/terraform/language/modules)
- [Backend configuration](https://developer.hashicorp.com/terraform/language/backend)
- [Terraform tests](https://developer.hashicorp.com/terraform/language/tests)
