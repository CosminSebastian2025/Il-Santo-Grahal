Un host appena acceso non sa il proprio indirizzo, non conosce il gateway e non ha un resolver, eppure deve raggiungere la rete. DHCP (Dynamic Host Configuration Protocol) risponde a questa domanda distribuendo indirizzi e parametri con un dialogo brevissimo sull'UDP. In questa lezione impari come è fatto quel dialogo, perché funziona anche con un server collocato in un'altra subnet e cosa contiene davvero un lease.

DHCP è definito da RFC 2131 (protocollo) e RFC 2132 (opzioni), con gli aggiornamenti di RFC 3396 per le opzioni lunghe. È un protocollo client/server su UDP: client sulla porta 68, server e relay sulla 67, con i primi pacchetti in broadcast perché il client non ha ancora un indirizzo.

## Obiettivi

- Descrivere il ciclo DORA e riconoscere i quattro messaggi nel traffico.
- Distinguere allocazione dinamica, automatica e statica e spiegare il ruolo del server autoritativo.
- Leggere un file di lease riconoscendo label, MAC, CID e durata.
- Capire come un relay consente a un server centrale di servire più subnet.
- Identificare le opzioni DHCP fondamentali e il loro codice numerico.

## Il dialogo DORA

Un client senza indirizzo apre la porta UDP 68 e invia un **DHCPDISCOVER** da `0.0.0.0:68` verso `255.255.255.255:67`, usando il proprio MAC come identificatore. Ogni server raggiunto risponde con un **DHCPOFFER** che propone indirizzo, lease time e parametri. Il client ne sceglie uno e lo richiede con **DHCPREQUEST**, diffuso in broadcast perché gli altri server scartino le loro offerte. Il server conferma con **DHCPACK**; se il pool si è svuotato nel frattempo risponde **DHCPNAK** e il client riparte da capo.

| Messaggio | Direzione | Scopo | Destinazione tipica |
| --- | --- | --- | --- |
| DHCPDISCOVER | client → broadcast | cerca server | `255.255.255.255:67` |
| DHCPOFFER | server → client | propone un indirizzo | broadcast o unicast al MAC |
| DHCPREQUEST | client → broadcast | accetta un'offerta o rinnova | `255.255.255.255:67` |
| DHCPACK | server → client | conferma il lease | broadcast o unicast |
| DHCPNAK | server → client | rifiuta la richiesta | broadcast |
| DHCPRELEASE | client → server | restituisce l'indirizzo | unicast |
| DHCPDECLINE | client → server | indirizzo già in uso | broadcast |

`DHCPDECLINE` copre i conflitti: un client verifica l'indirizzo offerto con ARP e, se qualcuno risponde, lo rifiuta e ricomincia. Per questo un server corretto non deve assegnare indirizzi già usati fuori dal pool.

```bash
# Osservare una negoziazione completa da un'altra macchina della LAN,
# mentre il client viene ricablato o il servizio di rete riavviato.
sudo tcpdump -i eth0 -n -vv 'udp port 67 or udp port 68'

# Forzare una nuova negoziazione con il client ISC
sudo dhclient -v -r eth0   # rilascia il lease corrente (DHCPRELEASE)
sudo dhclient -v eth0      # negozia da capo
```

Con `-v` `dhclient` stampa i passi, e la riga finale `bound to 192.168.10.42 -- renewal in 600 seconds` mostra lease time e T1 già calcolati.

## Lease: stato, durata e database

Il lease è il contratto con cui il server concede un indirizzo per un tempo limitato. L'RFC 2131 usa le variabili `T1` e `T2`, rispettivamente metà e sette ottavi della durata: il client rinnova in quei momenti.

1. **Rinnovo (T1)**: `DHCPREQUEST` in unicast al server che ha concesso il lease.
2. **Rebinding (T2)**: se il server tace, la richiesta torna in broadcast a qualunque server DHCP.
3. **Scadenza**: senza risposta entro il lease time il client abbandona l'indirizzo e riparte dal `DHCPDISCOVER`, potendone ottenere uno diverso.

Il server ISC registra tutto in `/var/lib/dhcp/dhcpd.leases`, un file di testo con un blocco per lease: le label `active`, `free`, `abandoned` e `backup` raccontano lo stato di quell'indirizzo.

