In questo laboratorio costruisci un progetto Terraform completo per un servizio di file statici usando il provider `local` e `random`, senza account cloud: due ambienti, un modulo, stato remoto simulato su directory separate, un `import` dichiarativo, un cambio di indirizzo senza distruzione e un test che fallisce se la configurazione non rispetta i vincoli. È l'ambiente più vicino a un repository reale che si possa avere senza credenziali.

## Obiettivi

- Impostare un progetto con `versions.tf`, modulo e due ambienti.
- Generare file di configurazione del servizio con `local_file` e `random_string`.
- Verificare `plan` come creazione, modifica in place e sostituzione.
- Spostare una risorsa dentro un modulo con `moved` e senza distruzione.
- Importare un file già esistente e aggiungere un test con `terraform test`.

## Il contratto del laboratorio

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| provider | `hashicorp/local` ~> 2.5, `hashicorp/random` ~> 3.7 | nessuna credenziale |
| risorse | `local_file` + `random_string` | piano verificabile su disco |
| ambienti | `env/dev`, `env/prod` | stato separato |
| modulo | `modules/sito` | interfaccia stabile |
| test | `tests/*.tftest.hcl` con `mock_provider` | nessun file creato nei test |
| output | percorso e hash | verificabili con `sha256sum` |

```bash
mkdir -p ~/tf-lab/{modules/sito,env/dev,env/prod,tests}
cd ~/tf-lab
terraform version
```

Serve Terraform 1.9 o successivo: `mock_provider` nei test è disponibile dalla 1.7 e l'import dichiarativo dalla 1.5. Il binario si scarica dal sito ufficiale e si mette nel `PATH`.

## Passo 1: il modulo

Il modulo produce due file: un `index.html` con un identificativo casuale e un `manifest.json` con nome, ambiente e data. L'implementazione non deve contenere percorsi specifici dell'ambiente, che arrivano come variabili.

```hcl
# modules/sito/versions.tf
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    local  = { source = "hashicorp/local", version = "~> 2.5" }
    random = { source = "hashicorp/random", version = "~> 3.7" }
  }
}
```

```hcl
# modules/sito/main.tf
variable "nome" { type = string }
variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.env)
    error_message = "env deve essere dev, test o prod."
  }
}
variable "base_dir" {
  type    = string
  default = "/tmp/tf-lab"
}

locals {
  dir = "${var.base_dir}/${var.nome}-${var.env}"
}

resource "random_string" "ver" {
  length  = 8
  special = false
  upper   = false
  keepers = { env = var.env } # cambia solo se cambia l'ambiente
}

resource "local_file" "index" {
  filename = "${local.dir}/index.html"
  content  = "<h1>${var.nome}</h1><p>${random_string.ver.result}</p>\n"
}

resource "local_file" "manifest" {
  filename = "${local.dir}/manifest.json"
  content = jsonencode({
    nome       = var.nome
    ambiente   = var.env
    versione   = random_string.ver.result
  })
}

output "percorso" { value = local_file.index.filename }
output "hash"     { value = sha256(local_file.index.content) }
```

`keepers` vincola la risorsa casuale all'ambiente: senza keepers, aggiungere una variabile o cambiare un valore farebbe rigenerare la stringa e quindi riscrivere l'`index.html` a ogni piano.

## Passo 2: gli ambienti

Ogni ambiente è un file radice di poche righe. Il backend `local` è diverso per ambiente, e le variabili cambiano nome e base directory.

```hcl
# env/dev/main.tf
terraform {
  required_version = ">= 1.9.0"
  backend "local" {
    path = "dev.tfstate"
  }
}

module "sito" {
  source   = "../../modules/sito"
  nome     = "guida"
  env      = "dev"
  base_dir = "/tmp/tf-lab"
}

output "url_dev" { value = module.sito.percorso }
```

```bash
cd env/dev
terraform init
terraform plan -out=dev.plan
terraform apply dev.plan
cat /tmp/tf-lab/guida-dev/manifest.json
terraform state list
```

Il piano deve mostrare tre risorse da creare: `random_string.ver`, `local_file.index`, `local_file.manifest`. Esegui `apply` una seconda volta: il piano deve essere vuoto, perché nessun attributo cambia.

## Passo 3: modifica in place e sostituzione

Ora rompi intenzionalmente qualcosa per vedere i due casi. Aggiungi un campo al `manifest.json`: il file viene riscritto, `random_string` non cambia, quindi il piano mostra una modifica. Poi modifica il `filename` dell'`index`, che forza la sostituzione.

```bash
# 1. modifica del contenuto
sed -i 's/"versione"/"release"/' ../../modules/sito/main.tf
terraform plan -no-color | grep -E '^\s+[~+-]|must be replaced|Plan:'

# 2. ripristino con l'applicazione
terraform apply -auto-approve

# 3. confronta l'hash dichiarato con il file su disco
terraform output -raw hash
sha256sum /tmp/tf-lab/guida-dev/index.html
```

`random_string.ver` non deve ricomparire nel piano: se ricompare come `-/+`, mancano i `keepers`. Questo è il controllo che separa una configurazione stabile da una che riscrive artefatti a ogni esecuzione.

