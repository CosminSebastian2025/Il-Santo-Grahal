Un servizio ToIP si rompe in modi che il VoIP non conosce: il trunk rifiuta il registro, il fax fallisce solo in uscita, la chiamata cade ogni trenta minuti, il telefono remoto sente ma non è sentito. In questo modulo impari a distinguere il guasto di piattaforma da quello di rete, perché i rimedi sono diversi e quasi sempre incompatibili. La regola è usa e getta: prima si localizza il pezzo della catena, poi si sceglie lo strumento.

## Obiettivi

- Diagnosticare un trunk SIP leggendo registro, INVITE e codici di risposta.
- Riconoscere un fallimento di fax e decidere tra pass-through e T.38.
- Usare timer di sessione e keep-alive per gli endpoint remoti dietro NAT.
- Verificare la marcatura DSCP su tutta la catena e non solo sul primo router.
- Trattare il PBX come sistema esposto e verificare autorizzazione e credenziali.

## Dal sintomo al pezzo della catena

Il primo passo è la catena: telefono, PBX, trunk, operatore. Ogni anello ha una prova diversa, e chiedere la prova giusta evita di aprire ticket al posto sbagliato.

| Sintomo | Anello probabile | Prova |
| --- | --- | --- |
| interno non raggiungibile | telefono o PBX | registro dell'endpoint e stato della registrazione |
| chiamata interna ok, esterna no | trunk | registro del trunk, codici 403 e 407 |
| solo un verso muto su endpoint remoto | NAT | SDP del 200 OK e contatori RTP |
| fax in uscita fallisce, in entrata ok | trunk o media | media SDP `image/t38`, ritrasmissioni UDPTL |
| voce a scatti solo in orario di punta | rete o QoS | marcatura DSCP e code sui nodi |

Il trunk è l'anello più frequente. Asterisk e gli altri PBX espongono un registro delle registrazioni: se il trunk non compare come raggiungibile dopo pochi secondi, il problema è credenziali, porta o protocollo, non audio. I codici 401 e 407 nella cattura indicano una sfida di autenticazione non soddisfatta, i 403 un utente riconosciuto ma non autorizzato alla rotta.

```bash
# Registrazioni SIP in chiaro, aggiornate in tempo reale: utente, AoR, stato
asterisk -rx "pjsip show registrations"
asterisk -rx "pjsip show endpoints"

# Cattura della sola segnalazione del trunk, per vedere sfida e risposta
tcpdump -i eth0 -n -s 0 -w trunk.pcap 'udp port 5060 or tcp port 5061'
tshark -r trunk.pcap -Y 'sip.Status-Code' -T fields \
       -e frame.time_relative -e ip.dst -e sip.Status-Code -e sip.CSeq.method
```

## Fax e segnalazione: due casi speciali

Il fax rovinato è il classico guasto che sembra casuale: una parte dei fogli passa e un'altra no, e la colpa finisce al fornitore della linea. Un Group 3 modem è un protocollo di dati a tempi precisi; ricomprimerlo a G.711 e attraversare un jitter buffer o una trascodifica lo spegne. Il rimedio è chiedere a SDP il media dedicato `image/t38` e lasciare al gateway la conversione, oppure, quando il fornitore non lo supporta, forzare un G.711 senza cancellazione d'eco e senza riduzione di rumore sul percorso del fax.

```python
# Lettura minima di un'offerta SDP: cerca il media fax e i parametri chiave
def media_fax(sdp: str) -> dict:
    righe = sdp.splitlines()
    for i, riga in enumerate(righe):
        if riga.startswith("m=image") and "t38" in riga:
            vicine = [r for r in righe[i:i + 12] if r.startswith(("m=", "a="))]
            return {"presente": True, "righe": vicine}
    return {"presente": False}
```

Se l'offerta contiene `m=image 0 udptl t38`, il media è dichiarato: la negoziazione è andata a buon fine e l'eventuale fallimento è nel trasporto, non nella trattativa. RFC 3362 descrive la registrazione `image/t38`, mentre ITU-T T.38 definisce le procedure, anche la variante su TCP usata in alcuni ambienti.

```bash
# Controllo QoS lungo una traversata: raccogli DSCP su due punti e confronta
tcpdump -i any -n -v 'udp and (port 5060 or port 5061 or net 192.0.2.0/24)' -c 200 \
  | grep -o 'tos 0x[0-9a-f]*'
```

## Endpoint remoti e timer

