Quando scrivi `ls -l /etc` in un terminale, non stai "premendo un tasto magico": stai parlando con una shell, che spezza la riga in parole, trova il programma giusto e lo avvia. Capire quel passaggio — parsing, ricerca nell'`PATH`, ambiente, built-in — ti risparmia metà degli errori "command not found" e ti prepara ad automatizzare. Gli esempi valgono per Bash su Linux e macOS; su Windows puoi usare Git Bash o WSL con gli stessi risultati.

## Obiettivi

- Distinguere shell, terminale, emulatore di terminale e sistema operativo.
- Descrivere il ciclo di interpretazione: token, alias, espansioni, glob, esecuzione.
- Sapere dove la shell cerca un comando e perché `PATH` e `hash` contano.
- Distinguere built-in, funzioni, eseguibili esterni.
- Usare prompt, history e variabili di ambiente per orientarti.

## Shell, terminale, Bash

Tre cose diverse collaborano quando "apri il terminale":

- il **terminale** (emulatore) è il programma che disegna la finestra: GNOME Terminal, iTerm, Windows Terminal;
- la **shell** è il programma che legge comandi e li esegue: Bash, Zsh, Fish, PowerShell;
- il **sistema operativo** è ciò che shell ed eseguibili usano per aprire file e avviare processi.

Il terminale non interpreta nulla: consegna i byte alla shell. La shell è un processo utente come gli altri, con un PID, una working directory e un ambiente.

Bash è la shell POSIX più diffusa su Linux, la shell di default su macOS fino a Catalina e installabile ovunque. Gli script con shebang `#!/usr/bin/env bash` girano sia su Linux sia su macOS anche quando `/bin/sh` è `dash`. PowerShell, invece, ha una sintassi diversa: `$env:PATH` al posto di `$PATH`, `Get-ChildItem` al posto di `ls`.

## Il ciclo: dalla riga al processo

Per ogni comando la shell esegue, nell'ordine:

1. **Legge** la riga (o più righe, finché le virgolette e le parentesi sono chiuse).
2. **Divide** in token con operatori (`|`, `;`, `&&`, `>`, `<<...`).
3. **Applica gli alias**, se la prima parola corrisponde a un alias definito.
4. **Espande**: parametri, comandi tra backtick o `$(...)`, aritmetica, poi *word splitting* e infine *glob* (`*`, `?`, `[...]`).
5. **Cerca** cosa eseguire: built-in, funzione, poi eseguibile nell'`PATH`.
6. **Esegue** l'eseguibile con `fork`+`exec` (o direttamente, se è un built-in) e attende.
7. **Registra** l'exit code in `$?` e continua.

Il punto 4 è quello che sorprende: l'espansione avviene *dopo* il parsing, quindi il glob può produrre zero, una o molte parole. Se non conosci il comportamento, il glob è la prima causa di comandi che "fanno cose strane".

```bash
echo *.md          # con un solo file stampa il nome; senza corrispondenze stampa *.md
echo "*.md"        # le virgolette disattivano il glob
ls -d -- *.md      # -- chiude le opzioni, nel caso un file si chiami -qualcosa
```

## Trovare il comando giusto: PATH e hash

Il comando `ls` viene cercato nelle directory elencate in `PATH`, dalla prima all'ultima.

```bash
printf '%s\n' "$PATH" | tr ':' '\n'
type ls
type -a python3
command -v code
which ls            # meno affidabile di type: non conosce built-in e funzioni
```

`type` è il comando più utile: dice se `ls` è un alias, una funzione, un built-in o un file e in quale percorso. `type -a` elenca tutte le occorrenze, utile quando installi una nuova versione di una toolchain e continui a usare quella vecchia.

La shell memorizza i percorsi già trovati in una cache (`hash`). Se installi un binario nuovo in una directory già nel `PATH` e il nome coincide con un comando che avevi già usato, la shell può continuare a usare la copia vecchia.

```bash
hash -r        # svuota la cache delle posizioni
```

Su Windows l'equivalente è `where.exe` e `$env:PATH` in PowerShell; Git Bash costruisce un `PATH` in stile Unix che include `/usr/bin` e `/mingw64/bin`.

