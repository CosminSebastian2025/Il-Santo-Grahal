Il tuo file YAML può essere sintatticamente valido e semanticamente sbagliato: un `build` al posto di `image`, un `port` al posto di `ports`, una indentazione che mette la chiave nella mappa sbagliata. Gli strumenti per accorgersene sono tre: un lint che controlla forma e stile, uno schema che controlla la struttura attesa (per Docker Compose c'è un JSON Schema pubblico), e un `config` che rende esplicito cosa il tool ha capito. In questa lezione li metti in fila su un file Compose realistico.

## Obiettivi

- Usare `yamllint` per gli errori di forma e stile.
- Validare un file Compose contro il suo schema.
- Rendersi conto della differenza tra YAML valido e configurazione valida.
- Usare le variabili e l'interpolazione di Docker Compose senza sorprese.

## Tre livelli di validazione

- **Parsing YAML**: il documento ha indentation e sintassi corrette. Lo fa qualsiasi parser; fallisce subito.
- **Validazione semantica**: il documento è YAML valido ma il tool non si aspetta quelle chiavi. Questo è il livello in cui si annidano gli errori.
- **Runtime**: il Compose è corretto ma un'immagine non esiste, un volume è di sola lettura, una variabile non è definita.

Un buon flusso di CI copre i primi due livelli; il terzo è lavoro del `docker compose config` o di un test reale.

## Lint con yamllint

`yamllint` controlla forme e stile: lunghezza riga, presenza di spazi finali, tab, documenti che non iniziano con `---`, duplicati di chiavi, indentazione. Installalo con `pip install yamllint` (o lo stesso pacchetto via Homebrew).

```bash
yamllint compose.yaml
```

Output di default: nessuna riga se il file è pulito, oppure righe come:

```text
compose.yaml
  12:3       error    wrong indentation: expected 4 but found 2  (indentation)
  24:1       error    trailing spaces  (trailing-spaces)
```

Configurazione minima `.yamllint`:

```yaml
---
extends: default
rules:
  line-length:
    max: 120
  truthy:
    allowed-values: ["true", "false", "on", "off"]
```

La regola `truthy` segnala i valori che parser diversi leggono in modi diversi (`yes`, `no`, `on`): è la versione da lint del Norway problem. Se `extends: default` ti segnala che il file non inizia con `---`, aggiungi `document-start: disable` o scrivilo davvero.

## Schema: il contratto del formato

Un JSON Schema descrive quali chiavi sono ammesse e di che tipo. Per Docker Compose esiste uno schema pubblico, mantenuto nel progetto `compose-spec`:

```bash
curl -fsSL -o compose-spec.json \
  https://raw.githubusercontent.com/compose-spec/compose-go/master/schema/compose-spec.json
```

Lo puoi usare con `check-jsonschema`:

```bash
pip install check-jsonschema
check-jsonschema --schemafile compose-spec.json compose.yaml
```

Output atteso:

```text
ok -- validation done
```

Se aggiungi `port: ["8080:8080"]` invece di `ports`, `check-jsonschema` non conosce `port` e ti segnala che quella chiave non è ammessa. È esattamente il tipo di errore che sfugge a un parser YAML.

In alternativa, nella maggior parte degli editor basta una riga di commento in testa al file:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/compose-spec/compose-go/master/schema/compose-spec.json
```

L'estensione YAML dell'editor legge la riga, scarica lo schema e ti mostra autocompletamento ed errori mentre scrivi. SchemaStore mantiene un catalogo pubblico degli stessi schemi per altri formati.

## Compose: leggere il file che il tool capisce

`docker compose config` legge il file, risolve variabili e merge, e stampa l'interpretazione finale:

```bash
docker compose -f compose.yaml config
```

Se sospetti un errore di indentazione, guarda il JSON e verifica dove è finita la chiave: `docker compose -f compose.yaml config --format json` (con `jq '.services'` per leggere meglio, se lo hai).

## Interpolazione: le variabili non sono YAML

La sintassi `${VARIABLES}` è **di Docker Compose**, non di YAML: se la scrivi in un file YAML e lo leggi con PyYAML, resta una stringa letterale. Compose la risolve da `.env`, dall'ambiente della shell e dal file `compose.yaml`. Punti da conoscere:

```yaml
services:
  api:
    image: "${IMAGE_TAG:-latest}"
    environment:
      DATABASE_URL: "postgres://app@db:5432/app"
      LOG_LEVEL: "${LOG_LEVEL:-info}"
```

- `"${VAR}"` sostituisce con stringa vuota se non definita;
- `"${VAR:-default}"` (e `"${VAR-default}"`) dà un valore di default;
- `"${VAR:?messaggio}"` fallisce con errore se non definita: è il modo corretto per le variabili obbligatorie;
- `$$` produce il carattere `$` letterale.

Usa il valore di default **solo** per cose non sensibili. Mai un default per un password: se manca, il deploy deve fallire, non partire con un segreto conosciuto.

Verifica il risultato:

```bash
LOG_LEVEL=debug docker compose config | grep -E 'LOG_LEVEL|image'
```

Se la shell non ha `LOG_LEVEL` e non esiste in `.env`, `image` sarà `esempio/api:latest`, e il file finale non ti dà indizi sulla provenienza del valore: per questo è utile tenerlo esplicito e documentato.

Attenzione: le variabili in `environment` sono a runtime, ma quelle usate nelle **chiavi** del file (per esempio in un nome servizio) vengono interpolate al parse: un nome vuoto può produrre un errore o un servizio con un identificatore inatteso.

## Esempio: da file ambiguo a file leggibile

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD:?DB_PASSWORD mancante}"
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  api:
    image: "esempio/api:${IMAGE_TAG:-1.0}"
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "10.0.0.5:8080:8080"
    environment:
      DATABASE_URL: "postgres://postgres:${DB_PASSWORD}@db:5432/postgres"

volumes:
  db-data:
```

Il file è già leggibile, ma il flusso di validazione è ciò che lo rende affidabile:

```bash
yamllint compose.yaml
check-jsonschema --schemafile compose-spec.json compose.yaml
DB_PASSWORD=test docker compose config -q
```

`config -q` stampa solo gli errori. Se `DB_PASSWORD` non è impostata, fallisce con un messaggio che ti indica la variabile mancante: meglio un errore chiaro al parse che un container con password vuota.

## Errori comuni

- **Confondere "YAML valido" con "Compose valido"**: un file ben indentato con chiavi sbagliate passa il parser e fallisce in produzione.
- **Indentazione che sposta chiavi**: `ports` sotto `image` o `environment` presente solo su un servizio.
- **Valori tipizzati male**: `port: 8080` invece di `ports: ["8080:8080"]`; Compose vuole stringhe per le porte mappate.
- **Default su segreti**: `"${DB_PASSWORD:-changeme}"` è un bug di sicurezza.
- **Chiavi top-level sconosciute**: chiavi di estensione vanno scritte con il prefisso `x-`.
- **Immagine non pinnata**: `postgres:latest` cambia tra un deploy e l'altro.

## In sintesi

Il ciclo di validazione è: `yamllint` (forma), `check-jsonschema` o schema nell'editor (struttura), `docker compose config` (interpretazione e variabili). Servono tutti e tre perché scoprono classi di errore diverse. Le variabili `${...}` sono un meccanismo di Compose, non di YAML, e i default non vanno mai usati per i segreti.

## Fonti

- [yamllint documentation](https://yamllint.readthedocs.io/en/stable/)
- [Docker Compose file reference](https://docs.docker.com/reference/compose-file/)
