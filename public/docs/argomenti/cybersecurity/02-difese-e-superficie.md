La difesa in profondità parte da un'idea semplice: nessun singolo controllo è affidabile al cento per cento, quindi i controlli si sovrappongono in modo che il fallimento di uno non diventi un disastro. Il corollario è meno comodo: ogni controllo aggiunto amplia anche la superficie che qualcuno può configurare male. In questa lezione impari a leggere un sistema per livelli di difesa e a chiudere la superficie d'attacco prima di aggiungere nuove barriere.

## Obiettivi

- Collocare i controlli su più livelli: rete, identità, applicazione, dato e monitoraggio.
- Distinguere superficie d'attacco, superficie esposta e superficie necessaria.
- Applicare controlli concreti su intestazioni HTTP, cookie, autorizzazione e segreti.
- Valutare il costo di ogni controllo, evitando difese che nessuno mantiene.

## I livelli della difesa in profondità

Una difesa stratificata ragionevole per un'applicazione web contiene livelli indipendenti. Alla rete troviamo segmentazione e regole di ingresso minime. All'identità ci sono autenticazione forte, sessioni a vita breve e permessi minimi. All'applicazione operano validazione degli ingressi, codifica degli output e controlli di autorizzazione per oggetto. Al dato si applicano cifratura, minimizzazione e copie di sicurezza verificate. Al monitoraggio infine si raccolgono log, metriche e avvisi che permettano di accorgersi di un comportamento anomalo.

L'indipendenza è la proprietà che rende utile lo strato: se la validazione degli input e la codifica degli output sbagliano insieme perché dipendono dalla stessa funzione condivisa, non hai due difese ma una sola con più codice. Una difesa ben progettata poggia su meccanismi diversi, di responsabilità diverse, così un errore di configurazione in un punto non replica lo stesso errore altrove.

Il primo strato, paradossalmente, è quello che riduce il lavoro degli altri: eliminare ciò che non serve. Un endpoint di debug dimenticato in produzione, un pannello amministrativo raggiungibile da internet, una chiave API con permessi totali usata da uno script di reportistica sono tutte occasioni che è meglio cancellare che difendere.

## Superficie d'attacco, esposta e necessaria

Conviene distinguere tre grandezze. La **superficie esposta** è quanto è raggiungibile dall'esterno: porte, nomi DNS, route, sottodomini. La **superficie necessaria** è il minimo indispensabile perché il servizio funzioni. La **superficie d'attacco** comprende tutto ciò che un attaccante può influenzare, anche indirettamente, per esempio un campo di input che finisce in una query o in un header.

| Livello | Controllo tipico | Cosa invalida il controllo |
| --- | --- | --- |
| Rete | ingressi limitati a CDN e load balancer | regola aperta "temporanea" in firewall |
| Identità | MFA, sessioni brevi, permessi minimi | service account con ruolo di amministratore |
| Applicazione | codifica output, controllo d'accesso per oggetto | route che salta il middleware centrale |
| Dato | cifratura at rest, minimizzazione | copie di backup senza controllo d'accesso |
| Monitoraggio | log strutturati, avvisi sulle anomalie | log nel formato libero, mai consultati |

Le intestazioni HTTP sono un esempio di controlli economici che vanno collocati con intenzione. `Strict-Transport-Security` impedisce downgrade a HTTP dopo la prima visita, `X-Content-Type-Options: nosniff` evita interpretazioni di tipo inattese, `Referrer-Policy` limita le informazioni che escono verso terzi, mentre una Content Security Policy restrittiva riduce l'impatto di errori di codifica. Per i cookie di sessione servono `Secure`, `HttpOnly` e un `SameSite` coerente con il flusso applicativo.

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Set-Cookie: sid=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
```

Il controllo accessi merita un capitolo a parte, perché non si risolve con un header. Ogni richiesta deve rispondere a due domande separate: chi sei e su quale risorsa hai diritto di agire. Se il controllo è centralizzato, per esempio in un middleware, occorre verificare che nessuna route lo aggiri; se è distribuito, occorre un test per ogni risorsa. La regressione più tipica è il buon vecchio problema dell'identificativo sequenziale: cambiare l'id nell'URL e ottenere i dati altrui.

## Segreti, dipendenze e configurazione

La superficie d'attacco cresce anche senza nuovo codice. Ogni dipendenza importa un pacchetto di codice eseguito con i nostri privilegi; ogni segreto copiato in un repository amplia la portata di una fuga dati. Due abitudini aiutano: un inventario aggiornato delle dipendenze con aggiornamenti regolari, e una gestione dei segreti fuori dal codice, con rotazione semplice e audit di chi li legge.

Anche la configurazione degli ambienti è parte della superficie. Se lo staging è raggiungibile da internet e usa il database condiviso con la produzione, la differenza tra ambienti svanisce proprio nel momento in cui serve. Ridurre la superficie significa scrivere che cosa deve essere raggiungibile da dove, e verificarlo periodicamente con una scansione, non dichiararlo in una slide.

Infine il monitoraggio non è un controllo "extra": è il livello che rende utilizzabili gli altri, perché trasforma il fallimento silenzioso di una difesa in un evento osservabile. Log strutturati, con identificativo di richiesta e utente, permettono di ricostruire cosa è successo senza dover indovinare.

## Errori comuni

- **Aggiungere livelli senza rimuovere nulla**: la superficie continua a crescere e ogni strato diventa un nuovo posto dove sbagliare la configurazione.
- **Fidarsi di un solo controllo**: affidarsi solo alla validazione degli input, o solo al firewall, significa che un'autorizzazione sbagliata nel codice resta invisibile.
- **Copiare configurazioni sicure senza capirle**: una CSP copiata con `unsafe-inline` non protegge, una cookie policy copiata senza considerare il flusso di login può rompere l'applicazione o perdere efficacia.
- **Lasciare segreti in chiaro**: chiavi nei repository, in variabili di build stampate nei log o in file di esempio finiscono quasi sempre in copie che nessuno controlla.

## In sintesi

La difesa in profondità sovrappone controlli indipendenti su rete, identità, applicazione, dato e monitoraggio. La prima difesa è ridurre la superficie: eliminare ciò che non serve rende più economico tutto il resto. Intestazioni, cookie e controllo d'accesso per oggetto sono controlli concreti e verificabili. Ogni livello va misurato, altrimenti il suo fallimento resta invisibile.

## Fonti

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [MDN – Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
