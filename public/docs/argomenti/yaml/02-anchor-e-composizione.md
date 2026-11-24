Un file YAML diventa difficile da gestire quando le configurazioni ripetono gli stessi blocchi: environment, healthcheck, volumi, header. YAML offre anchor (`&`), alias (`*`) e merge key (`<<`) per riutilizzare parti di documento senza copiare e incollare. Sono strumenti potenti ma con regole precise, e i parser non li interpretano tutti allo stesso modo. Qui impari a usarli bene e a riconoscere quando è meglio non usarli.

## Obiettivi

- Definire un anchor e richiamarlo con un alias.
- Usare il merge key `<<` per ereditare una mappa.
- Sapere quando l'alias duplica o condivide un valore.
- Leggere file con documenti multipli.
- Evitare gli abusi che rendono il YAML illeggibile.

## Anchor e alias

Un anchor è un'etichetta che si assegna a un nodo (`&nome`), un alias lo richiama (`*nome`):

```yaml
defaults: &defaults
  retries: 3
  timeout: 30

servizio_a:
  retries: 5
  timeout: *defaults   # NO: *defaults punta alla mappa intera
```

L'esempio sopra è sbagliato: `*defaults` è la **mappa intera**, non il campo `timeout`. Per riusare un valore scalare l'anchor deve stare sul valore:

```yaml
timeout: &timeout_default 30

servizio_a:
  timeout: *timeout_default
servizio_b:
  timeout: *timeout_default
```

Un anchor deve essere unico nel documento: due anchor con lo stesso nome sono un errore. Con PyYAML ottieni per esempio `found duplicate anchor 'x'; first occurrence`, e il file non viene caricato affatto.

## Il merge key

La merge key `<<` copia i campi di una o più mappe dentro la mappa corrente:

```yaml
x-logging: &default-logging
  options:
    max-size: "10m"
    max-file: "3"
  driver: json-file

services:
  api:
    image: esempio/api:1.0
    logging: *default-logging

  worker:
    image: esempio/worker:1.0
    logging:
      <<: *default-logging
      driver: local       # sovrascrive il driver
```

Regole del merge:

- `<<` accetta una mappa o una lista di mappe (in ordine di priorità);
- le chiavi esplicitamente scritte nel nodo vincono sulla mappa mergiata.

Il merge key è una funzione di YAML 1.1 (`<<`), non del core di YAML 1.2: è supportata da molti parser e da Docker Compose, ma non è obbligatoria nello standard 1.2.2. Non usarla se il tuo tool non la documenta (è descritta su [yaml.org – Merge Key](https://yaml.org/type/merge.html)).

## Alias: condivisione o copia?

Nella maggior parte dei parser l'alias **non crea una copia indipendente**: crea un riferimento allo stesso nodo. Se il tuo codice modifica quel nodo in memoria, gli effetti si propagano a tutte le strutture che lo referenziano; per trasformazioni a runtime è meglio clonare la struttura dopo averla letta. Anche i riferimenti circolari (un anchor che punta a se stesso) vengono rifiutati dai parser: non crearli.

## Documenti multipli

Un file può contenere più documenti separati da `---`. Non c'è ereditarietà tra documenti: anchor e alias **non** attraversano il separatore.

```yaml
---
kind: ConfigMap
data:
  chiave: valore
---
kind: ConfigMap
data:
  chiave: altro
```

Con PyYAML si legge tutto con `yaml.safe_load_all(stream)`, non con `safe_load`, che restituisce solo il primo documento.

## Composizione senza esagerare

I file Compose moderni usano spesso `x-` come prefisso per chiavi "personali" ignorate o riconosciute come estensione:

```yaml
x-app-defaults: &app-defaults
  restart: unless-stopped
  stop_grace_period: 10s

services:
  api:
    <<: *app-defaults
    image: esempio/api:1.0
  worker:
    <<: *app-defaults
    image: esempio/worker:1.0
```

Questo è leggibile. Diventa il contrario quando:

- ci sono più livelli di merge annidati per ereditarietà di "categorie";
- un alias riutilizza una mappa enorme che include chiavi non pertinenti;
- l'ordine in cui le mappe di una lista di merge vengono applicate è ambiguo;
- il file è generato da un template e nessuno sa più da dove viene un valore.

Alternativa robusta a YAML anchor: **template di configurazione** (Helm, Kustomize, Jinja) o un parametro unico esplicito (`APP_TIMEOUT`) invece di 30 valori identici.

## Esempio completo e verifica

```yaml
x-healthcheck: &healthcheck
  interval: 30s
  timeout: 5s
  retries: 3

services:
  api:
    image: esempio/api:1.0
    healthcheck:
      <<: *healthcheck
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

Verifica con PyYAML che il merge abbia funzionato:

```bash
python -c "import yaml; d=yaml.safe_load(open('compose.yaml')); print(d['services']['api']['healthcheck'])"
```

Output atteso (i tre campi base più `test`):

```text
{'interval': '30s', 'timeout': '5s', 'retries': 3, 'test': [...]}
```

Nota che `interval` e `timeout` sono stringhe (`'30s'` non è un numero), mentre `retries` è un intero.

## Errori comuni

- **Mettere l'anchor sul nodo sbagliato**: `chiave: &x valore` ancora il valore, non l'intera mappa; verifica con il parser.
- **Usare `*x` dove serve un valore scalare** (l'esempio iniziale).
- **Presumere che `<<` funzioni ovunque**: in alcuni parser YAML rigorosi `<<` è una chiave normale con valore mappa.
- **Anchor duplicati nel documento**.
- **Alias usati come item di lista** (`- *anchor`) quando serviva una mappa.
- **Rendere il composto illeggibile**: pochi anchor, nomi chiari, mai a cascata.

## In sintesi

Anchor e alias riusano nodi; il merge key `<<` eredita i campi di mappe, con priorità alle chiavi esplicite. Funzionano bene per blocchi piccoli e stabili (healthcheck, logging, restart policy). Non attraversano i documenti multipli, non sono obbligatori in YAML 1.2 e vanno fermati quando l'ereditarietà diventa un labirinto.

## Fonti

- [yaml.org – Merge Key Language-Independent Type](https://yaml.org/type/merge.html)
- [Docker Compose file reference](https://docs.docker.com/reference/compose-file/)
