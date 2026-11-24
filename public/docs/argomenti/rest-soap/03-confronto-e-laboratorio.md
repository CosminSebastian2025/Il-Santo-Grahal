REST e SOAP non sono nemici: risolvono problemi diversi con costi diversi. REST eccelle quando il dominio è fatto di risorse e i client sono eterogenei e volatili; SOAP eccelle quando il contratto deve essere formale, verificabile e indipendente dal trasporto. In questo laboratorio misuri le differenze su casi concreti: la stessa operazione realizzata nei due stili, un confronto di payload e un test di interoperabilità.

## Obiettivi

- Confrontare REST e SOAP su contratto, trasporto, errori e testabilità.
- Misurare dimensione e leggibilità dei payload per la stessa operazione.
- Scrivere una chiamata equivalente nei due stili e leggerne gli errori.
- Valutare quale stile scegliere in base a vincoli di progetto reali.
- Applicare controlli di sicurezza coerenti in entrambi i casi.

## Il confronto che conta

La tabella seguente riassume le differenze operative, senza cadere nella caricatura "moderno contro vecchio". Ogni voce corrisponde a una decisione di progetto con conseguenze misurabili.

| Dimensione | REST | SOAP |
| --- | --- | --- |
| Contratto | OpenAPI o documentazione, spesso descrittiva | WSDL più XSD, esecutivo e validabile |
| Formato | JSON o XML, negoziato | XML obbligatorio |
| Verbi | HTTP con semantica standard | sempre `POST` |
| Stato | trasportato dal client (token) | può usare sessioni, WS-Security |
| Errori | codici HTTP più corpo | `Fault` nel body |
| Sicurezza | TLS, OAuth2, validazione | TLS, WS-Security, firma a livello di messaggio |
| Strumenti | amplissimi, browser e `curl` | generatori da WSDL, validatori XSD |
| Cache | header HTTP, cache di rete | quasi assente per default |

Il punto sul contratto è centrale. Un WSDL permette di generare tipi e client in modo deterministico e di validare ogni messaggio contro uno schema; un client REST nasce da OpenAPI ma il contratto è spesso applicativo, non imposto dal protocollo. Di converso, un client REST si prova con `curl` in dieci secondi, un client SOAP richiede un payload XML corretto, namespace coerenti e un content type con `action`.

Il costo del payload è visibile: la stessa lettura di un libro, in JSON, richiede poche decine di byte; in SOAP richiede envelope, namespace, header e wrapper. Su volumi elevati la differenza pesa, su operazioni transazionali e poco frequenti conta molto meno.

## La stessa operazione nei due stili

REST, con Ktor:

```kotlin
routing {
    get("/libri/{id}") {
        val id = call.parameters["id"]!!.toInt()
        val libro = magazzino.cerca(id)
            ?: return@get call.respond(
                HttpStatusCode.NotFound,
                mapOf("type" to "urn:errore:assente", "title" to "Libro non trovato"),
            )
        call.respond(libro)
    }
}
```

L'equivalente SOAP 1.2, come documentato nella lezione precedente, usa un `POST` con un body XML e la stessa operazione nel WSDL:

```xml
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <l:GetLibroResponse xmlns:l="urn:example:libri">
      <l:id>42</l:id>
      <l:titolo>Il Gattopardo</l:titolo>
      <l:anno>1958</l:anno>
    </l:GetLibroResponse>
  </soap:Body>
</soap:Envelope>
```

In REST l'errore è il codice `404` con un corpo informativo; in SOAP è un `Fault` con `soap:Sender` e un dettaglio applicativo. In REST un proxy o un client generico sa cosa fare con `404`; in SOAP il client deve parsare il body per capire che la richiesta era sbagliata.

Il vincolo che decide più spesso è organizzativo. REST richiede squadre che condividano convenzioni e strumenti; SOAP richiede un committente disposto a mantenere contratti formali e generatori. Un'API REST mal documentata diventa ambigua, mentre un WSDL senza versionamento rompe i client a ogni modifica. In entrambi i casi il contratto va scritto, revisionato e testato.

## Esercizi

### 1. Misurare i payload

Chiama lo stesso endpoint REST e SOAP per un libro e confronta la dimensione del body con `curl -w '%{size_download}\n'`. Registra i valori in una tabella.

<details><summary>Soluzione</summary>

```bash
curl -sS -o /dev/null -w 'rest %{size_download}\n' -H 'Accept: application/json' http://127.0.0.1:8080/libri/42
curl -sS -o /dev/null -w 'soap %{size_download}\n' -X POST http://127.0.0.1:8081/libri \
  -H 'Content-Type: application/soap+xml; charset=utf-8' --data-binary @get-libro.xml
```

Il payload SOAP contiene namespace ripetuti e wrapper: aspettati due o tre volte la dimensione del JSON. La differenza si riduce con `gzip` su HTTP, che comprime bene l'XML ripetitivo; per questo un confronto corretto include anche la codifica dichiarata con `Content-Encoding`.

</details>

### 2. Leggere un errore REST e uno SOAP

Invia una richiesta per un libro inesistente nei due servizi e descrivi come un client generico riconoscerebbe l'errore.

<details><summary>Soluzione</summary>

REST risponde `404` con `application/problem+json`: il client distingue l'esito dallo status, senza parsing del corpo. SOAP risponde con uno status HTTP che può essere `500` o `200`, e il significato reale è nel `Fault` con `Code` `soap:Sender` e `Detail`. Un client SOAP deve quindi avere un parser XML e una logica di estrazione del fault; non può limitarsi al codice di trasporto.

</details>

### 3. Verificare la validazione del contratto

Invia a SOAP un body con un campo mancante e a REST un JSON con un campo extra. Confronta la reazione.

<details><summary>Soluzione</summary>

SOAP con WSDL validante rifiuta il messaggio con un fault di validazione, perché il contratto XSD è esplicito. REST che usa kotlinx.serialization accetta il campo extra solo se `ignoreUnknownKeys = true` e un campo obbligatorio mancante produce un errore di deserializzazione da mappare su `400`. La differenza è nella forma del contratto: esecutivo nel primo caso, applicativo nel secondo.

</details>

### 4. Bloccare l'XXE su entrambi i lati

Prova a inviare un body XML con una DTD che definisce un'entità esterna e verifica che il server SOAP la rifiuti. Poi scrivi la configurazione del parser che lo impedisce.

<details><summary>Soluzione</summary>

Il payload classico dichiara `<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>` e usa `&e;` nel body. La difesa è disattivare DTD ed entità esterne nel parser. Con Resteasy o JAXB si imposta `DocumentBuilderFactory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)` e si disabilitano `external-general-entities` e `external-parameter-entities`. Verifica con un test automatico, non a mano.

</details>

### 5. Valutare la cache

Metti una cache intermedia davanti a entrambi i servizi e ripeti la lettura dello stesso libro dieci volte. Misura le richieste che raggiungono il backend.

<details><summary>Soluzione</summary>

REST con `Cache-Control: public, max-age=60` e `ETag` permette alla cache di servire le copie fresche e di rispondere `304` alle richieste condizionali: poche richieste arrivano al backend. Una risposta SOAP in `POST` non è memorizzabile per default, quindi tutte le dieci richieste raggiungono il servizio. Si può mitigare con cache applicative lato server, ma non è una proprietà del protocollo.

</details>

### 6. Scegliere lo stile per un caso reale

Hai un circuito bancario che deve inviare istruzioni di pagamento a tre partner diversi, con firma del messaggio e audit. Scrivi una raccomandazione motivata con almeno quattro criteri.

<details><summary>Soluzione</summary>

I criteri includono: contratto formale e validabile (SOAP con WSDL e XSD), firma non ripudiabile a livello di messaggio (WS-Security), interoperabilità con partner storici (SOAP è spesso l'unica opzione), testabilità del messaggio firmato e un requisito di audit. Una raccomandazione difendibile sceglie SOAP per il canale partner e REST per la propria interfaccia utente, con un gateway che traduce. La raccomandazione va motivata con vincoli misurabili, non con preferenze.

</details>

## Errori comuni

- **Scegliere lo stile senza elencare i vincoli**: l'adozione di REST o SOAP va giustificata da contratto, partner, sicurezza e strumenti disponibili.
- **Assumere che SOAP sia automaticamente più sicuro**: la sicurezza dipende da configurazione e controlli, non dal protocollo.
- **Misurare solo la dimensione del payload**: tempi di sviluppo, debugging e integrazione pesano quanto i byte.
- **Costruire un'API REST con un solo endpoint e un campo `azione`**: replica il modello RPC e perde i benefici dei metodi HTTP, senza i vantaggi del contratto WSDL.

## In sintesi

- REST e SOAP differiscono su contratto, formato, errori e caching: ogni differenza ha un costo operativo.
- SOAP è forte su contratti formali, firma del messaggio e interoperabilità legacy; REST su semplicità, cache e strumenti.
- La scelta va guidata da vincoli misurati e documentati, non dallo stile del momento.
- In entrambi i casi servono validazione, limiti di dimensione e difese da XXE.

## Fonti

- W3C — SOAP 1.2 Part 1: https://www.w3.org/TR/soap12-part1/
- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 9111 — HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- OWASP — Web Service Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Web_Service_Security_Cheat_Sheet.html
