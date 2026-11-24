Un'interfaccia a riga di comando è un contratto: il nome del programma, gli argomenti, la forma dei valori e il comportamento con input sbagliato. Chi scrive strumenti usati dentro script deve prenderlo sul serio, perché una CLI mal progettata non fallisce in modo visibile: permette di sbagliare senza accorgersene. Qui vediamo come un comando riceve parole dal sistema operativo, come si distingue un'opzione da un argomento e come si scrive un parser per forme brevi e lunghe.

## Obiettivi

- Descrivere il passaggio di argomenti dal processo chiamante al programma tramite `execve`.
- Distinguere opzioni brevi, lunghe, con valore, gruppi di flag e argomenti posizionali.
- Gestire `--`, valori che iniziano con `-` e opzioni ripetute.
- Scrivere un parser in bash con `getopts` e uno in JavaScript o TypeScript senza dipendenze.
- Riconoscere le convenzioni che rendono una CLI prevedibile per chi la usa.

## Come arriva un comando al programma

La shell non "esegue comandi": legge una riga, la spezza in parole secondo le sue regole (quoting, globbing, espansioni) e chiede al kernel di sostituire un processo con un programma, passandogli un array di stringhe. Il primo elemento è il nome del programma, gli altri sono argomenti. Il programma non vede mai la riga originale: virgolette e spazi sono già stati consumati.

```bash
printf '<%s>\n' uno "due tre" $USER
```

L'output mostra tre righe: la shell ha prodotto tre argomenti, uno con uno spazio. La tua CLI lavora su stringhe già normalizzate e non deve re-interpretare spazi interni: per questo la documentazione parla di "argomenti", non di "testo del comando".

```bash
# caso tipico: valori con spazio
mio-tool --file report finale.txt     # due argomenti dopo --file
mio-tool --file "report finale.txt"   # un solo argomento
```

Se un valore contiene spazi, è la shell che deve proteggerlo con le virgolette: il programma non può indovinare dove finisce il valore. Deve accettare un solo argomento, oppure dichiarare e documentare una lista.

## Anatomia degli argomenti

La terminologia non è formalizzata ovunque, ma le convenzioni sono stabili.

| Forma | Nome | Esempio |
| --- | --- | --- |
| `-v` | opzione breve, senza valore | `ls -l` |
| `-n 3` o `-n3` | opzione breve con valore | `head -n 3` |
| `--verbose` | opzione lunga, senza valore | `curl --verbose` |
| `--output=file` o `--output file` | opzione lunga con valore | `curl --output out.txt` |
| `-la` | gruppo di flag brevi | `ls -la` |
| `file.txt` | argomento posizionale | `wc -l file.txt` |
| `--` | termine delle opzioni | `rm -- -rf` |

Il `--` chiude la lista delle opzioni: dopo di lui tutto è posizionale. Serve quando un valore può iniziare con un trattino, come un file chiamato `-rf.txt`; senza, si ricorre alla forma `./-rf.txt`, che funziona ma è fragile.

```bash
touch -- -rf.txt
ls -- -rf.txt
rm -- -rf.txt
```

Solo le opzioni senza valore si possono accorpare: `-la` significa `-l -a`, mentre `-n3` è accettato da molti programmi ma non è universale. Le opzioni lunghe si abbinano al valore con `=` o con uno spazio: scegli una forma e documentala.

Il nome singolare o plurale, `--file` contro `--inputs`, dice se il valore è unico o ripetibile. Se un'opzione può comparire più volte, dichiara se prevale l'ultima o se i valori si accumulano.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://example.org
grep -ni -- '-rf' lista.txt
```

## Scrivere un parser in bash

`getopts` gestisce le opzioni brevi secondo POSIX. La stringa delle opzioni dichiara con `:` quali accettano un valore.

```bash
#!/usr/bin/env bash
set -euo pipefail

verbose=0
output=""
while getopts ':hvn:o:' opt; do
  case "$opt" in
    h) printf 'uso: %s [-v] [-n NUM] [-o FILE] INPUT...\n' "${0##*/}"; exit 0 ;;
    v) verbose=1 ;;
    n) numero="$OPTARG" ;;
    o) output="$OPTARG" ;;
    :) printf 'errore: -%s richiede un valore\n' "$OPTARG" >&2; exit 2 ;;
    \?) printf 'errore: opzione sconosciuta -%s\n' "$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
