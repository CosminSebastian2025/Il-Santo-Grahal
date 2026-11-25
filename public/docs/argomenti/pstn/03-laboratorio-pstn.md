In questo laboratorio costruisci `analizza-chiamata`, uno strumento che legge un file di log o una cattura e ricostruisce il percorso di una chiamata attraverso la PSTN e il confine verso IP. Lo scopo è imparare a distinguere un problema di accesso (rame, alimentazione, toni) da uno di segnalazione (messaggi di chiamata) e da uno di media (voce che non arriva). È il tipo di lavoro che un tecnico fa prima di aprire un ticket verso l'operatore.

## Obiettivi

- Saper distinguere un problema di accesso, uno di segnalazione e uno di media.
- Leggere un file di stati di chiamata generato da una centrale o da un media gateway.
- Calcolare la durata dei tocchi e la frequenza DTMF per distinguere impulsi e toni.
- Separare la segnalazione dal traffico RTP in una cattura.
- Scrivere un riepilogo con `awk` e `tshark` riutilizzabile su casi reali.

## Il contratto di `analizza-chiamata`

| Input | Tipo | Esito |
| --- | --- | --- |
| `--log FILE` | righe `TIMESTAMP EVENT ID` | riepilogo per chiamata |
| `--pcap FILE` | cattura con SIP e RTP | quante sessioni, quanti media |
| `--stt FILE` | nomi dei toni rilevati | presenza di DTMF |
| exit 0 | chiamata completata e media presente | risposta alla correlazione |
| exit 2 | dissociazione log/cattura | errore di input |

Exit 0 significa chiamata completata e media presente, exit 2 un log e una cattura che non combaciano.

```bash
# Eventi distinti presenti nel log, in ordine alfabetico
awk '{ print $3 }' chiamata.log | sort -u
```

## Dai segnali acustici alla diagnosi

La prima distinzione è tra segnalazione in banda e fuori banda. Nella linea analogica i toni sono caratteristiche acustiche: il tono di libero è continuo, quello di occupato ha un ritmo, quello di errore differisce per cadenza. Misurarne la durata permette di dire se la centrale ha rifiutato la chiamata o se il problema è del telefono.

```text
EVENTI E CODICI
  0      nessuna diagnosi
  16     off-hook locale
  18     attesa risposta (set-up)
  21     rifiutata dalla centrale (occupato/congestione)
  31     media assente dopo il 200 OK
  34     chiamata conclusa normalmente
```

Con ISDN invece i messaggi sono strutturati e arrivano su un canale di segnalazione: `SETUP`, `CALL PROCEEDING`, `ALERTING`, `CONNECT`, `DISCONNECT`. Se compare `ALERTING` ma non `CONNECT`, il terminale ha squillato senza rispondere o ha rifiutato: la rete ha fatto il suo lavoro.

```text
2026-11-07 10:31:02 SETUP      CALL-4411  (chiamante -> centrale)
2026-11-07 10:31:02 CALL_PROC  CALL-4411
2026-11-07 10:31:04 ALERTING   CALL-4411
2026-11-07 10:31:21 CONNECT    CALL-4411
2026-11-07 10:32:40 DISCONNECT CALL-4411  causa 16 (normal clearing)
```

La causa `16` è "normal clearing", cioè il rilascio richiesto da una delle parti; la `17` è "user busy". Leggere questi codici evita di cercare un guasto dove c'è solo una persona che non ha risposto.

## Correlare il confine PSTN/IP

Quando la chiamata attraversa un gateway, il log del gateway e la cattura IP devono raccontare la stessa storia. Il trucco è usare il numero chiamato e i timestamp, perché il Call-ID SIP non esiste nel mondo ISUP. Un ritardo di pochi secondi tra il SETUP nel log e l'INVITE nella cattura è normale (la traduzione); un ritardo di 30 secondi indica un tentativo di riprova.

```bash
# Estrai le chiamate SIP e il loro esito
tshark -r chiamata.pcapng -Y 'sip.Method || sip.Status-Code' \
  -T fields -e frame.time_epoch -e sip.Method -e sip.Status-Code -e sip.Call-ID
```

```bash
# Conta i pacchetti RTP per Call-ID: senza RTP non c'è voce
tshark -r chiamata.pcapng -Y rtp -T fields -e rtp.synchronization_source \
  | sort | uniq -c | sort -nr
```

