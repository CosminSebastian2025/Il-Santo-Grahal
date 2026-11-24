Uno strumento da riga di comando comunica con l'ambiente in tre modi: i flussi standard, l'exit code e il testo di aiuto. Gli exit code rendono la CLI usabile dentro uno script, le pipe compongono strumenti piccoli, e `--help`/`--version` sono il primo comando che utenti e automazioni interrogano. Questa lezione collega i tre elementi con le trappole che fanno mentire una pipeline.

## Obiettivi

- Distinguere stdin, stdout e stderr e sapere cosa deve finire in ciascuno.
- Progettare una scala di exit code coerente con le convenzioni POSIX e con gli strumenti comuni.
- Usare pipe e `xargs` senza rompere i valori con spazi o newline.
- Scrivere `--help` e `--version` che funzionano sia per una persona sia per uno script.
- Gestire l'esito di una pipeline e di un comando esterno dentro il proprio programma.

## Tre flussi, tre responsabilità

Ogni processo eredita tre file descriptor: `0` stdin, `1` stdout, `2` stderr. La divisione non è estetica: stdout è il canale dei dati, stderr è il canale delle diagnosi. Se mescoli avvisi e dati, chi legge la tua CLI con una pipe trova le righe di log nella lista di risultati.

```bash
mio-tool lista > risultati.txt 2> errori.txt
mio-tool lista 2>/dev/null | wc -l   # conta solo i dati
```

Un programma deve comportarsi bene sia in modo interattivo (stdout su terminale) sia non interattivo (stdout su file o pipe). Quando stdout non è un TTY, disattiva colori e barre di progresso, a meno che l'utente li forzi.

```bash
sed -i 's/foo/bar/' lista.txt          # dati su file esplicito
mio-tool --json | jq -r '.[].nome' | sort -u
```

Se lo strumento legge da stdin, dichiaralo: `cat file | mio-filtro` e `mio-filtro < file` devono funzionare, e `-` come nome di file può significare stdin, come in `cat`, `grep` e `tar`.

```bash
mio-filtro < input.txt
cat input.txt | mio-filtro -
```

Attenzione al buffering: scrivendo prima su stdout (a blocchi quando non è un TTY) e poi su stderr, l'utente può vedere i messaggi fuori ordine.

## Exit code: il vero output per gli script

Un programma termina con un numero tra 0 e 255. Zero significa successo; ogni altro valore indica un problema, e conviene distinguere le cause.

| Codice | Significato tipico | Esempio |
| --- | --- | --- |
| `0` | successo | `cmd && cmd2` |
| `1` | errore generico o esito negativo legittimo | `grep` senza corrispondenze |
| `2` | uso errato: opzioni o argomenti non validi | `ls --sconosciuta` |
| `126` | comando trovato ma non eseguibile | permessi mancanti |
| `127` | comando non trovato | programma non installato |
| `128+n` | terminato dal segnale n | `130` = Ctrl+C (`SIGINT`) |

Lo zero va riservato al successo pieno. Un comando che stampa un avviso ma completa il lavoro può uscire con 0; uno che non ha fatto quanto richiesto no. `set -e` dipende da questo contratto: un guasto mascherato da successo fa continuare un processo che dovrebbe fermarsi.

```bash
if mio-tool build --out dist; then
  printf 'build ok\n'
else
  cod=$?
  case $cod in
    2) printf 'argomenti non validi\n' >&2 ;;
    *) printf 'build fallita (%s)\n' "$cod" >&2 ;;
  esac
  exit "$cod"
fi
```

Un dettaglio che sorprende: `grep` esce con 1 quando non trova nulla, e *è* il comportamento corretto. Con `-e` va gestito: `grep -q pattern file || true` oppure un `if`.

## Pipeline e xargs senza sorprese

La pipe collega lo stdout di un processo allo stdin del successivo, in parallelo. Senza `pipefail` l'exit code della pipeline è quello dell'ultimo comando: un errore a monte può sparire.

```bash
false | head -1; printf 'senza pipefail: %s\n' "$?"
set -o pipefail
false | head -1; printf 'con pipefail: %s\n' "$?"
```

Senza `pipefail` il primo `printf` stampa `0`: `head` è andato a buon fine, quindi la pipeline risulta riuscita. Con `pipefail` ottieni `1`, l'ultimo codice non zero.

