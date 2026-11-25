Terraform descrive l'infrastruttura con file di configurazione e la confronta con lo stato che ha in memoria. Tu dichiari il risultato — una rete, una macchina, un record DNS — e Terraform calcola la differenza tra quello che dichiari e quello che conosce, poi esegue solo le azioni necessarie. In questa lezione impari come è fatta una configurazione, come nasce lo stato, come si legge un piano e perché il ciclo `init`, `plan`, `apply` è la parte che va capita prima di toccare qualunque provider.

## Obiettivi

- Riconoscere i blocchi del linguaggio HCL: `terraform`, `provider`, `resource`, `variable`, `output`.
- Capire il ruolo dello stato e cosa succede quando viene perso o condiviso.
- Leggere un piano e distinguere creazione, modifica in place e sostituzione.
- Usare variabili, `locals` e funzioni comuni invece di valori ripetuti.
- Scegliere un provider e fissarne la versione minima.

## Blocchi e ciclo di vita

Una configurazione Terraform è un insieme di blocchi, ognuno con un tipo e zero o più etichette. I file si chiamano `.tf`, vengono letti tutti insieme e l'ordine non conta: le dipendenze nascono dai riferimenti, non dalla posizione.

```hcl
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

variable "subscription_id" {
  type      = string
  sensitive = true
}

locals {
  prefisso = "app-${var.env}"
  tag = {
    owner = "team-piattaforma"
    env   = var.env
  }
}

variable "env" {
  type    = string
  default = "dev"
  validation {
    condition     = contains(["dev", "test", "prod"], var.env)
    error_message = "env deve essere dev, test o prod."
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefisso}"
  location = "westeurope"
  tags     = local.tag
}

output "rg_id" {
  value = azurerm_resource_group.main.id
}
```

| Blocco | Funzione | Esempio |
| --- | --- | --- |
| `terraform` | versione e provider richiesti | vincolo `required_version` |
| `provider` | credenziali e configurazione del provider | `features {}` obbligatorio in azurerm |
| `resource` | oggetto da creare e gestire | `azurerm_resource_group` |
| `data` | oggetto esistente letto in sola lettura | immagine di base |
| `variable` | input esterno | `env` con validazione |
| `locals` | valori calcolati | nome con prefisso |
| `output` | valori restituiti | ID della risorsa |

Il ciclo standard è sempre lo stesso: `terraform init` scarica i provider e prepara `.terraform`; `terraform plan` costruisce il grafo, legge lo stato e propone le azioni; `terraform apply` esegue le azioni e aggiorna stato e output. `terraform fmt` e `terraform validate` si lanciano prima del commit.

```bash
terraform init -backend=false   # validazione senza scaricare il backend
terraform fmt -check -recursive
terraform validate
terraform plan  -var-file=environments/dev.tfvars -out=dev.plan
terraform apply dev.plan
terraform output -json rg_id
```

Passare `-out` è essenziale in automazione: il file di piano contiene esattamente le azioni approvate e `apply` non ricalcola nulla. Se il codice cambia dopo il `plan`, il piano è obsoleto e `apply` lo segnala.

## Stato: la memoria di Terraform

Lo stato è il file che associa ogni risorsa della configurazione all'ID reale nel provider. Senza stato Terraform non sa cosa ha creato e vorrebbe creare tutto da capo. Lo stato locale `terraform.tfstate` va bene solo per prove individuali: contiene attributi sensibili in chiaro e non può essere condiviso.

```bash
terraform state list                      # risorse gestite
terraform state show azurerm_resource_group.main
terraform plan -refresh-only              # solo riallineamento
terraform apply -refresh=false            # usa lo stato senza rileggere
```

| Domanda | Comando | Effetto |
| --- | --- | --- |
| cosa gestisco | `state list` | elenco indirizzi |
| dettagli di una risorsa | `state show` | attributi dallo stato |
| spostare un indirizzo | `state mv` o blocco `moved` | nessuna ricreazione |
| importare un oggetto esistente | `import` o blocco `import` | gestione del già presente |
| cambiare backend | `init -migrate-state` | trasferimento con conferma |

Dal 2024 `terraform import` è affiancato dal blocco `import` e `removed`, che rendono l'import parte del codice e quindi revisionabile. Fino alla 1.4 l'unico modo era il comando, che aggiornava lo stato senza traccia nella storia del repository.

## Il piano: create, update, replace

Terraform mostra i simboli `+` (crea), `~` (aggiorna in place), `-` (distrugge), `-/+` (sostituisce: distrugge e ricrea). La sostituzione è la sorpresa più costosa: cambiare il nome di un disco o il tipo di un indirizzo IP spesso forza la ricreazione.

```
  # azurerm_resource_group.main will be created
  + resource "azurerm_resource_group" "main" { ... }

  # azurerm_storage_account.logs must be replaced
-/+ resource "azurerm_storage_account" "logs" {
      ~ name = "stlogsdev" -> "stlogsdev2" # forces replacement
```

Una modifica con `forces replacement` su una risorsa con dati è un incidente in attesa: in produzione si pianifica con `-out` e si legge il sommario `Plan: X to add, Y to change, Z to destroy`.

## Errori comuni

- **Fare `apply` senza leggere il piano**: la sostituzione di un database compare nel piano ma si nota solo dopo; usare sempre `-out` e controllare il riepilogo.
- **Commit di `terraform.tfstate`**: lo stato contiene credenziali generate dal provider; va in un backend remoto con cifratura.
- **Vincolare senza versione**: `version = "~> 4.0"` evita che un update silenzioso rompa il formato dello stato.
- **Usare `count` per risorse eterogenee**: con `count` l'ordine è indice e rimuovere un elemento intermedio ricrea tutti i successivi; `for_each` con chiavi stabili è più sicuro.
- **Variabili `sensitive` nei log**: `sensitive = true` nasconde l'output ma il valore resta visibile in `state show`; lo stato remoto deve essere protetto.

## In sintesi

Terraform è un ciclo di differenza tra desiderio e stato: HCL descrive il desiderio, lo stato ricorda cosa esiste, il piano è la differenza. Capire i blocchi, la dipendenza implicita dai riferimenti e i simboli del piano è gran parte del lavoro. I provider aggiungono le risorse concrete, ma il comportamento è sempre lo stesso: init, plan, apply, con lo stato come parte critica dell'infrastruttura. La prossima lezione approfondisce provider, moduli e ambienti.

## Fonti

- [Terraform - Introduction](https://developer.hashicorp.com/terraform/intro)
- [Configuration Language](https://developer.hashicorp.com/terraform/language)
- [Terraform State](https://developer.hashicorp.com/terraform/language/state)
- [Terraform CLI](https://developer.hashicorp.com/terraform/cli)