```text
lease 192.168.10.42 {
  starts 3 2026-11-11 08:12:04;
  ends 3 2026-11-11 20:12:04;
  cltt 3 2026-11-11 08:12:04;
  binding state active;
  next binding state free;
  hardware ethernet 52:54:00:a1:b2:c3;
  uid "\001RT\303\252\261\030\237";
  client-hostname "portatile-ufficio";
}
```

Il campo `uid` è il client identifier (opzione 61): quando è presente il server identifica la macchina con quello e non con il MAC, così il lease segue una scheda USB o una VM migrata. Le date sono in UTC.

## Relay: un server per molte subnet

Un broadcast si ferma al router, quindi un server su un'altra subnet ha bisogno di un **relay agent** in ascolto sulla porta 67 della LAN. Il relay riceve il broadcast, lo inoltra in unicast al server aggiungendo l'opzione 82 (RFC 3046) con subnet di provenienza e interfaccia; la risposta torna al relay, che la rimette in broadcast sulla LAN giusta.

```bash
# Un relay Linux è lo stesso demone dhcrelay:
#   dhcrelay -4 -i eth1 192.168.1.10
# eth1 è l'interfaccia della LAN servita, 192.168.1.10 il server DHCP
```

Il server deve avere una dichiarazione `subnet` che copra l'indirizzo di relay (`giaddr`) e un `range` per quella rete, altrimenti ignora la richiesta. Lo stesso effetto si ottiene con il router come relay o con `dnsmasq`, ma il formato del messaggio non cambia.

## Opzioni e server autoritativo

Le opzioni sono terne codice-lunghezza-valore; senza l'opzione 53 un pacchetto DHCP sarebbe indistinguibile da BOOTP.

| Codice | Opzione | Contenuto |
| --- | --- | --- |
| 1 | Subnet Mask | maschera della rete servita |
| 3 | Router | gateway predefinito |
| 6 | Domain Name Server | lista di resolver |
| 15 | Domain Name | nome di dominio |
| 51 | IP Address Lease Time | durata in secondi |
| 53 | DHCP Message Type | DISCOVER, OFFER, REQUEST… |
| 54 | Server Identifier | IP del server DHCP |
| 58 | Renewal (T1) Time | quando chiedere il rinnovo |
| 59 | Rebinding (T2) Time | quando passare al broadcast |
| 82 | Relay Agent Information | subnet e porta del client |

L'opzione **54** è l'indirizzo del server, non del client: distingue più offerte e indirizza il rinnovo. La 53 è obbligatoria, mentre 51, 55 (parameter request list) e 57 (maximum message size, 576 byte) accompagnano quasi sempre la negoziazione.

Un server ISC è **authoritative** per una subnet solo dopo un `authoritative;` globale o di subnet. Senza questa dichiarazione non manda `DHCPNAK` per gli indirizzi sbagliati e resta passivo: comportamento desiderabile per un server di scorta, dannoso per un server unico.

## Errori comuni

- **Dimenticare `authoritative`**: il server non nega gli indirizzi errati e il client resta appeso su richieste di subnet sbagliate.
- **Pool sovrapposto ai parametri**: se il range include il gateway o il server stesso nascono conflitti e `DHCPDECLINE`.
- **Bloccare il broadcast**: `DISCOVER` e `REQUEST` iniziali vanno a `255.255.255.255`, e un filtro che li scarta ferma tutto.
- **Ignorare l'opzione 82**: con relay attivi i lease finiscono nel pool sbagliato e propongono indirizzi non raggiungibili.
- **Lease troppo brevi su reti grandi**: ogni scadenza genera traffico, e lease da pochi minuti moltiplicano le rinnovazioni.

## In sintesi

DHCP è un dialogo di quattro messaggi su UDP, porte 67 e 68, che consegna indirizzo, gateway, DNS e scadenza. Il lease limita la concessione e il client rinnova a metà vita prima di tornare in broadcast. Il relay con l'opzione 82 porta il servizio a più subnet da un unico server. Le opzioni trasportano i parametri e `authoritative` distingue un server che decide da uno che aspetta.

## Fonti

- [RFC 2131 - Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131)
- [RFC 2132 - DHCP Options and BOOTP Vendor Extensions](https://www.rfc-editor.org/rfc/rfc2132)
- [RFC 3046 - DHCP Relay Agent Information Option](https://www.rfc-editor.org/rfc/rfc3046)
- [ISC DHCP - pagine dhcpd](https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd)
- [ISC DHCP - pagine dhcp-options](https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options)
