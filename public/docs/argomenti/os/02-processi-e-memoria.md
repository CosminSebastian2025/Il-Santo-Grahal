Un processo è un programma in esecuzione con un suo stato privato: memoria, file aperti, credenziali, identificativo. Il sistema operativo lo crea, gli assegna tempo di CPU e gli dà uno spazio di indirizzi separato da quello di tutti gli altri. Capire come funzionano processi, thread, scheduling e memoria virtuale ti permette di interpretare quello che vedi in `ps`, `top` e `free`, e di spiegare perché un servizio "sembra lento" senza indovinare.

## Obiettivi

- Distinguere programma, processo e thread.
- Descrivere `fork` e `execve`, cioè come nasce un processo.
- Capire lo scheduling e che cosa significano carico, priorità e segnali.
- Spiegare la memoria virtuale, il page fault e i file descriptor.
- Leggere `ps`, `top` e `free` senza trarre conclusioni sbagliate.

## Programma, processo, thread

Il **programma** è un file sul disco con istruzioni e dati iniziali. Il **processo** è un'istanza in esecuzione di quel file: due terminali che lanciano `sleep 60` creano due processi distinti, con PID diversi, anche se l'eseguibile è lo stesso.

Ogni processo ha almeno:

- uno spazio di indirizzi privato con codice, dati, heap e stack;
- un PID e un PPID (il processo padre);
- credenziali: uid reale ed effettivo, gid, gruppi supplementari;
- una tabella di file descriptor aperti;
- una mask di segnali e gestori registrati;
- uno stato: in esecuzione, pronto, in attesa (`sleep`, I/O), zombie, fermo.

I **thread** sono flussi di esecuzione dentro lo stesso processo. Condividono spazio di indirizzi, file aperti e segnali, ma hanno ognuno il proprio stack, i registri e il program counter. Su Linux il kernel non distingue molto: processi e thread sono "task" con `CLONE_THREAD` nel namespace di memoria condiviso. Il vantaggio dei thread è che comunicare costa poco (stessa memoria); il costo è che un errore di sincronizzazione rompe tutto il processo.

## Nascita e morte: fork ed execve

Su Unix un processo nuovo non parte da zero. Chiama `fork()`, che duplica il processo corrente: il figlio è una copia quasi identica, con un PID nuovo e lo stesso codice. Poi, di solito, il figlio esegue `execve(path, argv, envp)`, che sostituisce il proprio spazio di indirizzi con un nuovo programma, conservando PID e file aperti. Lo shell fa esattamente questo per ogni comando: `fork` e poi `exec` di `/usr/bin/ls`.

La copia è efficiente perché la memoria è **copy-on-write**: dopo `fork` le pagine sono condivise in sola lettura e vengono copiate solo quando uno dei due scrive.

Il processo termina con `exit(code)`. Il kernel tiene il suo exit code finché il padre non chiama `wait()`. Se il padre non lo fa, il processo resta **zombie**: occupa solo una voce nella tabella dei processi. Se invece muore il padre, il figlio viene "adottato" da `init`/`systemd` (PID 1). Su Windows il modello è diverso: `CreateProcess` crea in un colpo un processo con l'eseguibile desiderato, senza la separazione fork/exec.

```bash
ps -o pid,ppid,stat,cmd -p $$   # il tuo shell
sleep 300 &                     # avvia in background
ps -o pid,ppid,stat,comm --forest | head -20
```

## Scheduling: chi usa la CPU e per quanto

Se ci sono più processi pronti che core, lo **scheduler** decide quando togliere la CPU a uno (preemption) e a chi darla, centinaia di volte al secondo. Su Linux lo scheduler CFS/EEVDF usa pesi più che quantum fissi: chi ha consumato meno CPU relativa al proprio peso viene favorito. La **niceness** (da -20 a 19) cambia quel peso: `nice -n 10 comando` cede CPU più facilmente, `renice` lo modifica su un processo già avviato. Le policy real-time (`SCHED_FIFO`, `SCHED_RR`) hanno priorità più alta di tutto e possono affamare il sistema. Un processo in attesa di I/O (stato `S`) non consuma CPU ma entra nel `load average`: un carico alto può indicare dischi lenti, non CPU satura.

