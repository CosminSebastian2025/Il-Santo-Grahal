Quasi tutto ciò che fai in rete è un client che chiede e un server che risponde. Il modello sembra elementare, ma la separazione dei ruoli, la direzione delle connessioni e i confini di fiducia spiegano moltissimi incidenti reali. Qui impari a riconoscere il ruolo di ogni componente e a capire dove finisce la zona controllata da te.

## Obiettivi

- Definire client e server per **ruolo**, non per macchina.
- Riconoscere il server che a sua volta diventa client (proxy, load balancer).
- Descrivere i confini di fiducia e perché il client non è attendibile.
- Distinguere il modello a due livelli (browser e backend) da quello a più livelli.

## I ruoli

**Client** è chi inizia una comunicazione e formula una richiesta. **Server** è chi ascolta su un indirizzo e una porta, accetta connessioni e produce risposte. La stessa applicazione può fare entrambe le cose: un browser è client verso un sito e server verso le estensioni; un backend è server verso il browser e client verso il database.

```text
[browser] --HTTP--> [reverse proxy] --HTTP--> [applicazione] --TCP--> [database]
   client              server+client            server+client           server
```

Il reverse proxy (nginx, HAProxy, un load balancer cloud) è il caso classico: riceve dal client ed è client verso l'applicazione dietro di sé. Quando un load balancer distribuisce le richieste, apre connessioni indipendenti verso i backend, quindi il backend vede l'IP del bilanciatore, non quello dell'utente.

## Chi comincia la conversazione

La direzione di apertura è una scelta di progetto, non un vincolo fisico:

- **HTTP classico**: il client apre la connessione verso il server. Il server non può contattare il client su una porta arbitraria.
- **WebSocket**: il client apre una connessione HTTP e poi la "promuove" a un canale bidirezionale; il server continua a poter inviare messaggi solo su quella connessione già aperta.
- **Server-Sent Events**: il server invia in streaming sulla risposta HTTP già aperta dal client.
- **Webhook**: si simula il contrario, ma il server contatta il client su un endpoint pubblico che il client stesso ha registrato.

Se il client è dietro NAT o firewall, il server non può aprirgli una connessione dall'esterno: per questo esistono long polling, WebSocket, tunnel e code di messaggi.

## Confini di fiducia

Un confine di fiducia è il punto in cui cambia chi controlla i dati. Web, servizi e database hanno confini diversi:

| Zona | Chi controlla | Cosa puoi assumere |
| --- | --- | --- |
| Client | l'utente | nulla: codice, richieste e header possono essere modificati |
| Rete (Internet) | nessuno | qualsiasi: traffico osservabile e modificabile |
| Server applicativo | il team | il proprio codice e la propria configurazione |
| Backend/database | il team | accessibile solo dai servizi autorizzati |

La conseguenza operativa: **ogni input dal client va validato sul server**. Validare nel browser migliora l'esperienza, non la sicurezza. Lo stesso vale per il controllo degli accessi: nascondere un pulsante non impedisce una richiesta diretta all'endpoint.

Anche la direzione inversa ha un confine: il server non deve fidarsi ciecamente dei dati che il client invia come "già verificati" (un `user_id` nel corpo della richiesta, un prezzo nel carrello, un ruolo in un cookie non firmato).

## Livelli e responsabilità

I due livelli classici sono:

1. **Livello di presentazione** (client): raccoglie input, mostra risultati, gestisce la sessione visiva.
2. **Livello di servizio** (server): valida, applica regole di business, accede ai dati.

Modelli a tre livelli aggiungono un livello di dati separato. In tutti i casi vale una regola: le decisioni di autorizzazione stanno sul server, vicino ai dati, non nel client.

## Compiti del server

Un server ben progettato è responsabile almeno di:

- **autenticazione**: chi sta parlando;
- **autorizzazione**: cosa può fare;
- **validazione**: input coerenti, dimensioni limitate, tipi corretti;
- **isolamento**: un errore su una richiesta non deve compromettere le altre;
- **limiti**: timeout, dimensione massima del corpo, numero massimo di connessioni per client;
- **osservabilità**: log, metriche, tracing;
- **fail fast**: rifiutare rapidamente ciò che non può gestire, per non esaurire risorse.

Il client, dal canto suo, deve gestire retry, timeout, errori di rete e risposte parziali: il server non può garantire che la risposta arrivi.

## Esempi concreti

Vedere i componenti in azione con `curl` e `ss` chiarisce il modello.

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer demo" https://example.com
ss -tn state established '( dport = :443 or sport = :443 )'
```

Il primo comando ti mette nella parte del client. Il secondo mostra le connessioni TCP attive verso la porta 443: il tuo client è l'estremo che ha aperto la connessione, con una porta effimera locale e la porta 443 del server come destinazione.

```text
State  Recv-Q  Send-Q  Local Address:Port    Peer Address:Port
ESTAB  0       0       192.168.1.10:51234    93.184.215.14:443
```

Il numero `51234` è la **porta effimera** scelta dal sistema operativo. Un server che accetta connessioni ha invece una porta nota in ascolto e tante connessioni stabilite verso molte porte effimere dei client.

## Errori comuni

- **Chiamare "server" una macchina e non un ruolo**: una macchina può ospitare più server e client insieme; il web server è server per il browser e client per il database.
- **Fidarsi dell'IP del client per l'autorizzazione**: dietro proxy, load balancer o NAT l'IP visto è quello del livello intermedio. Usa header di inoltro attendibili solo se il proxy li imposta e li ripulisce.
- **Validare solo nel client**: è la prima cosa che un attaccante rimuove.
- **Trattare il server come infinitamente capace**: connessioni in attesa, thread e memoria sono risorse finite; senza limiti, un client lento o parallelo blocca gli altri.
- **Dimenticare il modello reverse**: il backend che legge l'IP come "utente" registra il load balancer per tutti.

## In sintesi

- Client e server sono ruoli: chi inizia la comunicazione e chi ascolta.
- Proxy e load balancer possono essere entrambi nello stesso flusso.
- Il client è ostile per definizione: ogni dato che arriva da lì va validato sul server.
- La direzione di apertura della connessione determina cosa è possibile (NAT, WebSocket, SSE, webhook).

## Fonti

- RFC 9110 — HTTP Semantics: definizioni di client, server e intermediari: https://www.rfc-editor.org/rfc/rfc9110.html
- MDN — HTTP: overview delle richieste e delle risposte: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview
