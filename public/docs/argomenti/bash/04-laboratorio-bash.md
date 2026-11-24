Uno script "robusto" non è quello con più righe: è quello che fallisce in modo chiaro, non agisce su percorsi sbagliati e non interpreta i dati come codice. Questo laboratorio parte da una base sicura, poi ti fa riparare script vulnerabili a quoting e glob e chiudere con un test riproducibile e `shellcheck`. Ogni esercizio lavora in una directory temporanea: nessun comando tocca file fuori da lì.

## Obiettivi

- Scrivere un'impalcatura con `set -euo pipefail`, `IFS` e una trap.
- Smettere di leggere elenchi con `for f in $lista` e passare a formati sicuri.
- Gestire file i cui nomi iniziano con `-`, contengono spazi o newline.
- Restituire exit code coerenti e distinguere errore d'uso da errore operativo.
- Diagnosticare con `shellcheck` e `bash -x`.

## Preparazione

```bash
mkdir -p /tmp/bash-lab && cd /tmp/bash-lab
bash --version | head -1
command -v shellcheck || echo "shellcheck non installato"
```

Se `shellcheck` non c'è, installalo con il tuo package manager (`sudo apt install shellcheck`, `brew install shellcheck`) o scaricalo dal sito ufficiale. Su Windows puoi eseguire tutto in WSL o Git Bash, adattando `/tmp`.

## L'impalcatura

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

main() {
  local dir=${1:-}
  [[ -n $dir ]] || { printf 'uso: %s <directory>\n' "${0##*/}" >&2; exit 2; }
  [[ -d $dir ]] || { printf 'non è una directory: %q\n' "$dir" >&2; exit 1; }
  printf 'ok: %s\n' "$dir"
}

main "$@"
```

Perché funziona: `-e` interrompe al primo comando fallito, `-u` segnala le variabili non impostate, `pipefail` propaga l'errore di una pipeline, `IFS` evita di spaccare i campi su spazi, `main "$@"` mantiene gli argomenti intatti. L'exit 2 per l'uso e 1 per l'errore operativo rende i chiamanti in grado di distinguere i due casi.

## Esercizi

### 1. Elenco di file con spazi e caratteri strani

Crea i file e prova due cicli.

```bash
cd /tmp/bash-lab
touch -- "report finale.txt" "-rf.txt" $'riga\nspezzata.txt'
ls -b

lisTA=$(ls)
for f in $lisTA; do printf 'ciclo 1: [%s]\n' "$f"; done