## Segnali: il modo standard per parlare a un processo

I segnali sono notifiche asincrone: `SIGTERM` (15, terminazione con pulizia), `SIGKILL` (9, forzata e non intercettabile), `SIGINT` (2, `Ctrl+C`), `SIGHUP` (1, spesso rilettura della configurazione), `SIGSTOP`/`SIGCONT`.

```bash
kill -TERM 1234        # prima scelta
kill -HUP 1234         # se il servizio lo interpreta come reload
kill -KILL 1234        # ultima risorsa, nessuna pulizia
```

Partire da `TERM` evita file corrotti e lock rimasti in piedi.

## Memoria virtuale

Un processo vede **indirizzi virtuali** tradotti dalla MMU in memoria fisica tramite le tabelle delle pagine; la mappa contiene codice, dati, heap, stack, librerie e aree `mmap`. Una pagina mancante provoca un **page fault**: il kernel la carica dal file o dalla swap e l'istruzione riprova. Un fault "minore" costa microsecondi, uno "maggiore" millisecondi.

In `free` e `top`, VIRT/VSZ è la memoria virtuale mappata (spesso grande e poco interessante), RES/RSS quella fisica residente: 4 GB di VIRT e 200 MB di RSS non sono 4 GB usati. Se la RAM scarseggia, il kernel usa swap e l'OOM killer termina il processo più pesante; macOS comprime la memoria, Windows usa un file di paging.

## File descriptor

Ogni file, socket o pipe aperto da un processo è identificato da un intero piccolo, il **file descriptor**. Nei processi Unix `0`, `1` e `2` sono stdin, stdout e stderr. Esiste un limite per processo (`ulimit -n` soft, `ulimit -Hn` hard) e superarlo produce "too many open files".

```bash
ulimit -n                   # limite soft di questa shell
lsof -p 1234 | head         # file e socket aperti dal processo 1234
ls -l /proc/1234/fd | head  # la stessa cosa su Linux via /proc
```

## Errori comuni

- **Uccidere subito con `-9`**: `TERM` prima di `KILL` permette chiusure pulite di file e socket. `KILL` è per quando il processo non reagisce.
- **Leggere `load average` come percentuale di CPU**: è il numero di processi in attesa, non un tasso; dipende anche dai dischi e va confrontato con i core.
- **Fidarsi di `%MEM` di `top`**: su più processi che condividono pagine (librerie, forking) la somma sovrastima la memoria reale.
- **Confondere thread e processi "separati"**: i thread di un processo cadono insieme: se uno fa una scrittura illegale, l'intero processo riceve `SIGSEGV`.
- **Ignorare i zombie**: pochi sono normali e temporanei; centinaia nei servizi indicano un padre che non fa `wait`.

## In sintesi

- Un processo è un'istanza di un programma, con spazio di indirizzi e credenziali privati; i thread condividono il processo e il suo rischio.
- Su Unix la creazione passa da `fork` ed `execve`, con copy-on-write e `wait` per raccogliere l'exit code.
- Lo scheduler distribuisce la CPU per pesi e priorità; `load average` e `%CPU` vanno letti insieme a core e I/O.
- La memoria virtuale isola i processi e il kernel carica pagine su page fault; RES/RSS è ciò che conta.
- I file descriptor sono handle numerici con un limite esplicito: sono tra le risorse più facili a esaurirsi.

## Fonti

- `fork(2)` — creazione di un processo, su man7.org: https://man7.org/linux/man-pages/man2/fork.2.html
- `proc(5)` — stato dei processi in `/proc/PID`, fd compresi: https://man7.org/linux/man-pages/man5/proc.5.html
