YAML è un formato di serializzazione leggibile pensato per configurazioni e dati strutturati: si usa per file di CI, Docker Compose, Kubernetes e molti tool. La sintassi è piccola, ma le regole sull'indentazione e sui tipi impliciti generano errori che sembrano misteriosi. In questa lezione impari la struttura di base e le trappole che rendono un file YAML "valido ma sbagliato".

## Obiettivi

- Scrivere scalari, mappe, liste e strutture annidate con la giusta indentazione.
- Capire i tipi impliciti e il "Norway problem".
- Quotare stringhe quando serve, e sapere perché.
- Usare le forme di blocco per testi lunghi.
- Riconoscere gli errori più frequenti dei parser.

## Regole di base

- YAML è **sensibile all'indentazione**, e l'indentazione si fa **solo con spazi**: un tab produce un errore di parsing.
- Un file YAML non deve iniziare con `---`, ma può (lo usano i documenti multipli).
- I commenti iniziano con `#` e vanno su una linea intera o dopo uno spazio.
- I due caratteri `:` e `-` che iniziano un valore hanno significato strutturale: se devi metterli in una stringa, quota la stringa.

## Scalari, mappe e liste

Una mappa (mapping) ha coppie chiave-valore:

```yaml
nome: biblioteca
versione: "1.0"
autore: team docs
```

Una lista (sequence) ha item preceduti da `-`:

```yaml
linguaggi:
  - python
  - rust
  - go
```

Liste di mappe:

```yaml
servizi:
  - name: api
    port: 8080
  - name: web
    port: 3000
```

Nell'esempio, sia `name` che `port` sono allineati sotto il primo item: allineare `port` con il trattino ne cambierebbe il significato (diventerebbe una nuova mappa, non un campo dell'item).

## Tipi impliciti: il Norway problem

YAML 1.2 risolve i tipi in base al formato del valore. `porta: 8080` è un intero, `attivo: true` è un booleano, `data: 2024-05-01` è una data (o una stringa, dipende dall'implementazione del tag!).

Il caso classico è:

```yaml
paese: NO
```

In YAML 1.1 questo è il booleano `false` (perché `no` è un booleano); in YAML 1.2 il nucleo non include `no`, ma molti parser trattano ancora come booleani `on`, `off`, `yes`, `no`, `y`, `n`. Non fidarti della versione dichiarata: verifica con il parser che userai davvero.

Regola pratica: **quota** i valori che possono sembrare booleani o numeri:

```yaml
paese: "NO"
codice_fiscale: "01234567890"   # senza virgolette sarebbe un int con leading zero
```

Altri casi da conoscere:

- `versione: 1.0` → float; se serve la stringa `"1.0"`, quota.
- `versione: 1.10` → float `1.1`, la virgola finale scompare.
- `zona: 075` → in alcuni parser è un intero in base ottale, in altri è un int decimale.
- `null`, `~`, e il valore vuoto sono `null`.

## Documenti multipli

Un file può contenere più documenti separati da `---`, ognuno indipendente; `...` termina un documento. I tool leggono di solito il primo documento oppure iterano con un'API specifica (`yaml.safe_load_all` in PyYAML). Un esempio con due documenti:

- **virgolette doppie** permettono escape come `\n`, `\t`, `\"`;
- **virgolette singole** sono letterali, salvo `''` per una singola virgoletta;
- **plain scalars** (senza quotature) leggono `: `, ` #` e i caratteri nell'inizio del valore come sintassi: quando il valore contiene questi pattern, quota.

```yaml
messaggio: "Attenzione: la chiave contiene: due punti"
nota: 'Non usare "doppie" senza motivo'
```

## Blocchi di testo multilinea

Due indicatori di blocco:

```yaml
descrizione: |
  Questa è una riga.
  Questa è la seconda riga.

comando: >
  apt-get update &&
  apt-get install -y curl
```

- `|` preserva i newline (literal block);
- `>` li fonde in spazi (folded block);
- `|-` e `>-` rimuovono il newline finale;
- `|+` mantiene anche i newline finali.

## Documenti multipli

Un file può contenere più documenti separati da `---`, ognuno indipendente; `...` termina un documento. Un esempio con due documenti:

```yaml
---
kind: ConfigMap
metadata:
  name: primo
---
kind: ConfigMap
metadata:
  name: secondo
```

## Esempio realistico

```yaml
# Configurazione di un servizio interno
servizio:
  nome: api-catalogo
  porta: 8080
  ambiente: "produzione"
  abilitato: true
  paesi_abilitati:
    - "IT"
    - "NO"          # senza virgolette potrebbe diventare false
  limiti:
    max_connessioni: 100
    timeout_secondi: 30
```

## Errori comuni

- **Tab al posto degli spazi**: `found character that cannot start any token` o simili.
- **Indentazione incoerente** tra le chiavi dello stesso livello.
- **`chiave:valore` senza spazio** dopo i due punti: non è una mappa, è una stringa.
- **URL come plain scalar** (`url: http://esempio.org:8080`): in certi contesti il parser interpreta `: ` come separatore. Quota quando hai dubbi.
- **Valori "stringa" che diventano booleani o numeri** (Norway problem).
- **Duplicare una chiave**: lo standard YAML non lo vieta in modo esplicito in tutti i modi, ma molti parser sovrascrivono silenziosamente e perderai la prima.
- **Liste scritte come `-nome`** senza spazio dopo il trattino: non sono liste.

## In sintesi

YAML è semplice se rispetti tre regole: spazi, non tab; allinea con attenzione; quota ciò che è ambiguo. Ricorda che `NO`, `on`, `1.0` e i numeri con zeri iniziali non sono stringhe, a meno che non lo dichiari tu. Padroneggiare indentazione e quotatura elimina la maggior parte dei bug nei file di configurazione.

## Fonti

- [YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/)
- [YAML 1.2.2 – Indentation Spaces](https://yaml.org/spec/1.2.2/#61-indentation-spaces)