shopt -s nullglob
for f in ./*.txt; do printf 'ciclo 2: [%s]\n' "$f"; done
```

**Domande:** quanti elementi vede il primo ciclo? Perché `./` aiuta? Che cosa cambia con `nullglob`?

<details>
<summary>Soluzione commentata</summary>

`$(ls)` restituisce una stringa; `$lisTA` non quotato viene spezzato sugli spazi e sui newline, quindi "report finale.txt" diventa due parole e il file con newline diventa due nomi. `./*.txt` viene globbato dalla shell *dopo* il parsing e produce una parola per file, con `./` che impedisce a nomi come `-rf.txt` di essere letti come opzioni. `nullglob` evita che un pattern senza corrispondenze resti letterale. La regola: elenchi di file si fanno espandendo un glob, non una stringa.

</details>

### 2. Da `for` a `while read -r` e a `find -print0`

```bash
cd /tmp/bash-lab
printf '%s\n' "report finale.txt" "-rf.txt" > lista.txt
while IFS= read -r nome; do
  [[ -e $nome ]] && printf 'esiste: %q\n' "$nome"
done < lista.txt
```

Ora un elenco di percorsi potenzialmente con newline:

```bash
find . -maxdepth 1 -name '*.txt' -print0 | while IFS= read -r -d '' p; do
  printf 'trovato: %q\n' "$p"
done
```

**Domande:** che differenza fa `IFS=`? Perché usare `-d ''` con `find -print0`? Il ciclo dopo la pipe modifica variabili nello script principale?

<details>
<summary>Soluzione commentata</summary>

`IFS=` evita di togliere gli spazi in testa e in coda al nome. `find -print0` separa con NUL, l'unico byte che non può comparire in un nome; `read -d ''` usa NUL come delimitatore. Il ciclo a destra di `pipefail` gira in una subshell: per modificare conteggi nello script usa `while ...; done < <(find ...)` (process substitution) o un file temporaneo.

</details>

### 3. Script con trappola, temporanea e conteggio

Scrivi `/tmp/bash-lab/conta.sh`: conti i file `.txt`, li salvi in un elenco ordinato e lasci una trap che pulisce.

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

dir=${1:?uso: conta.sh <directory>}
tmp=$(mktemp) || exit 1
trap 'rm -f -- "$tmp"' EXIT

find -- "$dir" -maxdepth 1 -type f -name '*.txt' -print0 | sort -z |
while IFS= read -r -d '' f; do
  printf '%s\n' "$f" >> "$tmp"
done

printf 'file trovati: %d\n' "$(grep -c '^' -- "$tmp" || true)"
head -n 3 -- "$tmp"
```

```bash
chmod +x conta.sh && ./conta.sh /tmp/bash-lab
echo "exit: $?"
./conta.sh /non/esiste; echo "exit: $?"
```

**Domande:** che cosa fa `find --`? Perché `mktemp` invece di un nome fisso? Che exit code ottieni su directory inesistente?

<details>
<summary>Soluzione commentata</summary>

`find --` termina le opzioni, così una directory che inizia con `-` non viene interpretata come flag. `mktemp` crea un nome imprevedibile: una variante fissa in `/tmp` è un bersaglio symlink. `find` su una directory inesistente esce con 1 e, con `pipefail`, la pipeline intera fallisce: lo script termina senza stampare esiti falsi. Il conteggio avviene *dopo* il ciclo perché la parte destra della pipe gira in una subshell; `grep -c` conta le righe e `|| true` gestisce il caso di file vuoto.

</details>

### 4. Opzioni, validazione e quoting

Aggiungi a `conta.sh` un'opzione `-e estensione` e un `--dry-run`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ext=txt; dry=0; dir=
while getopts ':e:n' opt; do
  case $opt in
    e) ext=$OPTARG ;;
    n) dry=1 ;;
    \?) printf 'opzione non valida: -%s\n' "$OPTARG" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))
dir=${1:?uso: conta.sh [-e ext] [-n] <directory>}

pattern="*.$ext"
files=$(find -- "$dir" -maxdepth 1 -type f -name "$pattern" -print -quit)
[[ -n $files ]] || { printf 'nessun file *%s in %q\n' ".$ext" "$dir" >&2; exit 1; }
if (( dry )); then
  printf 'dry-run: userebbe %q in %q\n' "$pattern" "$dir"
fi
```

**Domande:** perché il `:` iniziale in `':e:n'`? Perché `-name "$pattern"` e non `-name *.$ext`? Che cosa succede con `-e txt` e una directory vuota?

<details>
<summary>Soluzione commentata</summary>

Il `:` iniziale mette `getopts` in modalità silenziosa: l'errore lo stampi tu e `OPTARG` contiene l'opzione non valida (`-x`), invece del messaggio automatico "illegal option" e di un `OPTARG` vuoto che con `-u` farebbe fallire lo script nel `case`. Senza virgolette, `*.$ext` viene globbato dalla shell usando i file della directory corrente; quotato, arriva a `find` intatto e lì diventa un pattern. Su directory vuota lo script esce con 1 e un messaggio su stderr, distinguibile da un errore d'uso (2).

</details>

### 5. Catturare segnali e chiudere pulito

```bash
#!/usr/bin/env bash
set -euo pipefail
trap 'printf "interrotto, pulisco\n" >&2; exit 130' INT TERM
i=0
while sleep 1; do
  i=$((i + 1))
  printf 'tick %d\n' "$i"
done
```

Lancialo e premi `Ctrl+C`: il messaggio di trap compare prima dell'uscita.

**Domande:** perché `exit 130`? Che differenza ha intercettare `TERM` in un container?

<details>
<summary>Soluzione commentata</summary>

130 è 128+SIGINT(2), la convenzione per "terminato da Ctrl+C". 143 corrisponde a 128+SIGTERM. In un container la trap e `exec` permettono al processo di ricevere il segnale in tempi rapidi e chiudere connessioni o file; per questo gli entrypoint robusti usano `exec "$@"` invece di avviare il processo come figlio intermedio.

</details>

### 6. shellcheck e bash -x su codice sbagliato

```bash
cd /tmp/bash-lab
cat > rotto.sh <<'EOF'
#!/usr/bin/env bash
file=$1
if [ $file = "" ]; then echo vuoto; fi
for f in $(cat lista.txt); do
  echo $f
done
EOF
shellcheck rotto.sh || true
bash -x rotto.sh "report finale.txt" 2>&1 | head -12
```

**Domande:** quali codici `SCxxxx` compaiono? Quale riga si rompe con un nome con spazi, e perché `bash -x` lo fa vedere?

<details>
<summary>Soluzione commentata</summary>

`shellcheck` segnala almeno `SC2086` (espansioni senza virgolette) e `SC2046` (sostituzione di comando dentro `for`). `bash -x` mostra `+ '[' report finale.txt = '' ']'` seguito da `[: too many arguments`: la condizione ha ricevuto troppe parole e l'errore è diverso da quello previsto. Poi il ciclo stampa un `echo -rf.txt` in cui `echo` può interpretare `-rf` come opzione. Leggere il trace in ordine di esecuzione è il modo più rapido per trovare dove il quoting ha perso un pezzo.

</details>

## Sicurezza

- Non incollare script presi online in una shell con privilegi: leggi prima le righe che contengono `rm`, `chmod -R`, `curl | bash` e percorsi assoluti.
- Un elenco di nomi costruito da input esterno non deve mai arrivare a `eval`: è la porta d'ingresso dell'injection.
- Prima di qualunque operazione di massa, esegui in modalità `dry-run` e stampa i percorsi con `printf '%q\n'`.
- `trap ... EXIT` è il modo più semplice per non lasciare file temporanei aperti o processi appesi.

## In sintesi

- `set -euo pipefail`, `IFS`, una funzione `main` e una trap sono l'impalcatura minima di un buono script.
- Elenchi di file si gestiscono con glob, `while IFS= read -r` o `find -print0`, mai con `for f in $stringa`.
- `--` separa opzioni e percorsi; `-name "$pattern"` evita il glob prematuro; `mktemp` e trap rendono sicuro ciò che è temporaneo.
- Exit code distinti (2 uso, 1 errore, 130 interruzione) comunicano l'esito.
- `shellcheck` e `bash -x` trasformano la diagnosi da intuizione in osservazione.

## Fonti

- shellcheck: https://www.shellcheck.net/
- Manuale GNU Bash — Quoting: https://www.gnu.org/software/bash/manual/html_node/Quoting.html
