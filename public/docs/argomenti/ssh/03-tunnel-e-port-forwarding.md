Il port forwarding trasforma una connessione SSH in un tunnel per altri protocolli. È utile quando un servizio ascolta solo su localhost, quando un database non deve essere esposto a Internet o quando bisogna attraversare un bastion host senza aprire nuove porte sul firewall. Le tre modalità — locale, remota e dinamica — si somigliano, ma cambiano chi apre la connessione, dove il traffico esce e quale host esegue la risoluzione dei nomi.

## Obiettivi

- Distinguere inoltro locale (`-L`), remoto (`-R`) e dinamico (`-D`).
- Scegliere l'opzione giusta per raggiungere un servizio interno o esporre un servizio locale.
- Usare `ProxyJump` per attraversare un bastion senza tunnel manuali.
- Riconoscere i rischi di un tunnel lasciato aperto.
- Diagnosticare un inoltro che si chiude subito o che non risponde.

## Inoltro locale: `-L`

`-L` apre una porta sulla macchina locale e manda il traffico, attraverso il server SSH, verso una destinazione raggiungibile dal server.

```bash
ssh -N -L 5433:db.internal:5432 utente@bastion.example.com
```

Da questo momento `localhost:5433` sulla tua macchina parla con `db.internal:5432` come se il database fosse locale. `-N` evita di aprire una shell; `-f` manda ssh in background dopo l'autenticazione. La struttura dell'argomento è `[bind_address:]porta_locale:host_destinazione:porta_destinazione`, e l'host di destinazione viene risolto **dal server**, non dal client: se il bastion non conosce `db.internal`, il tunnel si apre ma ogni connessione fallisce.

Il caso classico è il database protetto da firewall: il DB non ha un indirizzo pubblico, il bastion sì, e il tunnel evita di esporre la porta 5432 o di montare una VPN per una query.

Per limitare l'ascolto alla sola macchina locale, si scrive esplicitamente il bind address:

```bash
ssh -N -L 127.0.0.1:5433:db.internal:5432 utente@bastion.example.com
```

Per default OpenSSH ascolta già su loopback, ma dichiararlo rende il comando autoesplicativo e impedisce che una futura opzione `GatewayPorts` o un wrapper cambi il comportamento.

Il vero test del tunnel non è che `ssh` resta aperto, ma che la porta risponde:

```bash
ss -tlnp 'sport = :5433'                     # chi ascolta sulla porta locale
curl -sS http://127.0.0.1:5433/ 2>&1 | head  # oppure psql -h 127.0.0.1 -p 5433
```

Se `ss` mostra l'ascolto ma `curl` dà `connection reset`, il problema è nella destinazione lato server; se `ss` non mostra nulla, il tunnel non è mai stato stabilito (autenticazione, `-N` mancante, server che non permette il forwarding).

## Inoltro remoto: `-R`

`-R` fa il contrario: apre una porta sul server e la collega a una destinazione raggiungibile dal client.

```bash
ssh -N -R 8080:localhost:3000 utente@example.com
```

Chi si collega a `example.com:8080` arriva al servizio sulla tua porta 3000. Serve per mostrare un'applicazione locale a un collega, ricevere webhook durante un test o raggiungere una macchina dietro NAT. Per default l'inoltro remoto ascolta solo su loopback del server; esporlo su tutte le interfacce richiede `GatewayPorts clientspecified` sul server, e la scelta va fatta con piena consapevolezza.

Un uso frequente e più sicuro è il "reverse tunnel" per amministrare una macchina dietro NAT: la macchina interna mantiene una connessione uscente e il server pubblico inoltra l'accesso SSH, che resta comunque autenticato con chiavi.

```bash
# sulla macchina dietro NAT
ssh -N -R 127.0.0.1:2222:localhost:22 jump@hub.example.com
# dal server hub
ssh -p 2222 127.0.0.1
```

## Inoltro dinamico: `-D`

`-D` apre un proxy SOCKS sulla macchina locale. Il client SOCKS decide per ogni connessione la destinazione, che viene risolta e aperta dal server SSH.

```bash
ssh -N -D 1080 utente@example.com
curl --socks5-hostname 127.0.0.1:1080 https://internal.example.com/
```

È utile per raggiungere più servizi interni senza creare un `-L` per ciascuno. Non è una VPN: solo le applicazioni configurate per usare il proxy SOCKS passano dal tunnel, e la risoluzione dei nomi avviene dentro il tunnel solo se il client lo richiede (`--socks5-hostname` la manda al proxy; `--socks5` risolve localmente, che è ciò che vuoi evitare con nomi interni).

## ProxyJump: il bastion senza tunnel