Un telefono in smart working introduce NAT, captive portal e riavvii di rete. Il registro dell'endpoint rimane valido finché il traffico di keep-alive lo rinfresca; il timer di sessione di RFC 4028 fa lo stesso per la chiamata in corso, e un `Session-Expires` non rinnovato produce un BYE corretto ma sorprendente. Il PBX moderno offre opzioni per simmetria dei media e riscrittura del contatto, così l'endpoint ritrova il flusso giusto dietro NAT; il laboratorio mostra come controllarle in configurazione.

```text
[6001]
type=endpoint
transport=transport-tls
direct_media=no
; endpoint remoto probabilmente dietro NAT: il flusso deve restare nel PBX
```

La scelta di `direct_media=no` mantiene il PBX sul percorso anche tra due telefoni interni: aumenta il carico ma rende possibile contare e registrare, cosa che un servizio ToIP spesso richiede. In laboratorio si verifica che le chiamate interne restino attribuite all'endpoint giusto e che un telefono dietro NAT non superi il limite di contatti configurato.

## Esercizi

1. Dal registro di un trunk, identifica il primo tentativo fallito e il codice di risposta.
2. Cattura una chiamata verso il fax e stabilisci se il SDP negozia T.38 o solo audio.
3. Spiega perché un endpoint remoto può sentire ma non essere sentito e indica l'opzione del PBX.
4. Confronta due catture di QoS con DSCP differenti e indica in quale nodo la marcatura si perde.
5. Dopo un cambio password del trunk, spiega cosa si deve toccare e cosa non cambia.
6. Verifica che una chiamata in uscita non autorizzata venga rifiutata con un codice coerente.

<details>
<summary>Soluzione</summary>

1. Nel registro del trunk si individua la prima sequenza REGISTER con 401 (sfida) seguita da REGISTER con credenziali e poi 200: un 403 al posto del 200 indica che le credenziali sono accettate ma il fornitore non ammette quella sorgente o quel profilo.

2. Si filtra `sip.Method == "INVITE"` e si leggono le righe `m=` offerte e risposte: la presenza di `m=image ... t38` conferma la negoziazione T.38, un solo `m=audio` significa pass-through e quindi dipendenza dalla qualità del percorso vocale.

3. Un endpoint dietro NAT vede il PBX ma il PBX non raggiunge l'indirizzo privato scritto in SDP. Con `rtp_symmetric` e `rewrite_contact` il PBX risponde all'indirizzo da cui il pacchetto è arrivato, quindi il flusso di ritorno rientra nel NAT.

4. Si confrontano i valori `tos` delle catture nei due punti: se a monte leggi 0xb8 (EF) e a valle zero, il nodo che azzera sta in mezzo e va configurato o va ammesso il passaggio delle marcature.

5. Solo il blocco `auth` del trunk, con `username` e `password`: il transport, l'endpoint e l'AOR restano validi, e non serve riavviare il PBX se il modulo ricarica la configurazione.

6. Si prova con un endpoint non registrato e senza credenziali: la risposta attesa è 401 o 407 con la sfida, oppure 403 se l'ACL esclude la sorgente; in ogni caso l'INVITE non deve arrivare al trunk.

</details>

## Errori comuni

- **Diagnosticare il trunk dall'audio**: se la CPU del PBX è satura, la prima prova è il registro, non il jitter.
- **Spedire il fax a 9600 baud sperando in bene**: senza media dedicato ogni riduzione di velocità è solo una copertura.
- **Cambiare il DSCP su un router e sperare**: la perdita di marcatura a metà catena annulla il lavoro a valle.
- **Lasciare il PBX raggiungibile senza ACL**: il registro delle registrazioni diventa un bersaglio e un tunnel di chiamate a pagamento.
- **Fidarsi di `direct_media` come scelta neutra**: cambia chi vede la voce, non solo il carico.

## In sintesi

La diagnosi ToIP si fa per anelli della catena e con la prova giusta per ogni anello: registro per il trunk, SDP per il fax, timer per gli endpoint remoti, marcatura per la QoS. Il VoIP misura la voce, la ToIP misura il servizio; sapere quale domanda stai facendo ti risparmia un pomeriggio di catture inutili.

## Fonti

- [Asterisk Docs - Configuring res_pjsip to work through NAT](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/Configuring-res_pjsip-to-work-through-NAT/)
- [RFC 4028 - Session Timers in SIP](https://www.rfc-editor.org/rfc/rfc4028.txt)
- [RFC 3362 - image/t38 per il fax in tempo reale](https://www.rfc-editor.org/rfc/rfc3362.txt)
- [RFC 4594 - Classi DiffServ per voce e segnalazione](https://www.rfc-editor.org/rfc/rfc4594.txt)
- [Wireshark - man page di tshark](https://www.wireshark.org/docs/man-pages/tshark.html)
