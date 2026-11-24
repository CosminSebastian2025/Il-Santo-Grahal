In Linux tutto ciò che il sistema conosce è un file, e ogni file vive in un unico albero che parte da `/`. Capire dove finiscono configurazione, dati e dispositivi ti permette di leggere un sistema invece di indovinarlo; capire chi può leggere, scrivere o eseguire cosa ti permette di evitare sia i blocchi inspiegabili sia le configurazioni pericolose. Questa lezione copre la gerarchia standard (FHS), il modello utenti/gruppi e i permessi, e chiude con mount, `df` e `du`.

## Obiettivi

- Riconoscere le directory principali dell'albero Linux e sapere cosa contengono.
- Leggere una stringa di permessi come `-rw-r--r--` e tradurla in azioni concrete.
- Modificare permessi e proprietario con `chmod`, `chown`, `umask` e capire perché certe modifiche falliscono.
- Distinguere dispositivo fisico, filesystem, punto di mount e spazio occupato.
- Usare `df` e `du` per rispondere alla domanda "dove è finito lo spazio".

## La gerarchia standard

Il Filesystem Hierarchy Standard descrive una convenzione, non una legge fisica: le distribuzioni la rispettano quasi sempre. La regola mentale è separare ciò che è *del sistema* da ciò che è *dell'amministratore* da ciò che è *volatile*.

| Percorso | Contenuto | Note |
| --- | --- | --- |
| `/bin`, `/sbin` | binari essenziali (spesso link a `/usr`) | `/sbin` storicamente solo root |
| `/usr` | programmi, librerie e documentazione di sistema | condivisibile in sola lettura |
| `/usr/local` | software installato fuori dai pacchetti | scelta tipica di chi compila a mano |
| `/etc` | configurazione | file testuali, da versionare |
| `/var` | dati variabili: log, cache, spool, database | cresce nel tempo |
| `/home` | home degli utenti | `/root` è quella dell'amministratore |
| `/tmp` | temporanei | ripulito, a volte in RAM |
| `/dev`, `/proc`, `/sys` | dispositivi e kernel virtuali | esistono solo perché il kernel li espone |

Le directory virtuali confondono spesso: `/proc` non occupa spazio su disco, è una finestra sul kernel. Leggere `/proc/uptime` significa chiedere al kernel di formattare un valore al momento, non aprire un file immagazzinato; lo stesso vale per `/sys`, che espone l'hardware. Fare backup di queste directory non ha senso.

## Utenti, gruppi e la stringa dei permessi

Ogni file ha un proprietario, un gruppo e tre triple di permessi. `ls -l` li mostra nella prima colonna.

```bash
touch progetto.sh
ls -l progetto.sh      # -rw-r--r-- 1 mario dev 0 nov 7 10:00 progetto.sh
chmod 750 progetto.sh  # -rwxr-x---
ls -ld /var/log
```

La stringa si legge a gruppi di tre: `r` lettura, `w` scrittura, `x` esecuzione. Sulle directory i significati cambiano e sono la fonte di metà degli incomprensioni: `r` permette di elencare i nomi, `x` di attraversare la directory (aprire un file noto al suo interno), `w` di creare o cancellare voci. Una directory `r--` è elencabile ma inutilizzabile; una `--x` è attraversabile ma non elencabile, ed è il modo di condividere un path senza mostrare i fratelli.

```bash
mkdir riservata
chmod 700 riservata          # solo io entro e leggo
chmod 755 pubblico           # tutti leggono, solo io scrivo
chmod o+t /tmp               # sticky bit: solo il proprietario cancella i propri file
```

Il bit `t` sulla directory condivisa impedisce a chiunque di cancellare i file altrui in `/tmp`: senza, la sola scrittura della directory permetterebbe di rimuovere qualsiasi voce.

`umask` decide i permessi dei file nuovi. Vale 022 in ambienti normali e 077 dove si trattano segreti: un file creato con `umask 077` nasce `600`, invisibile agli altri utenti del server.

