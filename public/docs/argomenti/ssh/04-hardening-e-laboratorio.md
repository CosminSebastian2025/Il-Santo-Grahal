Un server SSH esposto su Internet riceve tentativi di accesso continuamente. La configurazione predefinita di OpenSSH è ragionevole, ma non è pensata per un host pubblico: permette password, a volte il login di root, e non limita i tentativi in modo aggressivo. L'hardening consiste nel ridurre ciò che è permesso, verificare la configurazione prima di applicarla e saper leggere i log quando qualcosa non funziona. Chi lo fa a mano su un server di produzione ha un solo formato di errore: chiudersi fuori. Qui impari la procedura con la rete di sicurezza.

## Obiettivi

- Applicare le direttive `sshd_config` che riducono davvero la superficie d'attacco.
- Validare la configurazione con `sshd -t` e leggere la configurazione effettiva con `sshd -T`.
- Limitare utenti, tentativi e tempo di autenticazione, e proteggere la porta con il firewall.
- Diagnosticare un blocco di accesso senza disattivare i controlli.
- Riprodurre un hardening completo in un ambiente di laboratorio.

## Le direttive che contano

```sshconfig
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
AllowUsers deploy admin
AllowTcpForwarding no
X11Forwarding no
```

- **`PermitRootLogin no`** elimina il tentativo diretto su root; si entra con un utente normale e si usa `sudo` o `doas`.
- **`PasswordAuthentication no`** chiude la porta ai tentativi di indovinare password. Va fatto *dopo* aver verificato che l'accesso con chiave funzioni, con una sessione di riserva già aperta.
- **`KbdInteractiveAuthentication no`** evita che il server accetti password tramite PAM anche con l'autenticazione a password disattivata (`UsePAM` spesso è `yes`).
- **`MaxAuthTries 3`** limita i tentativi per connessione; **`LoginGraceTime 20`** riduce il tempo in cui una connessione non autenticata resta aperta.
- **`AllowUsers`** è una lista positiva: chi non è elencato non entra, anche se ha una chiave valida. Esiste anche `AllowGroups`, spesso più gestibile.
- **`AllowTcpForwarding no`** disattiva i tunnel se non servono; se servono, valuta `local` o `remote` in base al caso.

Queste direttive non sostituiscono firewall e rete. La porta non deve arrivare da tutta Internet se solo una rete fidata amministra il server: un firewall restrittivo (o un bastion con `ProxyJump`) riduce i tentativi di ordini di grandezza prima ancora che `sshd` li veda.

Il firewall va trattato con la stessa cautela del reload:

```bash
sudo ufw allow from 203.0.113.0/24 to any port 22 proto tcp   # Debian/Ubuntu
sudo firewall-cmd --permanent --add-rich-rule='rule family=ipv4 source address=203.0.113.0/24 service name=ssh accept'  # RHEL
```

Sul cloud, le regole del security group sono equivalenti e vanno applicate **dopo** aver confermato l'accesso dalla rete giusta.

## Applicare senza chiudersi fuori

La regola è semplice: non ricaricare `sshd` finché non hai una sessione di riserva già autenticata. Apri due terminali, entra con il secondo e lascialo aperto mentre modifichi il primo.

```bash
sudo sshd -t
sudo systemctl reload sshd
```

`sshd -t` controlla sintassi e file di chiave senza applicare nulla; dopo un errore, corregge il file e ripete. `reload` rilegge la configurazione e lascia le connessioni esistenti attive; `restart` le chiude tutte ed è più rischioso. Su distribuzioni diverse il servizio può chiamarsi `ssh` invece di `sshd`: verifica con `systemctl status`.

Il file effettivo può includere altri file, tipicamente `sshd_config.d/*.conf` su distribuzioni recenti:

```bash
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|maxauthtries|allowusers'
```

`sshd -T` stampa la configurazione risolta, cioè quella che il demone applicherà davvero. È il modo per scoprire che una riga in `sshd_config.d/` ha sovrascritto la tua, oppure che una direttiva è stata ignorata perché in un blocco `Match` non applicabile.

## Log e diagnosi

I tentativi falliti finiscono nel journal o in `/var/log/auth.log`, a seconda del sistema:

```bash
sudo journalctl -u sshd --since "10 min ago"
sudo journalctl -u sshd -g 'Invalid user|Failed|refused' -n 20
```

Da qui si distinguono tre casi: chiave non riconosciuta, utente non permesso, troppi tentativi. Per il client, `ssh -vvv` mostra quale chiave viene offerta e in che punto il server rifiuta. Non serve abbassare la sicurezza per capire: la sequenza dei messaggi basta quasi sempre.

Un elenco di messaggi da riconoscere:

- `Connection closed by authenticating user ... [preauth]`: il server ha rifiutato prima di accettare metodi; guarda `MaxAuthTries` e i log del client.
- `Invalid user nome from 203.0.113.7`: il nome non esiste sul sistema, non è un errore di chiave.
- `Accepted publickey for deploy from ...`: la chiave è stata accettata, il problema è a valle del login.

