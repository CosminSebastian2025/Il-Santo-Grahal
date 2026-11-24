SOAP è un protocollo di messaggistica basato su XML, nato per far dialogare sistemi eterogenei con contratti formali e indipendenti dal trasporto. In contesti bancari, assicurativi, sanitari e in molte integrazioni con enti pubblici resta lo standard di fatto, e un backend moderno deve saperlo leggere. Qui impari la struttura di un messaggio SOAP, il ruolo dell'header e del body, e come un WSDL descrive un servizio.

## Obiettivi

- Descrivere envelope, header e body di un messaggio SOAP 1.2.
- Distinguere stile document/literal e RPC, e capire perché il primo domina.
- Leggere un WSDL e individuare endpoint, operazioni, tipi e binding.
- Costruire una chiamata SOAP reale con `curl` e un payload corretto.
- Riconoscere SOAP Fault e le implicazioni di sicurezza.

## La struttura del messaggio

Un messaggio SOAP 1.2 è un documento XML con un elemento radice `Envelope` nello spazio dei nomi `http://www.w3.org/2003/05/soap-envelope`. Dentro l'envelope ci sono due sezioni: `Header`, opzionale, e `Body`, obbligatorio. L'envelope dichiara il namespace SOAP, gli elementi applicativi usano i loro namespace.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header>
    <wsa:Action soap:mustUnderstand="true"
      xmlns:wsa="http://www.w3.org/2005/08/addressing">
      urn:example:libri:GetLibro
    </wsa:Action>
    <wsu:Timestamp xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsu:Created>2026-11-24T10:00:00Z</wsu:Created>
    </wsu:Timestamp>
  </soap:Header>
  <soap:Body>
    <l:GetLibroRequest xmlns:l="urn:example:libri">
      <l:id>42</l:id>
    </l:GetLibroRequest>
  </soap:Body>
</soap:Envelope>
```

L'header trasporta informazioni trasversali: indirizzamento, sicurezza, correlazione, tracciamento. L'attributo `mustUnderstand="true"` dichiara che il ricevente deve comprendere quell'header o rifiutare il messaggio. Il body contiene i dati dell'operazione. Questa separazione permette a un intermediario di leggere e modificare header senza toccare il payload applicativo.

Una chiamata completa via HTTP usa `POST`, header `Content-Type: application/soap+xml; charset=utf-8; action="urn:example:libri:GetLibro"`, un `SOAPAction` in SOAP 1.1 oppure il parametro `action` del content type in SOAP 1.2.

```bash
curl -sS -X POST https://example.org/libri \
  -H 'Content-Type: application/soap+xml; charset=utf-8; action="urn:example:libri:GetLibro"' \
  --data-binary @get-libro.xml
```

## Stili, WSDL e contratto

Il **WSDL** è la descrizione del servizio. Un WSDL 1.1 si compone di `types` (schemi XSD dei messaggi), `message` (parti di input e output), `portType` (operazioni astratte), `binding` (protocollo concreto, tipicamente HTTP con SOAP) e `service` (endpoint). Il WSDL 2.0 (W3C) riorganizza i concetti in `interface`, `binding` e `service`.

| Stile | Come appare nel body | Effetto |
| --- | --- | --- |
| document/literal | un elemento del tipo dell'operazione | contratto stabile, validabile con XSD |
| rpc/literal | un elemento con il nome dell'operazione e i parametri | più vicino alla vecchia RPC |
| rpc/encoded | parametri con gli attributi di codifica SOAP | deprecato, interoperabilità scarsa |

Lo stile **document/literal** è di gran lunga il più diffuso perché rende il contratto auto-descrivente: un client può validare il messaggio contro lo schema XSD senza conoscere l'implementazione. La variante "wrapped" incapsula i parametri in un elemento con il nome dell'operazione, semplificando lo sviluppo.

```xml
<xs:element name="GetLibroRequest">
  <xs:complexType>
    <xs:sequence>
      <xs:element name="id" type="xs:int"/>
    </xs:sequence>
  </xs:complexType>
</xs:element>
```

Il WSDL viene spesso posto sullo stesso host con un parametro di query come `?wsdl`, ma non è un obbligo: l'URL del contratto va documentato e versionato, perché i client generano il codice da lì. Un cambio incompatibile del WSDL rompe tutti i client che ricompilano contro il nuovo contratto.

## Fault e sicurezza

Un errore SOAP non è un errore HTTP: la risposta può essere `500` con un `Fault` nel body, oppure `200` con un `Fault`. Il fault contiene `Code`/`faultcode`, `Reason`/`faultstring` e opzionalmente `Detail` con il dettaglio applicativo. Alcuni stack rispondono `400` per errori di validazione del body, ma la fonte autorevole del significato è il `Fault`, non lo status HTTP.

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <soap:Fault>
      <soap:Code><soap:Value>soap:Sender</soap:Value></soap:Code>
      <soap:Reason><soap:Text xml:lang="it">Libro non trovato</soap:Text></soap:Reason>
      <soap:Detail><l:errore xmlns:l="urn:example:libri">404</l:errore></soap:Detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

La sicurezza in SOAP è più stratificata che in REST. `WS-Security` definisce firma e cifratura a livello di messaggio, utile quando il messaggio attraversa intermediari che non dovrebbero leggerlo. Le API SOAP richiedono attenzione all'XML External Entity (XXE) injection: il parser deve essere configurato per disabilitare entità esterne e DTD, altrimenti un body malevolo può leggere file del server. L'OWASP Web Service Security Cheat Sheet riassume i controlli principali: schema validation, limiti di dimensione, cifratura del trasporto e del messaggio, autenticazione forte.

Oggi SOAP convive con REST in molta architettura aziendale: un layer di API gateway espone REST verso i client moderni e parla SOAP ancora verso i sistemi legacy. Saper leggere un WSDL e un fault è la competenza che rende possibile quella mediazione.

## Errori comuni

- **Trattare il fault come un errore HTTP generico**: uno `200 OK` con `Fault` è un errore applicativo; bisogna ispezionare il body.
- **Lasciare il parser XML in modalità permissiva**: DTD e entità esterne abilitati aprono la porta a XXE. Disabilitali esplicitamente.
- **Modificare il WSDL senza versionarlo**: i client generati da WSDL si rompono in compilazione o in runtime senza un messaggio chiaro.
- **Usare `rpc/encoded` in nuove API**: è deprecato e interoperabile male; parti da `document/literal` e mantieni il contratto stabile.

## In sintesi

- SOAP è un protocollo XML con envelope, header applicativi e body: il contratto è esplicito e validabile.
- Il WSDL descrive tipi, operazioni, binding e endpoint: è la fonte di verità del client.
- Lo stile document/literal è lo standard di fatto per la sua interoperabilità.
- Fault nel body e WS-Security spostano parte della gestione di errori e sicurezza a livello di messaggio.

## Fonti

- W3C — SOAP 1.2 Part 1: Messaging Framework: https://www.w3.org/TR/soap12-part1/
- W3C — SOAP 1.2 Part 2: Adjuncts: https://www.w3.org/TR/soap12-part2/
- W3C — Web Services Description Language (WSDL) 2.0: https://www.w3.org/TR/wsdl20/
- OWASP — Web Service Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Web_Service_Security_Cheat_Sheet.html