```bash
umask              # tipicamente 0022
umask 077
touch chiave.conf
ls -l chiave.conf  # -rw-------
```

## Proprietà, privilegi e mount

`chown` cambia il proprietario e richiede root: un utente normale non può "regalare" i propri file a un altro, altrimenti eluderebbe quote e controlli di sicurezza. Usa `chgrp` se fai parte del gruppo di destinazione. Non cambiare i permessi senza aver verificato la causa: spesso il blocco non è sul file, ma su una directory superiore che non permette di attraversare.

```bash
sudo chown www-data:www-data /srv/sito
namei -l /srv/sito/index.html   # mostra i permessi di ogni componente del path
```

I filesystem non si "aprono", si montano: il kernel collega un dispositivo a una directory, il punto di mount, e il contenuto appare lì. `/etc/fstab` elenca i mount all'avvio; chiavi come `noexec` e `nosuid` sulle partizioni dati sono difese economiche.

```bash
findmnt -T /home        # quale dispositivo regge questo percorso
df -h                   # spazio per filesystem montato
df -i                   # inode: può esaurirsi prima dello spazio
```

`df` parla di filesystem montati, `du` di file raggiungibili da una directory. Il classico inganno è un file cancellato e ancora aperto: `du` non lo vede, `df` lo conta, e lo spazio non torna finché il processo non chiude. Lo trovi con `lsof +L1` o riavviando il servizio che lo tiene aperto.

```bash
du -sh /var/log/* | sort -h | tail -5
du -xhd1 / 2>/dev/null | sort -h | tail -10   # -x resta sul filesystem
```

L'opzione `-x` è importante: senza, `du /` attraversa anche `/proc` e i mount esterni e i totali diventano rumore.

## Controlli di accesso estesi

Accanto al modello classico esistono le ACL (`getfacl`, `setfacl`) per permessi per singolo utente e SELinux/AppArmor per politiche obbligatorie. Un utente può passare tutti i controlli `rwx` e ricevere comunque "Permission denied": la risposta non è `chmod 777`, è capire quale livello nega. `chmod -R 777` su una directory web è la firma di chi non ha trovato la causa: apre la scrittura a chiunque, upload compresi.

```bash
getfacl /srv/sito 2>/dev/null || echo "ACL non in uso qui"
ls -Z /srv/sito 2>/dev/null | head -3
```

## Errori comuni

- **Interpretare `x` sulle directory come sui file**: non c'è nulla da eseguire, serve il passaggio; il sintomo è "No such file or directory" su un file che esiste.
- **Usare `sudo` per aggirare `chown`**: si sistemano i sintomi e si lasciano file di root creati da processi che non dovrebbero scrivere lì.
- **Usare `du -sh /` senza `-x`**: attraversa tutti i mount, rallenta e conta due volte partizioni annidate.
- **Backup di `/proc` o `/sys`**: directory virtuali, copiare genera errori e file privi di senso.
- **Confondere `df` e `du`**: uno misura il filesystem, l'altro i file visibili da un punto dell'albero.

## In sintesi

- L'albero Linux separa sistema, configurazione, dati variabili e utenti; `/proc` e `/sys` sono viste sul kernel.
- I permessi sono tre triple per proprietario, gruppo e altri, ma sulle directory `r`, `w` e `x` valgono operazioni diverse.
- `umask` e `chown` definiscono cosa nasce e chi possiede; usa `namei -l` per scoprire quale componente nega l'accesso.
- `findmnt` mostra i mount, `df` lo spazio per filesystem, `du -x` lo spazio per directory: sono strumenti diversi per domande diverse.

## Fonti

- `file-hierarchy(7)`, la gerarchia del filesystem secondo systemd: https://man7.org/linux/man-pages/man7/file-hierarchy.7.html
- Filesystem Hierarchy Standard 3.0: https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html
- `credentials(7)`, utenti e gruppi nel kernel: https://man7.org/linux/man-pages/man7/credentials.7.html
- `inode(7)`, cosa contiene un inode e come si contano gli inode esauriti: https://man7.org/linux/man-pages/man7/inode.7.html
