Qui metti alla prova processi, memoria, descriptor e permessi: ogni esercizio produce un'osservazione reale sul tuo sistema e una domanda a cui rispondere leggendo l'output. Non serve root se non dove indicato, e nessun comando distrugge dati: i test usano file temporanei nella tua home.

## Obiettivi

- Osservare un processo e i suoi figli con `ps` e ricostruire la gerarchia.
- Misurare lo spazio reale occupato da un file aperto e cancellato.
- Provocare e leggere un limite di file descriptor senza fermare il sistema.
- Interpretare una stringa di permessi e riprodurre un "permission denied".
- Usare `stat` e `df -i` per distinguere spazio byte da spazio inode.

## Preparazione

Lavora in una directory di test, non nel progetto:

```bash
mkdir -p ~/os-lab && cd ~/os-lab
uname -srm; id; ulimit -n; df -h ~ | tail -1
```

Annota kernel, uid, limite soft dei descriptor e spazio disponibile per confrontare i risultati. Su macOS `df` e `ps` funzionano come qui; su Windows usa PowerShell (`Get-Process`, `Get-PSDrive`, `icacls`) e salta gli esercizi su `/proc`.

## Esercizi

### 1. Gerarchia di processi e stato

Avvia un processo di lunga durata e osservalo da un secondo terminale.

```bash
sleep 600 &
echo $!                 # PID dell'ultimo processo in background
ps -o pid,ppid,stat,etime,cmd -p $!
```

Poi esegui `ps -eo pid,ppid,stat,comm | head -30` e individua il PPID del `sleep`.

**Domande:** chi è il padre? Che cosa significa lo stato `S`? Che cosa diventa con `kill -STOP <pid>`? Rilascia con `kill -CONT <pid>` e chiudi con `kill <pid>`.

<details>
<summary>Soluzione commentata</summary>

```bash
sleep 600 &                 # job in background
child=$!
ps -o pid,ppid,stat,comm -p "$child"   # tipicamente S stat, comm=sleep
kill -STOP "$child"         # ora lo stato diventa T (stopped)
kill -CONT "$child"         # torna S
kill "$child"               # SIGTERM, il sleep termina
```

`S` è attesa di I/O o timer; `T` è fermo per un segnale di stop. Il padre è la shell, una subshell se il comando sta in una pipeline o tra parentesi.

</details>

### 2. File cancellato ma ancora presente

Crea un file, tienilo aperto da un processo, cancellane il nome e guarda lo spazio.

```bash
fallocate -l 50M grande.bin 2>/dev/null || dd if=/dev/zero of=grande.bin bs=1M count=50
ls -l grande.bin
rm grande.bin
ls -l grande.bin        # non esiste più
```

Per tenere un file aperto mentre lo cancelli puoi usare una shell che lo legge lentamente:

```bash
tail -f /dev/null > buffer.txt &   # processo che tiene aperto il file
pid=$!
rm buffer.txt
ls -l /proc/"$pid"/fd/             # guarda la voce "buffer.txt (deleted)"
kill "$pid"
```

Con un file grande il segnale è più chiaro: `df -h ~` resta uguale finché il processo non chiude il descriptor.

**Domanda:** perché lo spazio non si libera subito e quale comando in Unix mostra l'aggancio?

<details>
<summary>Soluzione commentata</summary>

`rm` toglie il nome e decrementa il link count dell'inode. I blocchi restano finché esiste un descriptor o un hard link: è la garanzia che chi sta scrivendo non venga corrotto. `lsof +L1` elenca i file con link count zero ancora aperti; chiudendo il processo lo spazio torna libero.

</details>

### 3. Il limite dei file descriptor

Apri più file della soglia e osserva cosa succede al limite.

```bash
ulimit -n
ulimit -Hn
bash -c 'ulimit -n 64; while exec {fd}</dev/null 2>/dev/null; do :; done; echo "sono arrivato al limite"' 2>&1 | tail -3
```

La subshell riduce il limite soft a 64 solo per sé; il ciclo apre file finché il kernel non rifiuta. Bash stampa a quel punto un errore di redirection, non sempre "Too many open files".

**Domande:** che cosa compare quando il limite è raggiunto? Il tuo utente può alzare il limite soft oltre quello hard? Prova con `bash -c 'ulimit -n 999999; echo $?'`.

<details>
<summary>Soluzione commentata</summary>