Se la segnalazione è completa ma i pacchetti RTP sono zero in una direzione, la causa più comune è l'NAT: l'SDP contiene un indirizzo privato e il router scarta il flusso in ingresso. Per verificare, si confronta l'indirizzo `c=` dell'SDP con quello visto sulla rete.

| Sintomo | Riga del log | Riga della cattura | Diagnosi |
| --- | --- | --- | --- |
| nessun tono | OFFHOOK assente | — | linea o alimentazione |
| occupato subito | causa 17 | — | destinatario occupato |
| squillo poi silenzio | ALERTING, nessun CONNECT | 180 senza 200 | terminale non risponde |
| parlato in un solo senso | CONNECT | RTP unidirezionale | NAT o SDP errato |
| chiamata cade | DISCONNECT 16 | BYE | rilascio normale |

## Esercizi

1. Aggiungi a `analizza-chiamata` il conteggio delle chiamate rifiutate per causa di rilascio.
2. Stampa un riepilogo in JSON con `jq` e verifica le chiavi con un test.
3. Estrai dall'SDP l'indirizzo `c=` e segnala le chiamate con indirizzo privato.
4. Distingui i DTMF in banda (toni) da quelli fuori banda (evento RTP) e spiega la differenza.
5. Simula la congestione del trunk: cosa cambia nel log e nel tono quando un canale non è libero?
6. Con `tcpdump` filtrato, verifica che il gateway usi RTP solo tra i peer attesi.

<details>
<summary>Soluzione</summary>

1. Un array associativo conta per causa; la causa più frequente diventa il valore di uscita (mappato in 0-255).

2. `jq -e '.rifiutate >= 0'` valida lo schema minimo; per l'ordine stabile confronta la stringa JSON intera con `expectEqualStrings`.

3. `tshark ... -e sdp.connection_info` restituisce l'indirizzo; un `grep -E` su `10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.` segnala le reti private.

4. In banda il DTMF è un doppio tono udibile nel flusso audio; fuori banda arriva come evento codificato nel flusso RTP e non è udibile. Il gateway deve convertirli se la centrale è analogica.

5. La centrale risponde con congestione: tono di occupato più rapido o causa ISUP 34 "no circuit/channel available"; nel log aumentano i SETUP senza CONNECT.

6. `tcpdump -i eth0 -n 'udp portrange 16384-32767'`: un indirizzo fuori dai peer attesi indica un flusso non previsto o un firewall mal configurato.

</details>

## Errori comuni

- **Considerare il 200 OK come prova che la chiamata funziona**: conferma l'intenzione, non la presenza del media.
- **Leggere il nome del file di cattura come se fosse un log di chiamata**: il pcap mostra i pacchetti, non gli eventi applicativi.
- **Sottovalutare l'SDP**: un indirizzo privato nel `c=` spiega la maggior parte dei problemi audio unidirezionali.
- **Riutilizzare lo stesso test per accesso e core**: toni DTMF e messaggi ISUP hanno tempi e cause diverse.
- **Ordinare i timestamp come stringhe**: funziona solo con formato ISO uniforme e fuso orario coerente.

## In sintesi

- Log di chiamata e cattura raccontano lo stesso evento a livelli diversi e vanno correlati per numero e tempo.
- Prima si guarda l'esito della segnalazione, poi la presenza del media, infine la qualità.
- I codici di causa e gli stati ISUP indicano dove si è fermata la chiamata.
- Al confine PSTN/IP emergono i problemi tipici: NAT, SDP e canali di trunk indisponibili.
- Uno strumento semplice ma ripetibile vale più di una diagnosi improvvisata.

## Fonti

- ITU-T Q.931 — Livello 3 dell'interfaccia ISDN (messaggi di chiamata): https://www.itu.int/rec/T-REC-Q.931-199805-I/en
- ITU-T Q.704 — Messaggi e funzioni della rete di segnalazione: https://www.itu.int/rec/T-REC-Q.704-199403-I/en
- RFC 3398 — Mapping ISUP/SIP per la correlazione: https://www.rfc-editor.org/rfc/rfc3398.html
- tshark — Manuale della riga di comando: https://www.wireshark.org/docs/man-pages/tshark.html
