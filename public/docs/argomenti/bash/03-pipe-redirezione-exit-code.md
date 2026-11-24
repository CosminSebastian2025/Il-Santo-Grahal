Un comando Unix è un piccolo programma che legge da un flusso di input e scrive su due flussi di output. Quando impari a collegare questi flussi con pipe e redirezioni, smetti di scrivere mega-comandi e componi soluzioni leggibili da pezzi che sai debuggare da soli. Qui vedi come funzionano stdin, stdout e stderr, perché `|` e `>` si comportano come si comportano, e come l'exit code di una pipeline ti dice la verità o ti nasconde un guasto.

## Obiettivi

- Distinguere stdin (fd 0), stdout (fd 1) e stderr (fd 2).
- Usare `>`, `>>`, `<`, `2>`, `&>`, `2>&1` e capire l'ordine di applicazione.
- Compose pipeline e sapere quale exit code viene restituito.
- Usare `pipefail` e strumenti come `tee` e `/dev/null`.
- Evitare le trappole: buffer del terminale, pipe che nascondono errori, processi che restano appesi.

## Tre flussi standard

Ogni processo eredita, salvo diverso redirect, tre file descriptor: `0` per l'input, `1` per l'output normale, `2` per i messaggi di errore. Il terminale non è "stdout": stdout è un descriptor che punta al terminale, a un file o a una pipe, a seconda di come è stato avviato il processo.

```bash
ls /esiste /non-esiste > out.txt 2> err.txt
printf '%s\n' '--- stdout ---'; cat out.txt
printf '%s\n' '--- stderr ---'; cat err.txt
```

Separare i due flussi è la prima operazione di diagnosi onesta: se mescoli tutto, `grep "error"` sui log trova anche i dati.

## Redirezioni

| Sintassi | Effetto |
| --- | --- |
| `cmd > file` | stdout su file, troncandolo |
| `cmd >> file` | stdout in append |
| `cmd < file` | stdin da file |
| `cmd 2> err` | stderr su file |
| `cmd 2>&1` | stderr dove va stdout *adesso* |
| `cmd &> tutto` | stdout + stderr insieme (Bash) |
| `cmd 2>&1 1>file` | stderr resta sul terminale, stdout su file |
| `cmd <<< "$valore"` | here-string |
| `cat <<'EOF' ... EOF` | here-doc *senza* expansion |

L'ordine con `2>&1` conta: `cmd > log 2>&1` manda entrambi su `log`; `cmd 2>&1 > log` manda stderr sul terminale e stdout su `log`, perché la copia dello stderr avviene prima del cambio di stdout.

I here-doc con `<<'EOF'` (delimitatore quotato) non espandono `$variabili`: è il modo sicuro di generare file di configurazione o SQL senza sorprese.

```bash
valorE='a b'
printf '%s\n' "$valorE" > /tmp/v.txt
{
  printf 'utente=%s\n' "$USER"
  cat /tmp/v.txt
} >> /tmp/log-operazioni.txt
```

## Pipe: un solo flusso, più programmi

La pipe collega lo stdout di un comando allo stdin del successivo. I due girano **in contemporanea**, non uno dopo l'altro: per questo `yes | head -3` termina invece di girare all'infinito.

```bash
ps -eo comm= | sort | uniq -c | sort -rn | head -10
grep -c '^Failed password' /var/log/auth.log 2>/dev/null || true
df -h | awk 'NR>1 {print $6, $5}'
```

Leggi la prima pipeline: estrai i nomi dei processi, ordina, conta i duplicati, ordina per numero decrescente, prendi i primi dieci. Ogni pezzo è banale; insieme squarciano il problema. Questo è il principio Unix: strumenti piccoli che fanno bene una cosa.

`tee` scrive su stdout e su un file contemporaneamente, utile quando devi vedere l'output e conservarlo. `xargs` trasforma lo stdin in argomenti, ma va usato con attenzione con nomi che contengono spazi: `xargs -0` con `find -print0` è la forma robusta.

```bash
find . -maxdepth 1 -name '*.log' -print0 | xargs -0 -n1 wc -l
comando | tee /tmp/output.txt | grep -i error
```

## Exit code delle pipeline: la trappola

