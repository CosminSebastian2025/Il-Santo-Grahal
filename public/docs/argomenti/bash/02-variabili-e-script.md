Uno script è una sequenza di comandi che la shell esegue come un programma. Il punto in cui quasi tutti inciampano non è la sintassi, ma il **quoting**: senza virgolette le variabili vengono spezzate in parole e riletta la glob, e il risultato cambia con i nomi dei file. In questa lezione metti a posto variabili, argomenti, `read`, `test` ed exit code, cioè tutto ciò che serve per scrivere qualcosa che non si rompa al primo spazio nel percorso.

## Obiettivi

- Distinguere variabile di shell e variabile d'ambiente, e usare `export`.
- Padroneggiare il quoting: doppie virgolette, singole, `$'...'`, e quando non usarle.
- Leggere argomenti posizionali e gestire parametri opzionali con `read`/`getopts`.
- Usare `test`, `[[ ]]`, campi stringa e aritmetica.
- Restituire exit code corretti e usarli con `if`, `&&`, `||`.

## Variabili: locali e d'ambiente

```bash
NOME=grahal           # nessun spazio attorno al =
echo "Ciao, $NOME"
unset NOME
export OGGETTO="Il Santo Grahal"
env | grep '^OGGETTO='
```

`NOME=...` crea una variabile di shell: la vede solo questa shell, non i programmi figli. `export` la aggiunge all'ambiente ereditato. `export -p` elenca le variabili esportate.

Non scrivere nomi con caratteri speciali e non usare `PATH` per altro. E attenzione: `echo $HOME` senza virgolette è una bomba a orologeria se `HOME` contiene spazi (non capita su Linux, capita su macOS se crei un utente con uno spazio).

```bash
VISIBILE=1
bash -c 'echo "vedo VISIBILE=${VISIBILE:-niente}"'   # niente: non esportata
export VISIBILE
bash -c 'echo "vedo VISIBILE=$VISIBILE"'             # 1
```

`bash -c` lancia una subshell "figlia vera": quello che non è esportato non passa.

## Quoting: le regole che contano

| Forma | Cosa fa | Esempio |
| --- | --- | --- |
| `"..."` | espande `$var`, `$(...)`, conserva spazi e blocca il glob | `echo "$file"` |
| `'...'` | letterale assoluto, nessuna espansione | `echo '$HOME'` → `$HOME` |
| `$'...'` | interpreta escape `\n`, `\t` | `printf $'a\tb\n'` |
| `\x` | letterale del singolo carattere | `echo a\ b` → `a b` |

La regola d'oro: **metti tra doppie virgolette ogni espansione di variabile, a meno che tu non voglia espressamente il glob o lo splitting**. Quasi tutte le vulnerabilità di quoting nascono dall'opposto.

```bash
file='Elenco dei file.txt'
ls $file          # sbagliato: ls riceve due argomenti
ls "$file"        # corretto
find /tmp -name "$file" -print    # il pattern è quotato, non globbato prima
```

`$(...)` è preferibile ai backtick perché si annida e si legge meglio:

```bash
data=$(date +%F)
printf 'Oggi è %s\n' "$data"
```

## Argomenti posizionali

Uno script riceve argomenti in `$1`, `$2`, ...; `$#` è il numero, `$@` è l'elenco. `"$@"` è la forma corretta per passare tutti gli argomenti a un altro comando, una parola per argomento:

```bash
#!/usr/bin/env bash
# stampa-args.sh
printf 'argomenti: %d\n' "$#"
for arg in "$@"; do
  printf '  [%s]\n' "$arg"
done
```

```text
$ ./stampa-args.sh "due parole" terzo
argomenti: 2
  [due parole]
  [terzo]
```

Con `"$*"` avresti una sola stringa, unita dal primo carattere di `IFS`. Usa `"$@"` quasi sempre. `shift` elimina `$1` e scorre gli altri, utile con `while [ $# -gt 0 ]`.

```bash
while [ "$#" -gt 0 ]; do
  case "$1" in
    -v|--verbose) verbose=1; shift ;;
    -f|--file)    file=$2; shift 2 ;;
    -*)           printf 'opzione sconosciuta: %s\n' "$1" >&2; exit 2 ;;
    *)            break ;;
  esac
done
```

`getopts` è più formale per le opzioni a lettera singola (`-v`, `-f file`) e gestisce gli errori in modo coerente. Un dettaglio che risparmia notti: fai `shift 2` per un'opzione con valore solo dopo aver verificato `[[ $# -ge 2 ]]`, altrimenti su input incompleto ottieni un errore confuso invece di un messaggio chiaro.

## Parametri con default e controlli

Bash offre espansioni che evitano un `if` per i casi più comuni:

```bash
: "${PORTA:=8080}"                          # imposta PORTA se vuota o non definita
printf 'porta: %s\n' "$PORTA"
: "${CARTELLA:?devi impostare CARTELLA}"    # esce se manca: usalo a inizio script
printf 'base: %s\n' "${percorso##*/}"       # toglie la directory
printf 'bak:  %s\n' "${percorso%.log}.bak"  # sostituisce il suffisso .log
```

`${var:?messaggio}` è un controllo di inizio script: termina la shell *corrente* con errore e un messaggio chiaro, quindi mettilo dove la variabile deve già esistere, non in una subshell che stai provando.