## Passo 4: spostare con `moved` e importare con `import`

Rinomina la risorsa `index` in `home` dentro il modulo. Con `moved` Terraform cambia l'indirizzo nello stato senza toccare il file; senza `moved`, il piano vorrebbe distruggere `local_file.index` e creare `local_file.home`.

```hcl
# modules/sito/main.tf — aggiungi in alto
moved {
  from = local_file.index
  to   = local_file.home
}
```

Poi crea a mano un file che Terraform dovrà adottare, e dichiara l'import nel codice.

```bash
mkdir -p /tmp/tf-lab/guida-dev
printf 'manuale\n' > /tmp/tf-lab/guida-dev/legacy.txt
```

```hcl
# env/dev/legacy.tf
resource "local_file" "legacy" {
  filename = "/tmp/tf-lab/guida-dev/legacy.txt"
  content  = "manuale\n"
}

import {
  to = local_file.legacy
  id = "/tmp/tf-lab/guida-dev/legacy.txt"
}
```

```bash
terraform plan -out=imp.plan
terraform apply imp.plan
terraform state list | grep legacy
```

Il piano deve mostrare `local_file.legacy` come import senza `create`. Dopo il primo `apply` puoi rimuovere il blocco `import`: lasciarlo è innocuo ma confonde, perché il commento generato da `-generate-config-out` esiste solo in import di codice ancora mancante.

## Passo 5: test

Il test usa `mock_provider` per non scrivere file e verifica le regole del modulo. Il fallimento deve essere chiaro: `condition` false, messaggio in italiano.

```hcl
# tests/sito.tftest.hcl
mock_provider "local" {}
mock_provider "random" {}

run "nome_limitato" {
  command = plan
  module {
    source = "./modules/sito"
  }
  variables {
    nome = "guida"
    env  = "prod"
  }
  assert {
    condition     = length(var.nome) > 0 && length(var.nome) <= 30
    error_message = "Il nome del sito deve essere tra 1 e 30 caratteri."
  }
}

run "env_non_ammesso" {
  command = plan
  module {
    source = "./modules/sito"
  }
  variables {
    nome = "guida"
    env  = "staging"
  }
  expect_failures = [var.env]
}
```

```bash
terraform init -backend=false
terraform test
```

Il secondo run deve passare perché si aspetta il fallimento della validazione: `expect_failures` indica quali variabili devono rifiutare il valore. Se il test `nome_limitato` fallisce, il modulo non sta applicando il vincolo che il test presume.

## Esercizi

1. Passa dal backend `local` a un backend `s3` o `azurerm` finto e spiega perché `-migrate-state` chiede conferma interattiva.
2. Elimina il `keepers` da `random_string` e prevedi, prima di eseguire il piano, quali risorse cambiano: motiva la risposta.
3. Sostituisci `local_file.index` con un `for_each` sulla lista `["index", "about"]` e descrivi come cambiano gli output.

<details>
<summary>Soluzione</summary>

1. `init -migrate-state` copia lo stato nel nuovo backend, ma se il precedente aveva risorse con attributi non rileggibili chiede conferma esplicita o `-force`. In automazione si usa `-migrate-state -force`, dopo il backup con `state pull`.

2. Senza `keepers` ogni attributo del piano che differisce ricrea la risorsa casuale; poiché `index` e `manifest` ne dipendono, vengono sostituiti. È esattamente il caso di instabilità da evitare.

3. `for_each` crea `local_file.index["index"]` e `local_file.index["about"]`; gli output devono diventare `map` con `for k, v in local_file.index : k => v.filename`.

</details>

## Errori comuni

- **`moved` con indirizzi sbagliati**: se `from` non corrisponde allo stato, il piano propone di distruggere l'originale; verificare con `state list` prima di applicare.
- **`import` senza la risorsa dichiarata**: senza il blocco `resource` corrispondente l'import fallisce; `-generate-config-out` aiuta ma il codice va corretto a mano.
- **Test che dipendono dal filesystem**: senza `mock_provider` i test scrivono file reali e lasciano residui; mockare sempre.
- **Backend `local` in repository**: `dev.tfstate` finisce nel commit con i valori in chiaro; va in `.gitignore`.
- **`apply` senza `-out`**: le azioni applicate non sono quelle del piano visto in revisione.

## In sintesi

Il laboratorio ha attraversato il ciclo completo su provider locali: creazione, modifica, sostituzione, spostamento con `moved`, adozione con `import`, test con mock. Gli stessi simboli e le stesse regole valgono per un provider cloud, dove cambia solo la risorsa. Il prossimo passo è applicare lo stesso schema a un cloud reale con un backend remoto e credenziali a breve scadenza.

## Fonti

- [Terraform - Introduction](https://developer.hashicorp.com/terraform/intro)
- [Moved blocks](https://developer.hashicorp.com/terraform/language/moved)
- [Import existing resources](https://developer.hashicorp.com/terraform/language/import)
- [Terraform tests](https://developer.hashicorp.com/terraform/language/tests)
