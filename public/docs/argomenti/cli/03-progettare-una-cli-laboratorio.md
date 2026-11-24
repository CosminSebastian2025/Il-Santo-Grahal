Progettare una CLI è un esercizio di previsione: le scelte dei primi dieci minuti determinano le domande che arrivano dopo. In questo laboratorio costruisci `note-dir`, che elenca i file di una directory filtrandoli per glob, con contratto, flussi, exit code e test. Non serve un framework: bastano argomenti ben definiti, un parser piccolo e la disciplina di separare dati e diagnosi.

## Obiettivi

- Scrivere il contratto di una CLI prima del codice.
- Implementare `note-dir` in bash con forme brevi normalizzate e `--`.
- Separare stdout, stderr e exit code in funzione dello script chiamante.
- Aggiungere `--help`, `--version` e `--json` come superfici stabili.
- Verificare il comportamento con test ripetibili.

## Il contratto prima del codice

Prima di una riga di codice si decide l'interfaccia. Ogni riga della tabella diventa un ramo del parser e un caso di test.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `note-dir [OPZIONI] DIRECTORY` | un solo argomento posizionale obbligatorio |
| `-d, --depth N` | intero >= 0, default 1 | errore se non numerico |
| `-p, --pattern G` | glob, default `*.md` | passata al filtro, non espansa dalla shell |
| `-j, --json` | flag | output machine-readable |
| `-h, --help` | esce 0 su stdout | installazione verificabile |
| `-V, --version` | una riga | versione semantica |
| exit 0 | lista completa | |
| exit 1 | directory inesistente o non leggibile | errore operativo |
| exit 2 | opzioni o argomenti invalidi | uso errato |

La distinzione tra 1 e 2 non è pedanteria: uno script può ritentare un errore operativo, non uno d'uso. Il `--pattern` non deve essere espanso dalla shell, altrimenti il comando dipende dalla directory corrente.

```bash
note-dir --depth 2 --pattern '*.txt' /srv/appunti
note-dir --json /srv/appunti | jq -r '.files[]'
note-dir -- --cartella-bizzarra
```

## Implementazione in bash

Il parser totale è breve: un ciclo normalizza le forme brevi (`-d 2`, `-d2`, `-j`) in quelle lunghe, un secondo ciclo gestisce `--nome` e `--nome=valore`, e `--` chiude la lista delle opzioni.

```bash
#!/usr/bin/env bash
set -euo pipefail
VERSIONE="0.1.0"
depth=1
pattern='*.md'
json=0

uso() {
  cat <<'EOF'
uso: note-dir [OPZIONI] DIRECTORY

Elenca i file di DIRECTORY che corrispondono a un glob.

Opzioni:
  -d, --depth N     profondita massima (default 1)
  -p, --pattern G   filtro glob (default *.md)
  -j, --json        output JSON su una riga
  -V, --version     stampa la versione ed esce
  -h, --help        stampa questo aiuto ed esce
EOF
  exit 0
}
errore() { printf 'note-dir: %s\n' "$*" >&2; exit 2; }

# normalizza le forme brevi con valore
args=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    -d) args+=(--depth); shift ;;
    -p) args+=(--pattern); shift ;;
    -d?*) args+=("--depth=${1#-d}"); shift ;;
    -p?*) args+=("--pattern=${1#-p}"); shift ;;
    -j) args+=(--json); shift ;;
    -V) args+=(--version); shift ;;
    -h) args+=(--help); shift ;;
    *) args+=("$1"); shift ;;
  esac
done
set -- "${args[@]+"${args[@]}"}"

posizionali=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)    uso ;;
    -V|--version) printf 'note-dir %s\n' "$VERSIONE"; exit 0 ;;
    -j|--json)    json=1; shift ;;
    --depth)      [ "$#" -ge 2 ] || errore "--depth richiede un valore"; depth="$2"; shift 2 ;;
    --depth=*)    depth="${1#*=}"; shift ;;
    --pattern)    [ "$#" -ge 2 ] || errore "--pattern richiede un valore"; pattern="$2"; shift 2 ;;
    --pattern=*)  pattern="${1#*=}"; shift ;;
    --)           shift; posizionali+=("$@"); break ;;
    -*)           errore "opzione sconosciuta: $1" ;;
    *)            posizionali+=("$1"); shift ;;
  esac
done

[[ "$depth" =~ ^[0-9]+$ ]] || errore "--depth deve essere un intero non negativo"
[ "${#posizionali[@]}" -eq 1 ] || errore "serve esattamente una DIRECTORY"
dir="${posizionali[0]}"
[ -d "$dir" ] || { printf 'note-dir: %s non è una directory\n' "$dir" >&2; exit 1; }
[ -r "$dir" ] || { printf 'note-dir: %s non è leggibile\n' "$dir" >&2; exit 1; }

mapfile -t file < <(find "$dir" -maxdepth "$depth" -type f -name "$pattern" -print | sort)

if [ "$json" -eq 1 ]; then
  printf '{"directory":"%s","count":%d,"files":[' "$dir" "${#file[@]}"
  for i in "${!file[@]}"; do
    [ "$i" -gt 0 ] && printf ','
    printf '"%s"' "${file[$i]}"
  done
  printf ']}\n'
else
  [ "${#file[@]}" -gt 0 ] && printf '%s\n' "${file[@]}"
fi
```

Il primo ciclo è un normalizzatore: converte `-d 2`, `-d2`, `-j` e così via nelle rispettive forme lunghe, azzerando la ripetizione dei rami. Il secondo ciclo gestisce solo le opzioni lunghe, e questo rende il codice lineare per un lettore che deve modificarlo dopo. `set -- "${args[@]+"${args[@]}"}"` imposta gli argomenti senza far fallire lo script con `set -u` quando l'array è vuoto.