Senza `pipefail`, l'exit code di `a | b | c` è quello dell'**ultimo** comando. Se `a` fallisce e `c` funziona, la pipeline risulta "riuscita": l'errore sparisce.

```bash
false | head -1
echo "pipe: $?"            # 0, l'errore di false è scomparso
set -o pipefail
false | head -1
echo "pipe: $?"            # 1
```

Con `pipefail`, l'exit code della pipeline è quello dell'ultimo comando (da sinistra) che ha fallito; se tutti riescono è 0. Regola: negli script usa sempre `pipefail` (spesso insieme a `-e` e `-u`).

```bash
set -euo pipefail
```

`-e` esce al primo comando fallito, `-u` esegue un errore su variabile non impostata, `pipefail` propagherà l'errore. Non sostituisce il controllo esplicito: `grep` che non trova nulla restituisce 1 e con `-e` chiude lo script. In quei casi scrivi `grep -q pattern file || true` oppure gestisci la condizione con `if`.

## Scrivere su stderr

I messaggi diagnostici vanno su stderr, non su stdout: così chi cattura l'output del tuo script non trova le tue righe di log dentro i dati.

```bash
info() { printf '[INFO] %s\n' "$*" >&2; }
errore() { printf '[ERRORE] %s\n' "$*" >&2; }
info "inizio"
```

Analogamente un "no" come risposta a una domanda non è errore di sistema: `exit 1` sì.

## Casi pratici

```bash
# escludere le righe di commento e contare i TODO nei sorgenti
grep -R --line-number 'TODO' src 2>/dev/null

# salvare i log del test e mantenerne l'esito
if ! make test > /tmp/test.log 2>&1; then
  errore "test falliti, vedi /tmp/test.log"
  exit 1
fi

# silenziare un comando molto verboso
comando_verbose > /dev/null 2>&1
```

Su Windows PowerShell la sintassi cambia: `|` collega oggetti, non testo, e `$LASTEXITCODE` c'entra solo con i comandi nativi. `2>` e `2>&1` esistono ma i flussi sono più di tre (`*>` redirige tutto). In Git Bash e WSL valgono le regole Unix di questa lezione.

## Errori comuni

- **`> file` invece di `>> file`**: il primo tronca silenziosamente. Se un comando in cache/make produce meno output del precedente, ti accorgi del residuo solo dopo.
- **Scordarsi `2>&1`**: il comando fallisce ma il log è vuoto, perché l'errore è andato sul terminale (o nel vuoto di un servizio).
- **Usare il terminale come unica destinazione dei log**: quando il processo è un servizio, stderr può finire nel journal, in un file di sistema o niente affatto.
- **Pipeline con `while read` in subshell**: `cat file | while read ...; do x=$((x+1)); done` modifica `x` in una subshell e il valore resta 0. Usa `while read ...; done < file`.
- **`xargs` senza `-0`**: nomi con spazi o apici vengono spezzati e il comando agisce sull'argomento sbagliato.

## Sicurezza

- **Non eseguire come root output che non hai controllato**: `curl ... | sudo bash` esegue contenuto remoto senza checksum. Scarica, verifica, poi esegui.
- **Redirect su file che non possiedi**: Bash può negarti l'accesso (good), ma un percorso costruito da variabili non quotate può scrivere altrove. Controlla con `printf '%q\n'`.
- **Log con segreti**: se redirigi l'output di un comando che stampa token, specifichi permessi e rotazione (es. `umask 077`).

## In sintesi

- stdin/stdout/stderr sono descriptor: le redirezioni li puntano a file o pipe, e l'ordine conta in `2>&1`.
- La pipe fa girare i comandi in parallelo e compone soluzioni piccole; `tee` permette di vedere e salvare.
- Senza `pipefail` l'exit code di una pipeline è l'ultimo comando: usa `set -euo pipefail` e gestisci i casi `grep`/`test`.
- Log di diagnostica su stderr, dati su stdout.
- `find -print0 | xargs -0` e `while ...; done < file` sono le forme robuste con nomi e conteggi.

## Fonti

- Manuale GNU Bash — Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirecting-Streams.html
- `bash(1)` su man7.org — pipelines e redirezioni: https://man7.org/linux/man-pages/man1/bash.1.html