Per verificare la supervisione della superficie, `ss -tlnp 'sport = :22'` mostra su quale interfaccia ascolta `sshd`: se ascolta su `0.0.0.0` ma il firewall permette solo la rete fidata, il rischio è circoscritto; se ascolta anche IPv6 e il firewall è solo IPv4, hai una porta aperta che credevi chiusa.

Se hai appena disattivato le password e non entri più, usa la sessione di riserva ancora aperta per ripristinare `PasswordAuthentication yes`, ricaricare, entrare e correggere `authorized_keys`. Se non hai una sessione di riserva, serve la console del provider: è il motivo per cui la sessione di riserva non è un consiglio facoltativo.

## Errori comuni

- **Disattivare le password prima di testare la chiave**: è il blocco più comune. Testa `ssh -o PreferredAuthentications=publickey` prima di cambiare.
- **Modificare `sshd_config` e riavviare senza `sshd -t`**: un errore di sintassi può impedire l'avvio del servizio.
- **Dimenticare gli include**: una configurazione in `sshd_config.d/` può avere la precedenza. Controlla con `sshd -T`.
- **Affidarsi solo al cambio di porta**: non è hardening, è oscuramento. Un attaccante che scansiona la trova comunque.
- **Bloccare tutti gli IP dopo un errore**: rischi di escludere la tua rete. Usa regole esplicite e una via di recupero.
- **Disattivare la verifica delle host key per "semplificare" il provisioning**: non risolve il problema e rimuove l'unica difesa contro il MITM.

## Sicurezza

`sshd` registra gli indirizzi dei tentativi falliti: sono dati personali e vanno trattati secondo la policy di retention. L'hardening non è solo configurazione: chiavi dedicate per automazioni, rotazione quando un collega esce, `authorized_keys` con `from=` e `command=` dove possibile, e un backup della configurazione prima di ogni modifica. NIST SP 800-53 (controlli IA e AC) e le linee guida OWASP sugli injection sono il contesto formale per chi deve documentare la scelta.

## Laboratorio

Su una macchina virtuale locale (o un container con `sshd`):

1. Installa OpenSSH server e crea un utente `deploy` con una chiave pubblica in `~/.ssh/authorized_keys`, con `~/.ssh` a `700` e il file a `600`.
2. Verifica l'accesso con chiave e con password.
3. Applica le direttive dell'esempio, esegui `sshd -t`, ricarica e verifica con `sshd -T`.
4. Da un secondo terminale, tenta l'accesso con password e osserva il rifiuto nei log.
5. Tenta l'accesso con un utente non in `AllowUsers` e annota il messaggio.
6. Disattiva `AllowTcpForwarding` e verifica che un `ssh -L` fallisca con un errore chiaro.

## Esercizi

1. Elenca la configurazione effettiva con `sshd -T` e individua tre valori diversi dal default.
2. Spiega perché `KbdInteractiveAuthentication no` è necessario anche con `PasswordAuthentication no`.
3. Configura `AllowUsers` con due utenti e verifica che un terzo venga rifiutato.
4. Simula un errore di sintassi in `sshd_config`, esegui `sshd -t` e leggi il messaggio.
5. Trova nei log un tentativo fallito e ricostruisci il metodo usato.
6. Scrivi una checklist di cinque controlli da fare prima di dichiarare un server SSH "hardened".

<details>
<summary>Soluzione commentata dell'esercizio 2</summary>

Con `PasswordAuthentication no` il server rifiuta il metodo `password`, ma se `KbdInteractiveAuthentication` è `yes` e `UsePAM` è attivo, PAM può ancora proporre una sfida con password (`keyboard-interactive`), che il client usa come fallback. Il risultato sembra "password ancora attiva". Disattivare anche `KbdInteractiveAuthentication` chiude il fallback; il test è `ssh -o PreferredAuthentications=password,keyboard-interactive host`, che deve fallire.

</details>

<details>
<summary>Soluzione commentata dell'esercizio 5</summary>

```bash
sudo journalctl -u sshd --since today | grep -E 'Invalid user|Failed (password|publickey)' | tail -20
sudo journalctl -u sshd --since today | grep -c 'Invalid user'
```

Un `Invalid user root from 203.0.113.9 port 51422` indica un tentativo di login su un utente inesistente: non è una chiave malformata, è enumerazione. `Failed publickey for deploy` è invece una chiave offerta e rifiutata, e porta a controllare `authorized_keys` e i permessi. `MaxAuthTries` nei messaggi segnala il client che ha offerto troppe chiavi, spesso un agent con chiavi residue.

</details>

## In sintesi

- Le direttive chiave sono: niente root, niente password (né PAM), `AllowUsers`/`AllowGroups`, limiti ai tentativi, niente forwarding se non serve.
- `sshd -t` prima di ogni reload e una sessione di riserva sempre aperta.
- `sshd -T` rivela la configurazione realmente applicata, include compresi.
- Firewall restrictivo e `ProxyJump` riducono la superficie prima di `sshd`.
- I log distinguono utente inesistente, chiave rifiutata e troppi tentativi: ogni messaggio porta a un controllo diverso.

## Fonti

- `sshd_config(5)` — direttive del server: https://man.openbsd.org/sshd_config
- `sshd(8)` — `-t`, `-T` e comportamento del demone: https://man.openbsd.org/sshd
