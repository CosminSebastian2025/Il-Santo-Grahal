Questo laboratorio mette in pratica la diagnosi: un sito "non si apre" può essere un record mancante, un TTL che tiene in vita un dato vecchio o un resolver che risponde con un errore. Lavori solo con domini di test e con il tuo resolver, tranne dove indicato.

## Obiettivi

- Distinguere `NXDOMAIN`, `NODATA`, `SERVFAIL` e un timeout.
- Misurare la propagazione osservando il TTL ridotto nella cache.
- Scrivere una sequenza di indagine ripetibile per un dominio che non risponde.

## Preparazione

Parti dai dati di ambiente, poi ricorda che `example.com`, `example.net` e `example.org` sono riservati dall'IANA per la documentazione: puoi interrogarli, ma non controlli i loro record. Per gli esercizi sui record mancanti userai `/etc/hosts`.

```bash
cat /etc/resolv.conf
resolvectl status 2>/dev/null
dig +short txt o-o.myaddr.l.google.com @8.8.8.8   # il tuo IP pubblico visto dal resolver
```

Su Windows: `Get-DnsClientServerAddress` e `Resolve-DnsName example.com`.

## Esercizi

### 1. Riconoscere il tipo di errore

Interroga tre nomi e annota `status` e sezione della risposta:

```bash
dig nonexistent-xyz-12345.example.com A
dig example.com AAAA
dig nonexistent-xyz-12345.invalid A
```

Domande:

- quale risposta ha `status: NXDOMAIN` e quale `status: NOERROR` con zero answer?
- perché `invalid` è un comportamento speciale definito da una RFC?
- la risposta arriva dallo stesso server per tutti e tre i nomi?

**Soluzione commentata**

`dig nonexistent-xyz-12345.example.com` restituisce `status: NXDOMAIN`: il nome non esiste nella zona `example.com`. `dig example.com AAAA` restituisce `status: NOERROR` con `ANSWER: 0`: il nome esiste, ma non ha record di quel tipo (NODATA). `nonexistent-xyz-12345.invalid` restituisce ancora `NXDOMAIN`, ma per una ragione diversa: `.invalid` è riservato (RFC 2606 e 6761) e garantito non risolvibile; un resolver corretto non deve mai restituire un indirizzo per un `.invalid`.

```text
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 51234
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 1
```

La sezione AUTHORITY contiene il `SOA` della zona con il TTL negativo: è il tempo per cui il resolver può tenere in cache il "non esiste". Un `NXDOMAIN` può quindi persistere anche dopo la creazione del record.

### 2. Osservare la cache e il TTL

Esegui due query ravvicinate allo stesso resolver e annota il TTL:

```bash
dig example.com A | grep -A2 "ANSWER SECTION"
dig example.com A | grep -A2 "ANSWER SECTION"
dig +norecurse @8.8.8.8 example.com A | head -20
```

- il TTL della seconda query è uguale, minore o maggiore?
- il `+norecurse` restituisce `NOERROR` con risposta, oppure `REFUSED`/risposta vuota?

Sui resolver pubblici la seconda query di solito mostra un TTL ridotto: la risposta arriva dalla cache condivisa. `+norecurse` chiede al server di non ricorsare: se il record è già in cache risponde, altrimenti restituisce una risposta vuota con i delegati nella sezione AUTHORITY, oppure `REFUSED` se il server non accetta query iterative. Il TTL scende solo quando il server serve dalla cache.

### 3. Record mancante simulato

Su Linux/macOS, aggiungi un nome locale e verifica la differenza tra i livelli:

```bash
echo "127.0.0.1 api.demo.test" | sudo tee -a /etc/hosts
getent hosts api.demo.test
dig api.demo.test A
curl -sS --max-time 2 http://api.demo.test/ || true
```

- `getent` risolve? `dig` risolve?
- `curl` fallisce per DNS o per connessione rifiutata?

**Soluzione commentata**

