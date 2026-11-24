Le chiavi SSH esistono per una ragione pratica: una password può essere indovinata, una chiave privata Ed25519 no. Ma la comodità si paga con la gestione: dove sta la chiave privata, chi la può leggere, come evitare di digitare la passphrase ogni volta, come far sapere al client quale chiave usare per quale host. Qui costruisci un setup leggibile — chiavi, agent, `config` — che resta sicuro anche quando hai venti server.

## Obiettivi

- Generare una coppia Ed25519 con passphrase e installarla correttamente.
- Capire a cosa serve `ssh-agent` e cosa *non* protegge.
- Scrivere un `~/.ssh/config` con blocchi per host, alias e `ProxyJump`.
- Verificare fingerprint e permessi senza debolezze.
- Diagnosticare il caso "la chiave giusta esiste ma il server la rifiuta".

## Generare e installare la chiave

```bash
ssh-keygen -t ed25519 -a 100 -C "alice@laptop-2026" -f ~/.ssh/id_ed25519_work
ssh-keygen -lf ~/.ssh/id_ed25519_work.pub
```

`-t ed25519` sceglie Ed25519 (chiavi piccole, veloci, non a rischio di curve possibili debolezze come le vecchie; niente RSA 2048). `-a 100` aumenta le iterazioni KDF per la passphrase. `-C` aggiunge un commento identificativo: serve per trovare e revocare la chiave in `authorized_keys`. Ottieni due file: `id_ed25519_work` (privato) e `id_ed25519_work.pub` (pubblico).

Installazione sul server, due strade:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519_work.pub alice@server.example
# oppure, manualmente:
cat ~/.ssh/id_ed25519_work.pub | ssh alice@server.example \
  'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
```

Su Windows 10/11 `ssh-keygen` e `ssh-copy-id` (in `C:\Windows\System32\OpenSSH` con PowerShell) esistono in versione OpenSSH nativa; se `ssh-copy-id` manca, usa la variante manuale in PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519_work.pub" |
  ssh alice@server.example "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

`authorized_keys` deve avere permessi `600` (o almeno non scrivibile da altri) e `~/.ssh` `700`. Un server rigoroso rifiuta una chiave "permissiva": è il caso più frequente di `publickey` rifiutata.

## Fingerprint: come riconoscere una chiave

Il fingerprint è l'hash (SHA256) della chiave pubblica. Si usa per confrontare "questa chiave" con "la chiave che mi aspetto", senza scambiare l'intero file.

```bash
ssh-keygen -lf ~/.ssh/id_ed25519_work.pub
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub     # sul server
```

```text
256 SHA256:AbCd...Zz alice@laptop-2026 (ED25519)
```

Annota il fingerprint nel tuo inventario: quando qualcuno ti chiede di autorizzare una nuova chiave, il confronto è immediato. Lo stesso comando serve per i fingerprint delle host key (`9bE...Q` visto con `ssh -v`).

## ssh-agent: comodità con confini chiari

`ssh-agent` tiene le chiavi private *decifrate* in memoria e le presenta al client quando serve. La passphrase si digita una volta, non a ogni connessione.

```bash
eval "$(ssh-agent -s)"            # avvia agent e imposta SSH_AUTH_SOCK (Linux/macOS)
ssh-add ~/.ssh/id_ed25519_work
ssh-add -l                        # chiavi caricate
ssh-add -t 3600 ~/.ssh/id_ed25519_work   # la scarta dopo un'ora
```

 Su Windows l'agent è il servizio "OpenSSH Authentication Agent" (da attivare in Servizi o con `Start-Service ssh-agent`); `ssh-add` funziona con il file PEM tradotto.

Il punto da non fraintendere: con l'agent attivo, chi è nel tuo utente può usare la chiave *tramite* l'agent. Non è la stessa cosa che leggere il file privato, ma per un attaccante già nella tua sessione il risultato è simile. La passphrase su disco e un tempo di scadenza (`-t`) restano la difesa.

L'agent forwarding (`ForwardAgent yes`) è comodo per saltare su un bastion host, ma espone il socket agent al server remoto: chi controlla il server può usare la tua chiave. Preferisci `ProxyJump` (lezione 3) alla forward.

## Il file config

`~/.ssh/config` è dove un setup scalabile diventa leggibile. Regole: blocchi `Host`, la prima corrispondenza vince, `*` in fondo come default, permessi `600`.

```text
# ~/.ssh/config
Host *
  IdentitiesOnly yes
  ServerAliveInterval 30
  ServerAliveCountMax 3

