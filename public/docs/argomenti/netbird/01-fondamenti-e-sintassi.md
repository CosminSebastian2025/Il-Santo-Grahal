NetBird è una piattaforma open source per costruire reti private sopra internet: installi un client su ogni macchina, le macchine si autenticano con un servizio centrale e si parlano direttamente con tunnel WireGuard cifrati, senza aprire porte in ingresso e senza un concentratore VPN che faccia da collo di bottiglia. In questa lezione capisci di quali componenti è fatta, come un peer entra in rete e cosa succede davvero quando due peer si scambiano un pacchetto.

## Obiettivi

- Riconoscere i quattro componenti: client, management, signal e relay.
- Descrivere il ciclo di vita di un peer, dalla generazione delle chiavi all'instradamento.
- Usare i comandi base del client per connettersi e verificare lo stato.
- Leggere lo spazio di indirizzi CGNAT e la naming dei peer.
- Distinguere connessione diretta e connessione relè.

## I quattro componenti

NetBird è un insieme di servizi, non un singolo demone. La documentazione ufficiale li separa per responsabilità e livello di fiducia, e quella separazione spiega perché il traffico dei dati non passa mai dal server.

| Componente | Ruolo | Il traffico utente ci passa? | Self-hostable |
| --- | --- | --- | --- |
| Client | genera le chiavi WireGuard, applica policy, DNS e routing | sì, è l'estremità del tunnel | su ogni macchina |
| Management | registro dei peer, chiavi pubbliche, gruppi, policy | no | sì |
| Signal | scambio dei candidati di connessione tra peer | no, è solo notifica | sì |
| Relay | inoltro di riserva quando la connessione diretta fallisce | sì, cifrato end-to-end | sì |

Il server è un piano di controllo, non un data plane: se il management cade, i tunnel già stabiliti continuano a funzionare finché i peer non devono negoziare nuove informazioni. Il Signal è un semplice meccanismo di notifica, paragonabile al segnale di WebRTC; il relay recupera con una rete WebRTC TURN basata su Coturn, con una nuova implementazione WebSocket introdotta dalla versione v0.29.0.

## Il ciclo di vita di un peer

Un peer è una macchina con il client installato e autorizzato. Il client genera una coppia di chiavi WireGuard e la chiave privata non lascia mai la macchina: il management riceve solo la chiave pubblica e la distribuisce ai peer autorizzati.

```bash
# installazione (Linux amd64) e primo contatto
curl -fsSL https://github.com/netbirdio/netbird/releases/latest/download/install.sh | sh

# accesso con setup key su un server self-hosted, senza browser
sudo netbird up --management-url https://api.example.com:443 --setup-key AAAA-BBBB-CCCC

# stato compatto, poi dettaglio delle connessioni
netbird status
netbird status -d
```

Il management assegna a ogni peer un indirizzo da 100.64.0.0/10, lo spazio Carrier-Grade NAT, con un blocco /16 per account e un indirizzo libero scelto casualmente all'interno. I peer si identificano anche con un nome in un dominio gestito dal servizio, e il client avvia un resolver DNS locale per tradurre quei nomi. Se preferisci controllare i valori, imposta le variabili `NB_MANAGEMENT_URL` e `NB_SETUP_KEY`, oppure passa le flag equivalenti.

```bash
export NB_MANAGEMENT_URL="https://api.example.com:443"
export NB_SETUP_KEY="AAAA-BBBB-CCCC"
netbird up            # le impostazioni client vengono salvate nel profilo attivo
netbird status --json # stessa informazione in JSON, utile negli script
```

## Dalla registrazione alla connessione

Quando due peer devono parlarsi, il client chiede al signal di mettere in contatto le due estremità; signal scambia i candidati (indirizzo e porta) e poi si ritira. Le due macchine provano l'attraversamento NAT con ICE e STUN e, se riescono, stabiliscono un tunnel WireGuard punto-punto. Se un NAT simmetrico o un firewall impedisce la connessione diretta, il relay inoltra i pacchetti cifrati: in `netbird status -d` la riga `Connection type` indica `P2P` o `Relayed`.

```bash
# le righe che contano nel dettaglio della connessione
netbird status -d | grep -E "Connection type|Direct|Last Wireguard handshake|Routes"
sudo wg show            # interfaccia wt0, handshake e trasferimento
ip addr show wt0        # indirizzo 100.64.0.0/10 del peer
```

L'interfaccia si chiama di default `wt0`, il tunnel usa WireGuard su UDP (porta 51820 in ascolto locale, ma nessuna porta in ingresso da aprire sul firewall perimetrale), e il client applica le regole di accesso in uscita: le policy arrivano dal management e il client le traduce in regole `nftables` o del firewall di sistema. Una peer che non ha mai ricevuto una policy che la autorizzi non riceve neppure la mappa del peer con cui parlare.

Il segreto di questa architettura è che ogni peer è sia client sia server del tunnel: non esiste un indirizzo centrale verso cui mandare tutto il traffico, e ogni coppia che deve comunicare ha il proprio percorso. Per questo una rete con venti peer ha bisogno di collegamenti logici pari a un mesh, mentre il tempo di setup è dominato dalla negoziazione dei candidati e non dalla configurazione degli apparati.

## Errori comuni

- **Aprire porte in ingresso sul firewall** — il modello funziona al contrario: i peer aprono connessioni in uscita e usano hole punching, quindi non serve nessuna regola in ingresso.
- **Confondere il management con un VPN server** — il server distribuisce chiavi e policy, non vede il traffico; un client bloccato dal management non perde i tunnel già attivi.
- **Trattare la chiave privata come un file di configurazione** — il client la genera e la conserva, e solo la chiave pubblica viene caricata sul management.
- **Pensare che 100.64.0.0/10 sia un indirizzo pubblico** — è lo spazio CGNAT usato nell'overlay: non è raggiungibile da fuori e non va annunciato su internet.
- **Ignorare `netbird status -d`** — una connessione `Relayed` funziona ma ha latenza e throughput diversi da una `P2P`; senza il dettaglio non distingui un problema di rete da un problema di policy.

## In sintesi

NetBird separa un piano di controllo (management e signal) da un piano dati che resta tra i peer. Il client genera le chiavi e non le condivide, il management distribuisce identità, indirizzi e policy, il signal aiuta la negoziazione e il relay interviene solo come riserva. Gli indirizzi arrivano dallo spazio CGNAT e il traffico utente resta protetto da WireGuard end-to-end anche quando passa dal relay. Il risultato è una rete privata che non richiede porte aperte in ingresso né un concentratore in mezzo.

## Fonti

- NetBird - How NetBird Works — https://docs.netbird.io/about-netbird/how-netbird-works
- NetBird - Client command line interface (CLI) — https://docs.netbird.io/get-started/cli
- NetBird - Ports & Firewalls — https://docs.netbird.io/about-netbird/ports-and-firewalls
- WireGuard - Fast, Modern, Secure VPN Tunnel — https://www.wireguard.com/