`getent hosts api.demo.test` stampa `127.0.0.1 api.demo.test`: il resolver di sistema consulta `/etc/hosts` prima di DNS. `dig api.demo.test A` restituisce `NXDOMAIN` perché non legge `/etc/hosts`. `curl` si comporta come `getent`: trova l'indirizzo e poi fallisce perché nessun server ascolta sulla porta 80 di `127.0.0.1`. Il messaggio lo distingue:

```text
curl: (7) Failed to connect to api.demo.test port 80 after 0 ms: Connection refused
```

Se invece `curl` dicesse `Could not resolve host`, il problema sarebbe DNS, non rete. Questa distinzione è la più utile in produzione. Ricorda di rimuovere la riga da `/etc/hosts` alla fine.

Su Windows la riga equivalente va in `C:\Windows\System32\drivers\etc\hosts` e i comandi sono `Resolve-DnsName api.demo.test` e `curl.exe`.

### 4. Propagazione e cache multi-livello

Scegli un servizio che ti consenta di modificare un record (un dominio tuo, o un servizio gratuito). Poi leggi il TTL attuale, svuota la cache locale (`resolvectl flush-caches` o `ipconfig /flushdns`), interroga l'autoritativo e il resolver, e ripeti ogni 60 secondi.

| Dove | Prima del cambio | Dopo il cambio |
| --- | --- | --- |
| `dig @autoritativo` | valore vecchio, TTL pieno | nuovo valore subito |
| `dig` (resolver locale) | valore in cache, TTL ridotto | nuovo valore dopo la scadenza |

Se dopo il TTL + il tempo del cambio vedi ancora il valore vecchio, il problema è nella zona o nel nome sbagliato, non nella propagazione.

### 5. Lettura di una catena autoritativa

Ricostruisci la catena senza cache:

```bash
dig +trace www.example.com | grep -E "^\.|Received|IN\s+NS"
```

- quanti server root sono contattati all'inizio?
- il record finale è accompagnato dal flag `aa`?
- perché `www.example.com` è risolto dagli stessi due autoritativi che servono `example.com`?

**Soluzione commentata**

`+trace` invia una query a un solo server root; questi risponde con la delega verso i server `com`, e così via. Le righe `;; Received … from …` indicano chi ha risposto a ogni passaggio. `www.example.com` fa parte della stessa zona di `example.com`: non c'è delega separata, quindi gli stessi autoritativi rispondono con `aa`.

### 6. Sospetto DNSSEC o SERVFAIL

```bash
dig +dnssec example.com DS
dig +cd example.com DS
```

- che differenza c'è con `+cd` (checking disabled)?
- dove compare la firma `RRSIG`?

**Soluzione commentata**

`+dnssec` imposta il bit `DO` e chiede le firme: se la catena è valida vedi `RRSIG` nella ANSWER e il flag `ad`. `+cd` disabilita la validazione ed è il modo per capire se un `SERVFAIL` dipende da DNSSEC. Non è una soluzione: serve solo in diagnosi.

## Errori comuni

- **Dimenticare il punto finale**: `dig www.example.com` con `search` configurato può aggiungere un suffisso e fallire.
- **Confondere `NXDOMAIN` con "record assente"**: il primo è il nome che non esiste, il secondo è `NOERROR` con `ANSWER: 0`.
- **Chiudere il caso perché `dig @8.8.8.8` funziona**: il tuo utente o la tua app usano un resolver diverso.
- **Cancellare `/etc/hosts` invece di rimuovere una riga**: fai un backup prima.

## In sintesi

- Status della risposta, sezioni e TTL raccontano l'intera storia.
- `/etc/hosts` vince su DNS per le applicazioni, ma non per `dig`.
- La cache NXDOMAIN ha un TTL: un record appena creato può restare invisibile.
- `+trace` e `@server` separano il problema di zona dalla cache.

## Fonti

- RFC 1034 — Risoluzione dei nomi e validazione: https://www.rfc-editor.org/rfc/rfc1034.html
- RFC 6761 — Special-Use Domain Names (`invalid`, `localhost`): https://www.rfc-editor.org/rfc/rfc6761.html
