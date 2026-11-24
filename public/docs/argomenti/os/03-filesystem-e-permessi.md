Su Unix il nome di un file è solo un puntatore: l'identità vera è l'inode, e i permessi decidono chi può leggere, modificare o eseguire. Queste tre cose spiegano gli "access denied", i file "spariti" che occupano spazio e i servizi che vedono dati che non dovrebbero vedere.

## Obiettivi

- Distinguere percorso assoluto e relativo, hard link e symlink.
- Spiegare che cosa è un inode e cosa gli appartiene.
- Leggere e modificare permessi POSIX (`rwx`, ottali, sticky bit, setuid).
- Capire come utenti, gruppi e `umask` producono i permessi di default.
- Osservare file, mount e spazio reale con `ls -l`, `stat`, `df`.

## Percorsi, directory e link

Un **percorso assoluto** parte dalla radice `/` e identifica un file indipendentemente da dove ti trovi: `/etc/hosts`. Un **percorso relativo** parte dalla directory corrente: `./config`, `../log/app.log`. `.` è la directory corrente, `..` la sua genitrice. Ogni processo ha una working directory, e i percorsi relativi della shell (inclusi quelli degli script) dipendono da essa.

Linux e macOS usano `/` come separatore, sono case-sensitive (di norma) e non hanno lettere di unità: i dischi sono "montati" in punti della stessa gerarchia. Windows usa `\`, lettere come `C:` e un filesystem case-insensitive. PowerShell accetta spesso anche `/`, ma i percorsi con spazi vanno quotati allo stesso modo.

```bash
pwd                         # dove sono
ls -la /etc | head          # contenuto della radice di configurazione
cd /var/log && ls ../lib    # percorso relativo con ..
```

Un **hard link** è un secondo nome per lo stesso inode: indistinguibile dall'originale. Un **symlink** contiene solo un percorso, viene risolto all'accesso e si rompe se il bersaglio si sposta (`ls -l` mostra la freccia).

```bash
ln archivio.txt copia-link        # hard link
ln -s /var/log/syslog log-oggi    # symlink
ls -l copia-link log-oggi
```

## Inode: l'identità del file

Un **inode** è la struttura del filesystem che descrive un file, indipendente dal nome: tipo, owner, gruppo, permessi, dimensione, timestamp, contatore di link e puntatori ai blocchi dati. Il nome vive nella directory, che è una tabella "nome → numero di inode".

Conseguenze:

- rinominare un file non ne cambia l'inode (se resta sullo stesso filesystem);
- un file ancora aperto da un processo occupa spazio anche dopo `rm`: il link viene rimosso, i blocchi si liberano quando il descriptor finale viene chiuso (ecco perché `df` può restare pieno);
- un file "cancellato" che occupa spazio è spesso aperto da un processo: `lsof +L1` lo trova.

```bash
stat /etc/hosts
ls -li /etc/hosts            # -i stampa il numero di inode
```

ext4, XFS, Btrfs, APFS e NTFS hanno inode o equivalenti con dettagli diversi: conta il concetto, non il numero.

## La stringa dei permessi

`ls -l` produce una riga che comincia con dieci caratteri:

```text
-rw-r--r--  1 anna devs  1204 nov 12 10:21 report.txt
drwxr-x---  2 anna devs  4096 nov 12 10:21 archivio
lrwxrwxrwx  1 anna devs    12 nov 12 10:21 log-oggi -> /var/log/syslog
```

- il primo carattere è il tipo: `-` file, `d` directory, `l` symlink, `c`/`b` dispositivi;
- i tre gruppi di tre lettere sono i permessi per **owner**, **gruppo** e **altri**;
- `r` = read, `w` = write, `x` = execute. Per le directory il significato cambia: `r` elenca i nomi, `w` crea/rimuove voci, `x` attraversa (permette di accedere ai file interni). Senza `x` non importa avere `r`: non entri.

Ogni gruppo vale come numero ottale: `r=4`, `w=2`, `x=1`. Quindi `rwx` = 7, `r-x` = 5, `r--` = 4.

```bash
chmod 640 report.txt          # owner rw, gruppo r, altri nulla
chmod u+x script.sh           # aggiungi esecuzione all'owner
chmod g-x archivio            # togli esecuzione al gruppo
```

`umask` controlla i permessi che i processi *tolgono* a file e directory nuovi. Con `umask 022` un nuovo file nasce `644` e una nuova directory `755`.

## Owner, gruppo e bit speciali

Il **owner** è un utente, il gruppo è uno solo per file (più i gruppi supplementari dell'utente). `chown` cambia entrambi, `chgrp` solo il gruppo:

```bash
sudo chown anna:devs report.txt
chgrp devs report.txt
id                            # uid, gid e gruppi dell'utente corrente
```

Tre bit speciali cambiano il comportamento:

- **setuid** (`s` al posto di `x` dell'owner): l'eseguibile gira con l'uid del proprietario. Il classico è `sudo`, che deve poter agire come root. Un setuid scritto male è una falla grave: non creare script setuid.
- **setgid** sulla directory: i file creati dentro ereditano il gruppo della directory. Utile per cartelle condivise da un team.
- **sticky bit** (`t` negli "altri", come `/tmp`): solo owner del file, owner della directory o root possono cancellare. Senza, chiunque può cancellare i file altrui in una directory condivisa.

```bash
find / -perm -4000 -type f 2>/dev/null   # binari setuid (da leggere con curiosità)
chmod 1777 /percorso/cartella-condivisa
```

## Utenti, root e isolamento

Su Unix `root` (uid 0) bypassa i controlli sui permessi. Per questo i servizi non devono girare come root: si crea un utente dedicato e si usa `sudo` o un'unità di servizio con utente limitato. `sudo` non è magia: è un binario setuid che verifica `/etc/sudoers` e registra l'operazione.

Il controllo reale non è solo il bit `rwx`: il kernel verifica anche path e mount. Una directory genitrice senza `x` blocca l'accesso al figlio, e i mount `noexec`, `nodev`, `nosuid` riducono ciò che un filesystem può eseguire.

Windows usa un modello diverso (ACL per oggetto, SID, token), ma la domanda resta: chi è l'utente, in che gruppo, con quali diritti.

## Osservare lo spazio e i mount

```bash
df -h                 # spazio per filesystem, più affidabile di un "pieno" a occhio
df -i                 # uso degli inode: un filesystem può finire gli inode prima dei byte
mount | head          # cosa è montato e con quali opzioni (ro, nosuid, ...)
du -sh ~/.cache       # spazio usato da una directory
```

Su macOS `df -h` e `mount` funzionano, e `ls -le` mostra le ACL estese. Su Windows: `Get-PSDrive` per lo spazio, `icacls file` per i permessi.

## Sicurezza

- **Dare `777` a un problema di permessi è quasi sempre sbagliato**: rimuove l'isolamento che stai cercando di usare. Se un servizio non legge una directory, aggiungi il suo utente al gruppo giusto o sposta i dati.
- **Controlla i setuid dopo aggiornamenti e deploy**: un binario in più con setuid amplia la superficie d'attacco.
- **Symlink in directory scrivibili da altri** (`/tmp`): possono redirigere una scrittura privilegiata. Usa `mktemp`, che crea nomi sicuri e privati.
- **`chmod -R` su directory condivise** è un cambio globale e silenzioso: nessuna conferma. Elenca prima cosa cambia con `find ... -ls`.

## Errori comuni

- **"Permission denied" senza controllare il percorso**: spesso manca `x` sulla directory genitrice, non sul file.
- **Confondere `r` e `x` sulle directory**: con `r` senza `x` puoi leggere i nomi ma non aprire i file.
- **Pensare che `rm` liberi sempre spazio**: un file aperto da un processo resta allocato.
- **Percorsi relativi negli script di servizio**: la working directory cambia; usa percorsi assoluti o calcola la directory dello script.

## In sintesi

- Nome e inode sono cose diverse: hard link condividono l'inode, symlink puntano a un percorso.
- I permessi si leggono in proprietario, gruppo e altri, o come numeri ottali; sulle directory `x` governa l'accesso.
- `setuid`, `setgid` e sticky bit hanno effetti non ovvi: setuid è potenza, setgid è ereditarietà, sticky è protezione.
- Root bypassa i permessi: i servizi girano con utenti dedicati.
- `stat`, `df -i`, `ls -l` e `find -perm` rendono visibile ciò che a occhio sembra invisibile.

## Fonti

- `inode(7)` — inode e permessi su man7.org: https://man7.org/linux/man-pages/man7/inode.7.html
- `file-hierarchy(7)` — come la gerarchia standard organizza `/etc`, `/var`, `/tmp`: https://man7.org/linux/man-pages/man7/file-hierarchy.7.html
