IPsec è una suite di protocolli che aggiunge autenticazione e cifratura ai pacchetti IP senza cambiare le applicazioni. A differenza di TLS, che vive sopra TCP, IPsec lavora al livello di rete: protegge host e reti intere, comprese le intestazioni originali, e per farlo separa la negoziazione delle chiavi dal trattamento dei pacchetti. In questa lezione vedi i due protocolli di dati, le due modalità e i due usi tipici.

## Obiettivi

- Distinguere AH ed ESP e sapere quando ciascuno serve davvero.
- Confrontare la modalità transport e la modalità tunnel.
- Riconoscere site-to-site e remote access in una configurazione IPsec.
- Capire il ruolo di IKEv2 nella negoziazione delle chiavi.
- Leggere i termini SA, SPI, selector e policy in un'implementazione reale.

## La suite IPsec

IPsec è definito nell'architettura di RFC 4301: un insieme di regole per selezionare il traffico da proteggere, applicare uno o più protocolli e gestire le chiavi. I pezzi sono tre.

| Componente | Ruolo | Documento |
| --- | --- | --- |
| AH | autenticazione dell'intero pacchetto, intestazioni comprese | RFC 4302 |
| ESP | cifratura e autenticazione del contenuto | RFC 4303 |
| IKEv2 | negoziazione di algoritmi, chiavi e identità | RFC 7296 |

Quando un pacchetto esce, il sistema consulta una **policy**: per questa coppia sorgente/destinazione applica ESP in tunnel, oppure scarta, oppure lascia passare. La policy punta a una **SA** (Security Association), che è la direzione monodirezionale con le chiavi e il contatore dei pacchetti già installati nel kernel. Ogni tunnel funzionante ha almeno due SA dati, una per direzione.

## AH, ESP e le modalità

AH autentica il pacchetto, inclusa l'intestazione IP esterna, ma non cifra niente. È pensato per dimostrare che origine e contenuto sono integri anche contro manomissioni delle intestazioni. In pratica AH non sopravvive al NAT, perché il NAT riscrive gli indirizzi e i checksum, quindi l'autenticazione fallisce. ESP invece cifra il payload e lo autentica; la sua intestazione non è firmata nella stessa misura, ma il traffico attraversa NAT Tranversal senza problemi. Per questo le implementazioni moderne usano ESP e confinano AH a scenari chiusi o legacy.

La **modalità transport** aggiunge l'intestazione IPsec tra quella IP e il payload, e viene usata quando gli estremi IP sono gli stessi che vogliono proteggersi: due host che parlano direttamente. La **modalità tunnel** incapsula il pacchetto IP originale intero dentro un nuovo pacchetto IP, con indirizzi esterni dei gateway e indirizzi interni originali intatti. È la modalità normale per site-to-site e per remote access.

```bash
# Le policy dicono quali sottoreti devono essere protette e con quale modalità
ip route get 10.50.2.10        # dalla rete interna, quale gateway raggiunge l'altra sede
sudo ip xfrm policy list       # mostra le policy, cioè "chi deve essere protetto"
```

| Aspetto | Transport | Tunnel |
| --- | --- | --- |
| Indirizzi visibili | gli stessi pacchetti originali | esterni dei gateway |
| Modalità NAT | non compatibile (AH), ostica (ESP) | NAT-T su UDP 4500 |
| Uso tipico | host-to-host, L2TP/IPsec | site-to-site, remote access |
| Effetto sui pacchetti | nuovo header intermedio | nuovo header IP esterno |

## Site-to-site e remote access

Nell'IPsec **site-to-site** due gateway stabiliscono una relazione IKE e poi una serie di child SA, una per ogni coppia di selector di traffico. Una child SA non è un tunnel a sé: è l'insieme di policy che copre una sottorete. Se le sedi hanno più VLAN, ognuna ha di solito la propria child SA, ed è normale vedere `--list-sas` con più voci.

Nell'**IPsec remote access** il concentratore assegna al client un indirizzo da un pool e crea una child SA per ogni client. Qui servono identità per utente o dispositivo (certificati, EAP, PSK) e policy per client. Per questo i deployment enterprise preferiscono IKEv2 con certificati e, quando serve più flessibilità a livello applicativo, combinano IPsec con un tunnel sopra, come nel classico L2TP/IPsec (RFC 3193) usato per decenni sui client desktop.

```bash
sudo swanctl --list-sas
# output tipico (semplificato):
#   site2site: #3, ESTABLISHED, IKEv2, 9f2c..._i 7a11..._r
#     local  '10.1.0.1' @ 203.0.113.10[500]
#     remote '10.2.0.1' @ 198.51.100.20[500]
#     net-1: #1, reqid 1, INSTALLED, TUNNEL, ESP in UDP SPIs: c3a1_i 128b_r
#       local  10.1.0.0/24  remote  10.2.0.0/24
```

## IKEv2 in breve

IKEv2 è un protocollo a scambio di messaggi che in quattro packet (un IKE_SA_INIT e un IKE_AUTH, ciascuno con risposta) stabilisce la prima SA, autentica le due parti e crea le SA dati. I miglioramenti rispetto a IKEv1 sono la riduzione degli scambi, la gestione dell'incidente asimmetrico, il supporto nativo a NAT traversal e MOBIKE per il cambio di indirizzo del client.

```bash
# Una proposta IKEv2 specifica cifratura, pseudocasuale e gruppo DH
# ike = aes256gcm16-prfsha256-modp2048
# esp = aes256gcm16-modp2048
sudo swanctl --list-conns     # verifica quali proposal sono caricate
```

IKEv2 negozia algoritmi e identità, ma la cifratura del traffico utente è di ESP: un ESP forte con PSK condivisa da cinquanta dispositivi e mai ruotata resta un rischio organizzativo.

## Errori comuni

- **Credere che AH cifri**: AH garantisce autenticazione e integrità, non riservatezza; se il contenuto deve essere nascosto serve ESP.
- **Usare AH su connessioni che attraversano NAT**: il NAT riscrive l'intestazione e l'integrità salta; serve ESP con NAT-T.
- **Confondere transport e tunnel**: in transport gli estremi sono gli host, in tunnel sono i gateway, e le policy devono riflettere questa differenza.
- **Pensare che una SA sia un'intera VPN**: una child SA copre una coppia di selector; più sottoreti significano più child SA.
- **Mischiare identità e cifratura**: autenticare bene con IKEv2 non compensa algoritmi ESP deboli o chiavi condivise non ruotate.

## In sintesi

- IPsec separa policy, SA e negoziazione: le policy selezionano il traffico, le SA portano le chiavi.
- ESP è la scelta normale perché cifra e attraversa NAT; AH autentica senza cifrare ed è confinato a scenari specifici.
- Transport protegge da host a host, tunnel protegge reti intere con pacchetti incapsulati.
- Site-to-site collega apparati, remote access collega identità e richiede pool, certificati e policy per client.
- IKEv2 è il piano di controllo moderno, ma la sicurezza finale dipende dagli algoritmi e dalla gestione delle chiavi.

## Fonti

- [RFC 4301 — Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301)
- [RFC 4302 — IP Authentication Header](https://www.rfc-editor.org/rfc/rfc4302)
- [RFC 4303 — IP Encapsulating Security Payload (ESP)](https://www.rfc-editor.org/rfc/rfc4303)
- [RFC 7296 — IKEv2](https://www.rfc-editor.org/rfc/rfc7296)
- [strongSwan — IPsec protocol](https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html)