Per attraversare un host intermedio non serve un `-L` manuale. `ProxyJump` incapsula la connessione:

```bash
ssh -J utente@bastion.example.com utente@server.internal
```

oppure, nel file `config`:

```sshconfig
Host server.internal
    HostName 10.0.0.20
    User deploy
    ProxyJump bastion.example.com
```

Il client apre una connessione verso il bastion e poi, dentro quella, una seconda connessione verso la destinazione. Rispetto a un tunnel locale è più pulito perché autenticazione e host key vengono verificate **per entrambi** gli host, e non serve creare una porta in ascolto. Le voci in `~/.ssh/known_hosts` restano due, una per host.

## Verificare e chiudere un tunnel

```bash
ssh -N -S ~/.ssh/ctl-%h-%p -f -L 127.0.0.1:5433:db.internal:5432 bastion
ssh -S ~/.ssh/ctl-%h-%p -O check bastion     # tunnel attivo?
ssh -S ~/.ssh/ctl-%h-%p -O exit bastion      # chiude il master e con esso l'inoltro
```

La socket di controllo (`-S`, oppure `ControlMaster` nel `config`) è il modo ordinato di gestire un tunnel in background: si sa quale processo chiudere, invece di cercare un `ssh` per caso con `ps`. Con `-S` il comando di check può anche restituire `Master running` o un errore, che è un exit code utile negli script.

Lato server, `ss -tlnp` (con privilegi) mostra le porte in ascolto e il processo: serve per confermare che un `-R` sia effettivamente attivo e su quale indirizzo.

## Rischi e limiti

- **Un tunnel è un accesso**: chiunque raggiunga la porta locale può usarlo. Su un portatile condiviso limita l'ascolto a `127.0.0.1` e chiudi il tunnel quando hai finito.
- **Le porte restano aperte**: `-L` e `-R` non hanno scadenza. Un processo dimenticato in background è una porta d'ingresso dimenticata.
- **Non è un controllo di accesso**: il tunnel non aggiunge autorizzazioni. Se il tuo utente può raggiungere il database, il tunnel lo raggiunge.
- **Il traffico può uscire dal server**: con `-D` o `-L` verso host esterni, il server diventa il punto di uscita. Su server condivisi rispetta le policy.
- **L'agent forwarding è più rischioso di `-J`**: `-A` espone il socket dell'agent al server, che può usare le tue chiavi; `ProxyJump` no.

## Errori comuni

- **`bind: Address already in use`**: la porta locale è occupata. Scegline un'altra o individua il processo con `ss -tlnp 'sport = :5433'`.
- **`channel 2: open failed: connect failed`**: il server non riesce a raggiungere la destinazione. Verifica nome, porta e risoluzione dal lato del server.
- **L'inoltro si chiude subito**: manca `-N` e la shell termina, oppure il server ha `AllowTcpForwarding no` (o un valore `local`/`remote` che esclude il tuo caso).
- **`-R` non raggiungibile dall'esterno**: il server ascolta solo su localhost. Non forzare `GatewayPorts` senza capire l'esposizione.
- **Tunnel usato per eludere controlli**: è un uso scorretto e spesso vietato dalle policy aziendali.

## Esercizi

1. Apri un inoltro locale verso un servizio di laboratorio e verifica con `curl` o `nc` che risponda su `127.0.0.1`.
2. Osserva con `ss -ltnp` (o l'equivalente del tuo sistema) quale porta locale è in ascolto e quale processo la occupa.
3. Configura `ProxyJump` verso un host interno e confronta `ssh -v` con e senza.
4. Apri un inoltro dinamico e verifica con `curl --socks5-hostname` che il traffico esca dal server.
5. Chiudi il tunnel e dimostra che la porta locale non risponde più.
6. Prova a creare un inoltro remoto su una porta occupata e leggi l'errore del server.

## In sintesi

- `-L` ascolta in locale e raggiunge qualcosa dal punto di vista del server; `-R` ascolta sul server e raggiunge qualcosa dal punto di vista del client; `-D` è un proxy SOCKS.
- La risoluzione dei nomi avviene dove il traffico esce: tienilo presente con nomi interni.
- `ProxyJump` è la forma preferita per i bastion, perché verifica entrambi gli host.
- Verifica con `ss` e chiudi con la socket di controllo, non a caso.
- Un tunnel è un accesso: limitane l'ascolto e la durata.

## Fonti

- Manuale OpenSSH — `ssh(1)`, inoltri e `-J`: https://man.openbsd.org/ssh
- Manuale OpenSSH — `ssh_config(5)`, `ProxyJump` e `GatewayPorts`: https://man.openbsd.org/ssh_config