Tre scelte meritano attenzione. `mapfile` con process substitution evita la subshell e permette di contare i risultati. Nessun risultato non è un errore, come per `ls`, quindi l'exit code resta 0. Il JSON è assemblato a mano per leggibilità: con percorsi contenenti virgolette servirebbe un encoder, ed è il primo limite da annotare.

```bash
cd /tmp && note-dir "$PWD" --depth 1
printf '%s\n' "nota" > /tmp/a.md
note-dir /tmp | head -3
note-dir /tmp --depth x; printf 'exit: %s\n' "$?"
```

## UX, versioning e test

La UX si gioca su dettagli piccoli: errori che dicono cosa fare e non solo cosa è rotto; stringa d'uso ripetuta negli errori d'uso; nessun output decorativo quando stdout non è un terminale.

```bash
[ -t 1 ] && colore=1 || colore=0
```

Con `0.1.0` il contratto può cambiare; dopo la pubblicazione, rimuovere un'opzione è incompatibile. `--json` è compatibile solo se il formato resta stabile: documenta i campi e non rinominarli.

I test più utili sono quelli che si copiano in una riga: un file `test-note-dir.sh` con pochi assert copre l'80% del valore.

```bash
set -euo pipefail
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf 'x\n' > "$tmp/uno.md"; printf 'y\n' > "$tmp/due.txt"; mkdir -p "$tmp/sub"; printf 'z\n' > "$tmp/sub/tre.md"

./note-dir "$tmp" | grep -qx "$tmp/uno.md"
./note-dir "$tmp" --depth 2 | grep -qx "$tmp/sub/tre.md"
./note-dir "$tmp" -p '*.txt' | grep -qx "$tmp/due.txt"
./note-dir "$tmp" --json | grep -q '"count":2'
if ./note-dir "$tmp" --depth nope >/dev/null 2>&1; then exit 1; fi
if ./note-dir /non/esiste >/dev/null 2>&1; then exit 1; fi
printf 'tutti i test passano\n'
```

Copia gli stessi test nel README in forma "tutto in una riga", così il comportamento si riproduce con un incolla.

## Esercizi

1. Aggiungi un'opzione `-n, --long` che non modifica l'output ma lo verifica; in quale dei due cicli del parser intervieni, e perché?
2. Gestisci il caso in cui `--pattern` sia una stringa vuota: quale comportamento è coerente con il contratto?
3. Fai in modo che `note-dir` accetti anche l'input da stdin con `--stdin`, leggendo un percorso per riga. Quali exit code usa?
4. Implementa `--json` correttamente con percorsi che contengono virgolette e barra rovesciata.
5. Aggiungi un'opzione `--strict` che esce con 1 se non trova file, mantenendo il default `0`.
6. Scrivi un test che verifichi che gli errori vadano su stderr e che stdout resti vuoto.

<details>
<summary>Soluzione</summary>

1. Nel ciclo di normalizzazione aggiungi `-n) args+=(--long); shift ;;`, nel secondo `-n|--long) long=1; shift ;;`: i due cicli hanno responsabilità separate, la normalizzazione traduce soltanto.

2. `--pattern=""` non deve significare "tutti i file": rifiutalo con exit 2, perché `find -name ""` non restituisce nulla e il silenzio confonderebbe.

3. Legge un percorso per riga con `while IFS= read -r riga` ed esce 0 al termine; se un percorso non esiste esce con 1 ma continua sugli altri, salvo `--fail-fast`.

4. Sostituisce prima `\` e `"` con le sequenze escape: `esc="${p//\\/\\\\}"; esc="${esc//\"/\\\"}"`. Oltre pochi caratteri, meglio un encoder JSON.

5. Con `strict=0` di default: dopo aver raccolto `file`, se `strict` vale 1 e `"${#file[@]}"` è 0 esce con 1 senza scrivere su stdout, perché `find` e `ls` considerano il vuoto legittimo.

6. Redirige stdout e stderr su due file temporanei, esegue `./note-dir /non/esiste || true`, verifica che stdout abbia zero byte, che stderr contenga `non è una directory` e che `$?` valga 1.

</details>

## Errori comuni

- **Aggiungere opzioni senza aggiornare il contratto**: i test coprono solo ciò che ricordi.
- **Espandere `--pattern` nella shell**: il risultato dipende dalla directory corrente.
- **Validare dopo aver già stampato risultati**: l'output parziale rende impossibile distinguere successo e fallimento.
- **JSON costruito con `sed` e percorsi arbitrari**: virgolette e barra rovesciata rompono il formato.
- **Nessun test sul caso "nessun risultato"**: la differenza tra 0 e 1 va decisa prima.

## In sintesi

- Il contratto (forma, opzioni, exit code) si scrive prima del codice e si verifica con test.
- Un parser esplicito con `--` è più leggibile di un framework quando le opzioni sono poche.
- 0 per successo anche senza risultati, 1 per errori operativi, 2 per uso errato.
- `--json`, help e version sono superfici stabili da documentare e proteggere con test.

## Fonti

- `getopts(1p)`, opzioni brevi secondo POSIX: https://man7.org/linux/man-pages/man1/getopts.1p.html
- Posix Utility Conventions, capitolo 12 della base specification: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html
- `xargs(1)`, separazione robusta degli elenchi di file: https://man7.org/linux/man-pages/man1/xargs.1.html
- `mktemp(1)`, directory temporanee sicure per i test: https://man7.org/linux/man-pages/man1/mktemp.1.html
