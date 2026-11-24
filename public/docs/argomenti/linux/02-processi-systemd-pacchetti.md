Un processo è un programma in esecuzione con la sua memoria, il suo utente e la sua parentela; la sua morte, pacifica o forzata, passa da segnali. Su una distribuzione moderna quasi tutto ciò che resta in esecuzione dopo il boot è gestito da systemd, che con `systemctl` e `journalctl` trasforma "riavvia il servizio" e "cosa è andato storto" in due comandi precisi. L'ultima parte copre i pacchetti: installare, aggiornare e sapere cosa è rimasto indietro con apt e dnf.

## Obiettivi

- Leggere processi, PID, parentela e stato con `ps` e capire cosa cresce con `top`/`htop`.
- Inviare segnali con la scala giusta: `TERM` prima di `KILL`, e perché `KILL` non sempre basta.
- Gestire unità con `systemctl` e saper leggere i log di un servizio con `journalctl`.
- Mascherare, abilitare e ricaricare un servizio sapendo la differenza tra le tre cose.
- Distinguere il modello apt/Debian da dnf/Fedora-RHEL senza confonderne i comandi.

## Processi e parentela

Ogni processo ha un PID, un padre (PPID), un utente e uno stato. Il PID 1 su un sistema con systemd è systemd stesso: ogni altro processo appartiene a un albero che risale a lui. Un processo non "sparisce" quando il padre muore: viene adottato dal PID 1, ed è proprio uno dei motivi per cui i servizi vanno lanciati da systemd e non da un `nohup` improvvisato.

```bash
ps -eo pid,ppid,user,stat,comm --sort=-%cpu | head
ps --ppid 1 -o pid,comm           # figli diretti di systemd
```

La colonna `STAT` ha sigle essenziali: `S` dorme in attesa, `R` in esecuzione, `D` attesa di I/O, `Z` zombie (terminato ma non raccolto dal padre), `T` fermo. Uno zombie non consuma CPU né memoria: consuma una riga di tabella e indica un bug nel padre che non chiama `wait`.

```bash
pgrep -a nginx
pstree -p 1234
```

`pgrep` cerca per nome o pattern, `pstree` mostra la gerarchia. Prima di terminare qualcosa, verifica *cosa* è: un `python3` può essere il tuo script di test o un processo di sistema.

## Segnali: la scala giusta

I segnali sono notifiche asincrone al kernel. `SIGTERM` (15) chiede al processo di terminare, e un programma ben scritto chiude file e connessioni. `SIGKILL` (9) non può essere intercettato: il kernel rimuove il processo, lasciando eventuali file temporanei e lock aperti. `SIGHUP` (1) chiede a molti demoni di ricaricare la configurazione; `SIGSTOP`/`SIGCONT` sospendono e riprendono.

```bash
kill -TERM 1234
sleep 5
kill -0 1234 2>/dev/null && kill -KILL 1234   # -0 controlla solo l'esistenza
pkill -HUP nginx
```

La sequenza `TERM`, attesa, `KILL` evita di perdere dati. Un processo in stato `D` ignora anche `KILL` finché l'I/O non si sblocca: se `kill -9` sembra non funzionare, il problema è probabilmente un mount bloccato.

```bash
kill -- -1234     # segnala il gruppo di processi intero
```

Il segno meno indica il gruppo: utile con script che rilanciano sottoprocessi.

## systemd: unità e servizi

systemd organizza il sistema in unità: `service` per i processi gestiti, `timer` per le scadenze, `socket` per l'attivazione su connessione, `target` per gli stati complessivi al posto degli old runlevel. Le unità di distribuzione vivono in `/usr/lib/systemd/system`, quelle scritte da te in `/etc/systemd/system` e vincono laddove abbiano lo stesso nome.

| Comando | Effetto | Sopravvive al reboot |
| --- | --- | --- |
| `systemctl start app` | avvia ora | no |
| `systemctl enable app` | abilita all'avvio | sì (al prossimo boot) |
| `systemctl enable --now app` | le due cose insieme | sì |
| `systemctl disable app` | non parte più all'avvio | rimane avviato ora |
| `systemctl mask app` | rende impossibile avviarla, anche come dipendenza | sì |