[ "$#" -gt 0 ] || { printf 'errore: manca INPUT\n' >&2; exit 2; }
printf 'input: %s\n' "$@"
```

Il `:` iniziale mette `getopts` in modalità silenziosa: gli errori li stampa il tuo script su stderr, con messaggi e exit code tuoi. `shift $((OPTIND - 1))` porta la posizione all'inizio degli argomenti non-opzione, che si leggono con `"$@"`.

`getopts` non supporta le opzioni lunghe. Implementale con un ciclo `while` esplicito o con una libreria: un parser scritto a mano ti lascia controllare i messaggi di errore, che sono parte dell'interfaccia.

```bash
[ "${1:-}" = "--" ] && shift
while [ "$#" -gt 0 ] && [ "${1#-}" != "$1" ]; do
  case "$1" in
    --help)     printf 'aiuto\n'; exit 0 ;;
    --output=*) output="${1#*=}"; shift ;;
    --output)   output="${2:?manca il valore di --output}"; shift 2 ;;
    --)         shift; break ;;
    *)          printf 'opzione sconosciuta: %s\n' "$1" >&2; exit 2 ;;
  esac
done
printf 'restano %s argomenti\n' "$#"
```

Il ciclo si ferma al primo argomento che non inizia con un trattino o al `--`, che consuma il separatore e lascia intatto il resto. `"${2:?...}"` fa fallire subito uno script con `set -u` quando manca il valore, invece di assegnare una variabile vuota.

## Design: prevedibilità prima dell'eleganza

Una buona CLI ha un nome coerente con il sostantivo che governa (`git remote add`, non `git addremote`), un solo idioma per comandi e opzioni, e un `--help` con gli esempi comuni. Il pattern "verbo-oggetto" di `git` funziona perché si estende senza rinominare.

Le scelte che rendono una CLI compatibile con gli script:

- input da argomenti per valori piccoli, da stdin per flussi;
- dati su stdout, messaggi su stderr;
- `--json` o un formato stabile per le automazioni, mai solo tabelle decorate;
- exit code distinti per uso errato (2) e guasto operativo (1);
- `--version` su una sola riga, parseable.

```bash
mio-tool --json | jq '.items | length'
mio-tool status || { printf 'fallito con %s\n' "$?"; exit 1; }
```

Un esempio concreto: una CLI `note-dir` con `--dir`, `--pattern`, una lista di file, `-h/--help`, `-V/--version` e `--` basta per un'esercitazione vera e per convincersi che i dettagli si decidono prima del codice.

## Errori comuni

- **Parseare `"$@"` senza virgolette**: gli argomenti con spazi vengono spezzati e la CLI riceve valori che l'utente non ha scritto.
- **Dimenticare `shift $((OPTIND - 1))`**: gli argomenti posizionali restano invisibili o sembrano opzioni.
- **Accettare valori ambigui (`-n 1 2`)**: meglio un errore esplicito che indovinare.
- **`--help` che esce con codice 1**: rompe gli script che verificano l'installazione.
- **Opzioni che tengono l'ultimo valore senza dirlo**: `--include a --include b` deve dire se sostituisce o accumula.

## In sintesi

- La shell spezza la riga e passa un array di stringhe: il programma non vede le virgolette.
- `-n 3`, `--output=file`, `-la` e `--` sono convenzioni che l'utente si aspetta.
- `getopts` gestisce le opzioni brevi; le lunghe richiedono un ciclo esplicito o una libreria.
- La CLI è un contratto per gli script: stdout dati, stderr messaggi, exit code e help stabile.

## Fonti

- `execve(2)`, il passaggio di argomenti al programma: https://man7.org/linux/man-pages/man2/execve.2.html
- `getopts(1p)`, specifica POSIX del parser delle opzioni: https://man7.org/linux/man-pages/man1/getopts.1p.html
- `getopt(3)`, opzioni brevi e lunghe a livello di libreria C: https://man7.org/linux/man-pages/man3/getopt.3.html
- `coreutils(1)`, convenzioni condivise dagli strumenti GNU: https://man7.org/linux/man-pages/man1/coreutils.1.html