```bash
printf '%s\n' bash sh bash sort sort sort uniq | sort | uniq -c | sort -rn | head -3
grep -c '^ERROR' servizio.log | xargs -I{} printf 'errori: {}\n'
```

La prima pipeline conta e ordina: `printf` produce le righe, `sort` le raggruppa, `uniq -c` le conta, il secondo `sort` porta in testa i conteggi alti. Con qualunque produttore di testo ottieni lo stesso schema, perché ogni pezzo è indipendente.

Per costruire argomenti, `xargs` è comodo ma interpreta spazi e apici. Le forme robuste sono `-0` con un produttore che separa con NUL, o `-d '\n'` se i nomi non contengono newline.

```bash
find . -name '*.log' -print0 | xargs -0 wc -l
find . -name '*.md' -print0 | xargs -0 -n1 basename
```

Per leggere l'esito di un comando esterno, distingui output e codice: catturando solo stdout con `$(...)` perdi stderr e l'exit code.

```bash
# in bash
if out=$(mio-tool status 2>&1); then
  printf 'stato: %s\n' "$out"
else
  printf 'errore: %s\n' "$out" >&2
fi
```

```javascript
import { spawnSync } from "node:child_process";

const res = spawnSync("mio-tool", ["status"], { encoding: "utf8" });
if (res.error) {
  console.error("strumento non avviato:", res.error.code);
  process.exit(127);
}
if (res.status !== 0) {
  console.error(res.stderr.trim());
  process.exit(res.status ?? 1);
}
console.log(res.stdout.trim());
```

`spawnSync` restituisce `status` null se il processo è stato terminato da un segnale: esci con un codice derivato dal segnale o con un errore documentato.

## Help e version: la porta d'ingresso

`--help` deve uscire con `0`, stampare su stdout e stare entro una schermata o due: forma d'uso, opzioni raggruppate per scopo, almeno due esempi. `-h` non è universale: in `curl` è l'header HTTP, quindi se lo usi per l'aiuto dichiaralo.

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSIONE="1.2.0"

case "${1:-}" in
  -h|--help)
    cat <<'EOF'
uso: note-dir [OPZIONI] DIRECTORY

Elenca i file Markdown di una directory e ne stampa il titolo.
I risultati vanno su stdout, gli avvisi su stderr.

Opzioni:
  -d, --depth N     profondita massima (default: 1)
  -p, --pattern G   filtro glob (default: *.md)
  -V, --version     stampa la versione ed esce
  -h, --help        stampa questo aiuto ed esce

Esempi:
  note-dir --depth 2 docs
  note-dir -p '*.txt' /srv/appunti | sort
EOF
    exit 0 ;;
  -V|--version)
    printf 'note-dir %s\n' "$VERSIONE"
    exit 0 ;;
  --)
    shift ;;
esac
```

`--version` è il testo che le automazioni leggono: una riga con nome e numero semantico, senza banner. Se usi una libreria di parsing, verifica che `--help` e `--version` non richiedano gli argomenti obbligatori: è un errore che rende la CLI inutilizzabile proprio quando serve capirla.

## Errori comuni

- **`--help` su stderr con exit 1**: gli script che verificano l'installazione falliscono.
- **Messaggi di log su stdout**: la pipe li mescola ai dati e il parsing a valle è falsato.
- **Exit code sempre 0**: un errore silenzioso in una pipeline di build o deploy.
- **`xargs` senza `-0`**: nomi con spazi o apici diventano argomenti diversi.
- **Pipeline senza `pipefail`**: l'errore del primo comando è sostituito dallo 0 dell'ultimo.

## In sintesi

- stdout per i dati, stderr per le diagnosi, stdin per l'input.
- Gli exit code sono un'interfaccia: 0 per successo, 2 per uso errato, 126/127 per l'esecuzione, 128+n per i segnali.
- `pipefail` e `xargs -0` evitano le due bugie più comuni delle pipeline.
- `--help` e `--version` sono il contratto minimo: stdout e exit 0.

## Fonti

- `sh(1p)`, specifica POSIX della shell e degli exit status: https://man7.org/linux/man-pages/man1/sh.1p.html
- `xargs(1)`, opzioni `-0` e `-d` con i relativi avvertimenti: https://man7.org/linux/man-pages/man1/xargs.1.html
- `tee(1)`, come dividere un flusso mantenendo stdout: https://man7.org/linux/man-pages/man1/tee.1.html
- Posix Utility Conventions, capitolo 12 della base specification: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html