Host prod
  HostName prod-1.example.com
  User deploy
  Port 2222
  IdentityFile ~/.ssh/id_ed25519_work

Host bastion
  HostName bastion.example.com
  User alice
  IdentityFile ~/.ssh/id_ed25519_work

Host internal-*
  User deploy
  ProxyJump bastion
```

Con questo file:

```bash
ssh prod                 # usa porta 2222, utente deploy, chiave di lavoro
ssh internal-db          # passa dal bastion
git clone prod:p/clone   # sintassi scp-like, usa il blocco Host
```

`IdentitiesOnly yes` è un'opzione spesso sottovalutata: impedisce al client di offrire tutte le chiavi dell'agent (fino a "Too many authentication failures") e limita l'esposizione. `ForwardAgent no` in `Host *` è una scelta prudente.

Il controllo dei permessi non è un dettaglio: OpenSSH rifiuta `config` scrivibile da gruppo o altri. Verifica con `ls -l ~/.ssh` (che deve essere `700`) e `ls -l ~/.ssh/config` (`600`).

## Verificare prima di connettersi

```bash
ssh -G prod | grep -E '^(hostname|user|port|identityfile|proxyjump)'
ssh -T prod              # come test: prova autenticazione senza shell
ssh -vv prod 2>&1 | grep -E 'IdentityFile|Offering|Authentications that can continue'
```

`ssh -G` stampa la configurazione risolta senza connettersi: è il primo comando quando "l'opzione non viene applicata". `ssh -T` ferma la connessione al momento dell'autenticazione e ti dice se la chiave è accettata.

```bash
sudo sshd -T | grep -Ei 'permitrootlogin|passwordauthentication|pubkeyauthentication'
```

Controlla se `PubkeyAuthentication` è `yes` e che `AuthorizedKeysFile` punti dove hai messo il file. Se `-v` mostra `Offering public key` seguito da `Authentications that can continue: publickey`, il server ha visto la chiave ma non l'ha accettata: guarda i log di `sshd` per la ragione precisa.

## Sicurezza

- **Chiave privata = identità**: non copiarla su server, repository o backup non cifrati. Se è stata esposta, revocala: rimuovi la riga in `authorized_keys` di tutti i server e genera una nuova coppia.
- **Mai generare chiavi senza passphrase** per uso umano. Per automazioni (CI, deploy) usa una chiave dedicata, con `from=`/`command=` in `authorized_keys` se possibile, e ruotala.
- **`from="203.0.113.0/24"`**: nell'`authorized_keys` limita l'uso della chiave a determinati indirizzi. `command="..."` la limita a un solo comando.
- **Leggi `authorized_keys` periodicamente**: una chiave dimenticata di un ex collega è una porta aperta.

## Errori comuni

- **`chmod 644` su `~/.ssh` o su `authorized_keys`**: il server rifiuta la chiave senza spiegare perché.
- **Chiave sbagliata offerta**: file `config` con `IdentityFile` non applicato, o `IdentitiesOnly` assente e troppe chiavi nell'agent.
- **Aggiungere la chiave pubblica con `>>` su un file inesistente e permessi larghi**: `umask 077` prima di creare.
- **`ForwardAgent yes` su tutto**: convenienza che può diventare un incidente.
- **Copiare il fingerprint "a memoria" tra macchine**: usa `ssh-keygen -lf` e confronta per intero la stringa SHA256.

## In sintesi

- Ed25519, passphrase e commento identificativo sono lo standard per una chiave nuova, con `-a` per la KDF.
- L'agente evita di ridigitare la passphrase ma non è un confine di sicurezza: anche le sue chiavi sono usabili dall'utente.
- Un `~/.ssh/config` con blocchi, `IdentitiesOnly` e `ProxyJump` rende espresso ciò che altrimenti sarebbe digitato ogni volta.
- `ssh-keygen -lf`, `ssh -G` e `ssh -vv` sono la diagnosi standard.
- Permessi 600/700 e chiavi dedicate per automazioni sono la parte meno appariscente e più importante.

## Fonti

- Manuale OpenSSH — `ssh-keygen(1)`: https://man.openbsd.org/ssh-keygen
- Manuale OpenSSH — `ssh_config(5)`: https://man.openbsd.org/ssh_config