`${var:-default}`, `${var:=default}`, `${var:?messaggio}`, `${#var}` (lunghezza) e le rimozioni `%`/`#` sono strumenti quotidiani: riducono gli `if` senza perdere robustezza.

## Funzioni e `local`

```bash
msg() {
  local livello=$1
  shift
  printf '[%s] %s\n' "$livello" "$*" >&2
}
msg INFO "inizio elaborazione"
```

`local` evita di sporcare lo spazio globale. Le funzioni restituiscono un exit code come i comandi: `return 1` segnala fallimento e va controllato.

## Leggere input: read

```bash
printf 'Nome del progetto: '
read -r progetto
printf 'Hai scritto: %q\n' "$progetto"
```

`-r` evita che la shell interpreti i backslash: senza, `C:\temp` diventa `C:temp`. `%q` stampa una forma quotata e visibile, perfetta per diagnosticare.

```bash
while IFS= read -r riga; do
  printf '%s\n' "$riga"
done < elenco.txt
```

Questo è il ciclo per leggere un file riga per riga: `IFS=` evita di tagliare gli spazi ai lati, `-r` protegge i backslash e la redirection finale evita i problemi del `cat | while`. In alternativa, `readarray -t righe < elenco.txt` legge tutto in un array.

```bash
read -r -p 'Continuare? [s/N] ' risposta
case "${risposta,,}" in s|si|sì) echo avanti ;; *) echo stop ;; esac
```

## test e [[ ]]

`test` (o `[ ]`) è il built-in per verificare condizioni. Con Bash `[[ ]]` è più sicuro: non fa word splitting né glob sul lato sinistro e supporta `=~` per le regex.

```bash
[ -f "$file" ] && echo "esiste un file regolare"
[[ -d "$dir" ]] && echo "è una directory"
[[ -z "${MODE:-}" ]] && echo "MODE non impostata o vuota"
[[ "$nome" =~ ^[a-z][a-z0-9_-]*$ ]] || echo "nome non valido"
[[ "$n" -gt 10 ]] && echo "maggiore di 10"
```

Attenzione a `-z`/`-n` con variabili vuote: scrivi `[ -z "${x:-}" ]`, oppure usa `[[ -z $x ]]` che è tollerante. I confronti numerici usano `-eq -ne -lt -le -gt -ge`; `=` è per le stringhe. Dentro le aritmetiche `(( ))` puoi usare `>` e `<` direttamente.

## Exit code

Ogni comando restituisce un codice da 0 a 255: **0 è successo**, diverso da 0 è fallimento. Lo leggi in `$?`.

```bash
grep -q 'root' /etc/passwd
echo "$?"                 # 0 se trovato
ls /percorso/inesistente
echo "$?"                 # 2 tipico per ls
```

`exit N` termina uno script con quel codice. Gli script restituiscono l'exit code dell'ultimo comando eseguito se non diversamente indicato: è una fonte frequente di "troppo verdi" nei test.

```bash
if [[ ! -f "$file" ]]; then
  printf 'manca %s\n' "$file" >&2
  exit 1
fi
comando || { echo "fallito con codice $?" >&2; exit 1; }
```

`A && B` esegue `B` solo se `A` ha avuto successo; `A || B` esegue `B` solo se `A` fallisce. Con `if`, il connettivo è più leggibile, ma le due forme sono equivalenti.

## Errori comuni

- **Spazi attorno a `=`**: `X = 1` viene interpretato come comando `X` con argomenti `=` e `1`.
- **`$var` senza virgolette**: il classico bug. `rm $tmp/...` con `tmp` vuoto può diventare un percorso assoluto. Scrivi `"${tmp:?non impostata}"` quando una variabile deve esistere.
- **Confrontare stringhe con `==` dentro `[ ]`**: `[ "$a" == "$b" ]` funziona in Bash ma è non-POSIX; usa `=` oppure `[[ ]]`.
- **`read` senza `-r`**: i backslash diventano caratteri di controllo.
- **Un `if` che controlla il comando sbagliato**: `if comando > log; then` controlla l'exit code di `comando`, non del redirect; se la condizione coinvolge una sostituzione `$(...)` vuota, l'`if` può fallire in modi sorprendenti. Verifica con `bash -x`.
- **`[[ ]]` porta a credere che tutto sia sicuro**: `[[ $x -eq 1 ]]` su un valore non numerico è un errore; valida prima con `[[ $x =~ ^[0-9]+$ ]]`.

## In sintesi

- Le variabili di shell non passano ai figli; `export` le rende ambiente.
- Metti le espansioni tra doppie virgolette; `"$@"` è l'unico modo di passare un elenco di argomenti intatto.
- `read -r`, `readarray` e `while IFS= read -r` sono il modo robusto di leggere input.
- `[[ ]]` evita molte trappole di quoting e splitting di `[ ]`.
- Exit code 0 = successo: propagarli correttamente è ciò che rende un'automazione affidabile.

## Fonti

- Manuale GNU Bash — Quoting: https://www.gnu.org/software/bash/manual/html_node/Quoting.html
- `bash(1)` su man7.org — shell parameters e built-in: https://man7.org/linux/man-pages/man1/bash.1.html