## Built-in, funzioni, eseguibili

Non tutto ciò che digiti è un file sul disco.

- **Built-in**: implementati dentro la shell, come `cd`, `echo`, `printf`, `read`, `export`, `test`, `set`, `type`, `:`. `cd` deve essere un built-in per poter cambiare la directory del processo shell stesso: un eseguibile esterno non potrebbe.
- **Funzioni** definite da te (vedi la prossima lezione).
- **Eseguibili esterni**: `ls`, `grep`, `git`, i tuoi script.

```bash
type cd
# cd è un built-in della shell
type grep
# grep è /usr/bin/grep
```

Questa distinzione ha un effetto pratico: `cd` dentro una subshell non cambia la directory della shell padre. Ed è la ragione per cui `find ... -exec cd` non funziona come uno si aspetta.

## Prompt e storia

Il prompt è un insieme di variabili: `PS1` per quello interattivo, `PS2` per le righe di continuazione. Molti env usano frammenti in `/etc/profile.d` o `~/.bashrc`. Non incollarci comandi con segreti: il prompt viene ristampato e finisce nei log del terminale.

```bash
echo "$PS1"
history | tail -5
history -c            # cancella la sessione corrente
mkdir -p ~/progetti && cd ~/progetti
```

L'history può contenere password se le hai digitate sulla riga (ad esempio passate a comandi che le accettano come argomento). Imposta `HISTCONTROL=ignoreboth` per non salvare duplicati e righe che iniziano con uno spazio, e ricorda `history -d N` per rimuovere una voce.

## Ambiente: un pezzo di stato condiviso

Ogni processo ha un **ambiente**: un insieme di coppie `nome=valore` passato ai figli. Le variabili che *non* sono esportate vivono solo nella shell; quelle esportate (`export`) entrano nell'ambiente e sono visibili ai programmi che avvii.

```bash
PROGETTO=grahal
echo "$PROGETTO"               # visibile solo nella shell
echo "$LANG"                   # variabile di ambiente già presente
export EDITOR=nano
env | grep -E '^(EDITOR|LANG|PATH)=' | sort
```

`env`, `printenv`, `set` danno viste diverse: `env` mostra solo le variabili esportate, `set` tutto compresi funzioni e variabili della shell. Regole pratiche: usa nomi in MAIUSCOLO solo per le variabili d'ambiente che esporti; le variabili locali in minuscolo. Non usare `PATH` come nome di variabile locale.

## Errori comuni e piccoli difetti

- **`command not found` con un binario appena installato**: la directory non è nel `PATH`, oppure c'è la cache da svuotare (`hash -r`) o la sessione non ha riletto la configurazione. Verifica con `type -a nome`.
- **`type` contro `which`**: `which` non conosce alias, funzioni e built-in. Usa `type`.
- **Assumere che la shell sia Bash**: la prima riga di uno script dovrebbe essere `#!/usr/bin/env bash`. Lanciandolo con `sh script.sh` puoi finire su Dash o Zsh, dove la sintassi Bash fallisce.
- **Cambiare directory dentro `( ... )`**: la subshell cambia posto, la tua shell no.
- **Fidarsi di `history` per recuperare un comando**: la cronologia può essere disabilitata o troncata. Le automazioni robuste non leggono la history.

## In sintesi

- Terminale, shell e sistema operativo sono tre programmi: la shell interpreta, il terminale disegna.
- La shell espande prima di eseguire: alias, parametri, word splitting e glob, in questo ordine.
- `type -a` spiega *cosa* esegui e da dove; `hash -r` evita i binari vecchi in cache.
- `cd` è un built-in, le subshell non cambiano la working directory della shell madre.
- L'ambiente è stato condiviso con i figli: `export` è la differenza tra variabile di shell e variabile d'ambiente.

## Fonti

- Manuale GNU Bash: https://www.gnu.org/software/bash/manual/bash.html
- `bash(1)` su man7.org: https://man7.org/linux/man-pages/man1/bash.1.html