Il messaggio osservato è del tipo `bash: redirection error: cannot duplicate fd: Bad file descriptor`, perché il tentativo di duplicare un fd fallisce con `EMFILE` (troppi file aperti per processo, su Linux visibile anche come `Bad file descriptor` durante la redirection). La subshell tra parentesi o via `bash -c` isola la modifica. Un utente non privilegiato alza il soft solo fino all'hard: oltre, Bash risponde `cannot modify limit: Operation not permitted` ed esce con codice diverso da 0. Ecco perché molti servizi hanno un proprio `LimitNOFILE`.

</details>

### 4. Leggere e riprodurre un permesso negato

```bash
echo "dati di prova" > test.txt
chmod 600 test.txt
ls -l test.txt
stat -c '%A %a %U:%G' test.txt     # su macOS: stat -f '%Sp %p %Su:%Sg' test.txt
```

Rendi il file leggibile solo al proprietario e poi prova a leggere da un altro utente (se hai `sudo`):

```bash
sudo -u nobody cat test.txt        # atteso: Permission denied
sudo -u nobody cat "$HOME"/os-lab/test.txt
```

Ora prova il caso della directory:

```bash
mkdir privata && echo segreto > privata/f && chmod 700 privata
sudo -u nobody ls privata           # leggi i nomi? no
chmod 744 privata                   # r per altri, senza x
sudo -u nobody ls privata           # nomi visibili
sudo -u nobody cat privata/f        # comunque Permission denied
```

**Domande:** in quale caso il problema è il file e in quale la directory? Che cosa cambia con `chmod 755 privata`?

<details>
<summary>Soluzione commentata</summary>

Con `744` gli "altri" leggono i nomi ma non attraversano la directory senza `x`: `ls` elenca, `cat` fallisce. Con `755` anche l'apertura è consentita, se il file è leggibile. Distingui i messaggi: `cannot open directory` è la directory, `Permission denied` su `cat` è il file o l'attraversamento.

</details>

### 5. Spazio in byte e inode

```bash
df -h ~ | tail -1
df -i ~ | tail -1
mkdir -p tanti
for i in $(seq 1 1000); do : > "tanti/f$i"; done
df -i ~ | tail -1       # confronta con il valore iniziale
rm -r tanti
```

**Domande:** quanto sono cambiati byte e inode? Perché un filesystem può esaurire gli inode con il 20% di byte liberi?

<details>
<summary>Soluzione commentata</summary>

Mille file vuoti occupano quasi zero blocchi ma mille inode. Su ext4 gli inode sono assegnati alla creazione: esaurirli blocca nuovi file. Capita nei server con milioni di file piccoli (sessioni, cache).

</details>

### 6. Chi sta usando la CPU adesso

```bash
top -b -n 1 | head -12                  # su macOS: top -l 1 | head -12
ps -eo pid,ni,pcpu,pmem,stat,comm --sort=-pcpu | head -8
```

Apri poi un secondo terminale e lancia `yes > /dev/null &`; ripeti `ps` e chiudi con `kill %1`.

**Domanda:** il processo `yes` che cosa dimostra sul legame tra `%CPU` e core disponibili?

<details>
<summary>Soluzione commentata</summary>

`yes` occupa un core al 100%: con quattro core il suo `%CPU` è circa 100, non 25, perché `ps` riporta la percentuale di un singolo core. Il carico medio sale di circa 1. Il `ni` resta 0: per limitarlo usa `nice -n 19 yes > /dev/null &`.

</details>

## Sicurezza

- Non eseguire questi esercizi come root: i limiti e i permessi cambiano significato e un errore costa di più.
- `chmod -R` e `rm -r` sono silenziosi per natura: prima di usarli su percorsi costruiti da variabili, stampa il percorso con `printf '%q\n' "$percorso"` e verifica che sia quello atteso.
- I test con `sudo -u nobody` creano file di proprietà di un altro utente: cancellali come root o lasciali in `/tmp` con nomi univoci.

## In sintesi

- `ps` e `/proc` mostrano stato, padre e descriptor di un processo; appendere il PID a `kill` evita di colpire il processo sbagliato.
- Un file cancellato resta nello spazio finché un descriptor lo tiene aperto: `lsof +L1`.
- `EMFILE` è un limite per processo, non un guasto: `ulimit -n/-Hn` lo spiegano.
- Sui permessi `r` e `x` di una directory sono due permessi diversi, e la negazione può venire dal percorso.
- `df -i` misura gli inode: un filesystem può essere "pieno" senza essere pieno di byte.

## Fonti

- `proc(5)` — file per processo in `/proc`: https://man7.org/linux/man-pages/man5/proc.5.html
- `ps(1)` — selezione e formato dell'output: https://man7.org/linux/man-pages/man1/ps.1.html
