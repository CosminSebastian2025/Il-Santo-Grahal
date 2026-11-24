Il sistema operativo è il software che trasforma un insieme di circuiti in un ambiente in cui più programmi possono girare insieme senza distruggersi a vicenda. Non è "la grafica" né il programma con cui apri le finestre: il cuore è il kernel, il livello che dialoga con la CPU, la memoria e i dispositivi. Questa lezione chiarisce che cosa fa il kernel, che cosa fa lo spazio utente e come chiedere al sistema istantanee dello stato reale con pochi comandi.

## Obiettivi

- Distinguere kernel e spazio utente, e capire perché la separazione è una protezione.
- Riconoscere le cinque responsabilità del kernel: processi, memoria, filesystem, dispositivi, rete e permessi.
- Distinguere driver, libreria C e programmi di servizio.
- Leggere un primo insieme di comandi per osservare CPU, memoria, dischi e carico.

## Due mondi: kernel e spazio utente

La CPU ha (almeno) due livelli di privilegio. Il **kernel** gira a livello privilegiato: può toccare registri di controllo, tabelle delle pagine, porte di I/O e dispositivi. Ogni programma tuo, dal browser a `bash`, gira in **spazio utente**: può leggere e scrivere solo la memoria che il kernel gli ha assegnato e non può parlare direttamente con un disco.

Quando un programma in spazio utente ha bisogno di fare qualcosa di privilegiato non lo fa da solo: esegue una **system call**, cioè un'istruzione speciale che passa il controllo al kernel con una richiesta tipizzata. `open`, `read`, `write`, `fork`, `execve`, `mmap`, `exit` sono nomi di funzioni della libc che diventano system call. In pratica scrivi `write(fd, buf, n)` e la libreria C prepara i registri e salta nel kernel, che controlla i permessi, compie l'operazione e rientra restituendo un valore.

Questo confine ha un effetto concreto: se un'applicazione va in crash, di solito il kernel resta in piedi. Ecco perché "chiudere il programma bloccato" quasi mai riavvia il computer, mentre un bug in un driver sì.

```text
   +------------------------------+
   |  processi in spazio utente   |  browser, editor, bash, servizi
   +--------------+---------------+
                  | system call
   +--------------v---------------+
   |            kernel            |  schedulatore, memoria, filesystem,
   |                              |  driver, stack di rete, controllo accessi
   +--------------+---------------+
                  |
   +--------------v---------------+
   |           hardware           |  CPU, RAM, dischi, schede di rete
   +------------------------------+
```

## Che cosa gestisce il kernel

Il kernel è il **gestore delle risorse**: decide chi usa la CPU, chi vede quale memoria, chi può aprire quale file. Le responsabilità principali:

- **Processi e thread**: creare un'esecuzione isolata (processo), sospenderla, riprogrammarla, terminarla. Il kernel tiene per ogni processo lo stato, i registri salvati, gli identificativi (`PID`, `PPID`), le credenziali (utente, gruppi).
- **Scheduling**: con più processi pronti di quanti core esistano, qualcuno deve scegliere chi gira adesso. Lo vedremo nella lezione 2.
- **Memoria virtuale**: ogni processo riceve uno spazio di indirizzi finto che il kernel traduce in memoria fisica. È il meccanismo che isola i programmi.
- **Filesystem**: nomi di file, directory, permessi, spazi su disco. Il kernel offre un'interfaccia comune (VFS) sopra filesystem diversi come ext4, XFS, APFS, NTFS.
- **Dispositivi**: ogni periferica è pilotata da un driver nel kernel. Il programma vede un file (`/dev/...` su Unix) o un'API; il kernel fa il lavoro sporco.
- **Rete e permessi**: socket TCP/UDP e controllo degli accessi sono servizi del kernel: un programma in spazio utente non può leggere pacchetti di altri processi senza chiedere.

## Altre due zone di confine

Tra lo spazio utente "puro" e il kernel ci sono due strati che confondono spesso:

- la **libreria C** (`glibc`, `musl`, su macOS `libSystem`): fornisce `printf`, `malloc` e le funzioni che chiamano le system call. In parte è spazio utente, in parte è l'interfaccia verso il kernel;
- i **programmi di servizio** come `systemd`, `launchd`, `explorer.exe`, `sshd`: anche questi, per il kernel, sono normalissimi processi utente. Sono "di sistema" per convenzione, non per privilegio.

Un comando scritto in shell come `ls` non è il kernel: è un processo utente che chiama `open` e `read` su una directory.

## Un kernel non è un sistema operativo intero

"Linux" tecnicamente è il kernel. Una distribuzione aggiunge Bash, librerie, package manager, servizi. "macOS" è il kernel Darwin (XNU) con un ambiente utente BSD e grafico. "Windows" è NTOSKRNL con l'ambiente Win32. Il modello kernel/spazio utente vale per tutti e tre, anche se i nomi dei file e degli strumenti cambiano.

## Osservare lo stato del sistema

Il kernel espone lo stato attraverso interfacce che puoi interrogare. Su Linux la principale è `/proc`. Le versioni e i valori cambiano tra macchine, quindi leggi la struttura, non i numeri.

```bash
uname -srm                    # kernel e architettura
uptime                        # da quanto è acceso e carico medio
ps -eo pid,ppid,comm --sort=-%cpu | head
free -h                       # memoria fisica e swap
df -h /                       # spazio sul filesystem radice
```

Output indicativo su un Linux recente (valori tuoi diversi):

```text
$ uname -srm
Linux 6.8.0-45-generic x86_64

$ free -h
               total        used        free      shared  buff/cache   available
Mem:            15Gi       4,1Gi       3,2Gi       412Mi       8,6Gi       11Gi
Swap:          2,0Gi          0B       2,0Gi
```

Su `free` guarda `available`, non `free`: il resto è in gran parte cache, che il kernel libera volentieri quando serve. Il carico medio di `uptime` è il numero di processi pronti o in attesa di I/O, in media su 1, 5 e 15 minuti: confrontalo con i core (`nproc`), non con un valore assoluto.

Su macOS gli strumenti più comuni sono `top`, `vm_stat` e `df -h`. Su Windows, in PowerShell: `Get-Process` e `Get-CimInstance Win32_LogicalDisk`. La forma dei dati è diversa, le domande no: che cosa sta girando, quanta memoria resta davvero, quanto spazio resta, chi consuma CPU.

## Sicurezza: perché il confine conta

Se un programma potesse lanciare system call arbitrarie, leggere la memoria di ogni altro processo o scrivere sul disco di sistema, un bug in un'app innocua diventerebbe controllo totale della macchina. La separazione kernel/spazio utente è la prima difesa, e ogni meccanismo successivo (utenti, permessi, namespace, container) si appoggia a lei. Quando un processo consuma CPU in modo anomalo, chiediti quali system call stia facendo, non solo quale nome abbia.

## Errori comuni

- **Chiamare "sistema operativo" solo la grafica**: la GUI è un processo utente, spesso uno di tanti; un server senza GUI ha lo stesso kernel.
- **Interpretare `free` come RAM libera**: usa `available`, la cache è lavoro utile.
- **Pensare che un driver sia un'applicazione**: gira nel kernel; se va in crash può portarsi dietro il sistema.
- **Confondere `kill` con "uccidi subito"**: `kill PID` invia `TERM`, gestibile dal processo; il kernel interviene davvero con `KILL`.

## In sintesi

- Il kernel gestisce CPU, memoria, filesystem, dispositivi, rete e permessi; i programmi utente vi accedono con system call.
- Il confine privilegiato è la prima protezione del sistema, sopra cui poggiano utenti, permessi e container.
- `ls`, `bash`, `sshd` sono processi utente: "di sistema" descrive un ruolo, non un privilegio.
- `uname`, `uptime`, `free`, `df`, `ps` danno un'istantanea reale; leggi `available`, confronta il carico con il numero di core e adatta la sintassi alla piattaforma.

## Fonti

- `proc(5)` — interfaccia `/proc`, fonte di molti dati di sistema: https://man7.org/linux/man-pages/man5/proc.5.html
- Documentazione del kernel su memoria e gestione virtuale (kernel.org): https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html