La differenza tra `stop` e `disable` e tra `disable` e `mask` è la principale fonte di confusione. `stop` spegne adesso; `disable` toglie il link che la avvia al boot; `mask` punta l'unità a `/dev/null` e vince su qualunque dipendenza.

```bash
systemctl status app --no-pager
systemctl restart app
systemctl reload-or-restart app
systemctl list-units --type=service --state=failed
systemctl cat app                 # file effettivo, frammenti inclusi
systemctl edit app --full         # override senza toccare il pacchetto
```

`systemctl edit` crea drop-in in `/etc/systemd/system/<unità>.service.d/`: modifica le configurazioni dei pacchetti in modo che gli aggiornamenti di distribuzione non le sovrascrivano. Dopo aver modificato file `.service` serve `daemon-reload`.

```ini
[Service]
Restart=on-failure
RestartSec=3
MemoryMax=512M
User=appuser
```

## journald e pacchetti

`journalctl` legge i log strutturati di journald: filtrare per unità, priorità, tempo e PID.

```bash
journalctl -u app -n 50 --no-pager
journalctl -u app --since "10 min ago" -p err
journalctl -b -1 -p warning      # boot precedente
journalctl -f -u app
```

Se un servizio è "active" ma si chiude subito, `journalctl -u app -n 100` spiega il perché; `systemctl status` mostra solo le ultime righe. Un servizio che muore in loop con `Restart=` attivo sembra vivo: il contatore dei restart in `status` è l'indizio.

I pacchetti chiudono il cerchio: i file di `/usr/lib/systemd/system` arrivano da lì. Debian/Ubuntu usano dpkg e apt, Fedora/RHEL usano rpm e dnf.

```bash
sudo apt update && sudo apt upgrade
apt list --upgradable
dpkg -S /usr/bin/curl        # quale pacchetto possiede questo file
sudo dnf update
dnf provides /usr/bin/curl
```

Il comando equivalente in dnf è `provides`; la ricerca è `apt search` contro `dnf search`. Non mescolare i gestori sulla stessa macchina. Dopo un aggiornamento del kernel serve un riavvio: `dnf needs-restarting -r` o il file `/var/run/reboot-required` lo dicono.

## Errori comuni

- **`kill -9` come prima scelta**: si perdono buffer non scritti, restano lock e file temporanei, e il problema torna.
- **Confondere `start` con `enable`**: al reboot il servizio sparisce e sembra un guasto casuale.
- **Modificare l'unità in `/usr/lib/systemd/system`**: il pacchetto sovrascrive le modifiche; usa drop-in in `/etc/systemd/system`.
- **Lettura del journal senza `-u`**: pagine di log di tutto il sistema per le cinque righe del tuo servizio.
- **Aggiornare senza riavviare dopo il kernel**: la macchina gira sul vecchio kernel e resti esposto alle vulnerabilità corrette.

## In sintesi

- Ogni processo ha un albero, un utente e uno stato: `ps`, `pgrep` e `pstree` rispondono a "chi è questo".
- I segnali hanno una scala: `TERM` prima, `KILL` dopo; i processi in `D` ignorano anche `KILL` finché l'I/O non si sblocca.
- systemd gestisce unità; `enable` riguarda il boot, `start` l'adesso, `mask` vince su tutto.
- `journalctl -u` è il posto dove trovare la causa dei cicli di restart, mentre apt/dnf e i loro strumenti di interrogazione spiegano da dove vengono i file di sistema.

## Fonti

- `systemd(1)`, panoramica delle unità e dei comandi: https://man7.org/linux/man-pages/man1/systemd.1.html
- `systemd.unit(5)`, formato delle unità e drop-in: https://man7.org/linux/man-pages/man5/systemd.unit.5.html
- `journalctl(1)`, filtri e opzioni: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- `proc(5)`, cosa contengono `/proc/PID/status` e i contatori dei processi: https://man7.org/linux/man-pages/man5/proc.5.html
