Un attacco brute-force è il tentativo sistematico di indovinare una credenziale provando molte candidate finché una funziona. La parte interessante per chi difende non è la tecnica, che è banale, ma l'economia: un attaccante ha successo quando il costo di un tentativo, il numero di tentativi possibili e la probabilità che la password sia nella sua lista superano insieme la soglia della difesa. Questa lezione costruisce quel modello, distingue brute-force online, offline, password spraying e credential stuffing, e spiega perché i limiti per account non bastano contro un attacco distribuito.

## Obiettivi

- Calcolare lo spazio delle chiavi e il costo medio di un attacco offline per hash veloci e lenti.
- Distinguere brute-force online, password spraying, credential stuffing e cracking offline.
- Scegliere tra rate limiting per IP, per account e globali, sapendo cosa copre ciascuno.
- Riconoscere i segnali di rilevamento e la logica di risposta.

## Lo spazio delle chiavi e il costo

Ogni password possibile appartiene a uno "spazio delle chiavi" che dipende da alfabeto e lunghezza. Lo spazio teorico vale solo se l'attaccante lo esplora davvero: in pratica parte da una lista di password note, da modelli umani e da regole applicate a quelle liste, per esempio `Nome+anno`, `Parola1!` e nomi aziendali. Il numero che conta è quindi quello delle candidate realistiche, un ordine di grandezza tra 10^9 e 10^10, non la dimensione teorica dello spazio.

```text
8 caratteri, 26 minuscole + 10 cifre: 36^8 = 2,8 x 10^12
12 caratteri casuali su 72 simboli: 72^12 = 2,0 x 10^22
lista "top 10 milioni" + regole: ~10^9-10^10 candidate realistiche
```

Contro un hash SHA-256 calcolato su GPU da 100 miliardi di candidati al secondo, 10^10 candidati richiedono circa 0,1 secondi. Contro Argon2id con 64 MiB di memoria e tre iterazioni la velocità scende a qualche migliaio al secondo per GPU, ma il numero che conta è quello del costo per GB o per core, non solo il throughput: un attaccante compra la memoria più cara oppure abbandona. È esattamente il motivo per cui la scelta di una KDF a costo di memoria è una difesa e il sale è solo una misura anti-precalcolo.

| Scenario | Velocità tipica | Password candidata | Difesa che pesa |
| --- | --- | --- | --- |
| MD5/SHA-1 su GPU | 10^10-10^11 al secondo | 8-10 caratteri qualsiasi | KDF lenta e sale, mai hash nudo |
| bcrypt cost 12 | 10^3-10^4 al secondo per core | liste e regole | costo per hash, MFA |
| Argon2id 64 MiB | 10^2-10^3 al secondo con memoria limitata | liste per ultimi breach | KDF con memoria, MFA |
| login online | 1-100 al secondo per connessione | password comuni | rate limit, CAPTCHA, MFA |

## Quattro attacchi che si somigliano poco

Il **brute-force online** classico prova username e password insieme contro un servizio, spesso sulla stessa coppia con password diverse. È rumoroso: ogni tentativo è una richiesta HTTP e produce eventi di autenticazione fallita.

Il **password spraying** fa il contrario: sceglie poche password molto comuni, per esempio tre per stagione aziendale, e le prova su molti utenti. Il lockout per utente non lo ferma perché ogni utente riceve un solo tentativo per ciclo, e i log mostrano un fallimento sparso per utenti diversi.

Il **credential stuffing** usa coppie utente-password rubate da altri siti e le prova in massa, contando sulla riusabilità delle password. Non è brute-force ma la logica di difesa si somiglia: il volume, la sorgente che cambia e l'alta percentuale di fallimenti su account reali. La difesa più efficace è la verifica contro liste di credenziali compromesse al login o al cambio password, insieme al blocco delle password note come violate e all'MFA.

Il **cracking offline** avviene dopo un furto di database: l'attaccante calcola hash localmente e nessun rate limit lo tocca. Qui conta solo la KDF, la lunghezza delle password e i secret applicativi (pepper) conservati fuori dal database.

| Attacco | Prova per ciclo | Segnale nei log | Contromisura principale |
| --- | --- | --- | --- |
| brute-force online | molte password, stesso utente | molti fallimenti su un account | lockout progressivo, MFA |
| password spraying | una password, molti utenti | fallimenti sparsi e uniformi | soglie per IP, password denylist |
| credential stuffing | coppie da altri siti | alta percentuale di successi su utenti reali | liste di credenziali compromesse, MFA |
| cracking offline | milioni di hash | nessuno | Argon2id, pepper, MFA |

## Rate limiting e lockout

Il rate limit conta le richieste e rifiuta quelle in eccesso, di solito con `429 Too Many Requests` e `Retry-After`; il lockout sospende un account dopo N fallimenti consecutivi. La differenza è sostanziale: il rate limit protegge la capacità del servizio e rallenta l'attaccante, il lockout protegge l'account ma è anche un vettore di denial of service, perché chiunque conosca uno username può chiudere fuori l'utente legittimo.

OWASP consiglia di non basare il blocco solo sull'account: meglio un contatore per coppia utente-IP, un contatore per IP globale e un contatore per account con finestra lunga e soglia alta. Un valore di partenza ragionevole per un'applicazione interna è 5 fallimenti in 5 minuti per coppia, 20 fallimenti in un'ora per IP, e una risposta a crescente differita dopo 10 fallimenti sull'account, con notifica all'utente e a nessuno che permetta di dedurre se l'account esiste.

```python
# pseudocodice di finestra scorrevole su Redis, solo per orientarsi
def login_consentito(redis, ip, account):
    chiavi = [
        (f"f:ip:{ip}", 20, 3600),         # 20 fallimenti / ora per IP
        (f"f:acct:{account}", 50, 86400), # 50 fallimenti / giorno per account
        (f"f:pair:{ip}:{account}", 5, 300),
    ]
    return all(int(redis.zcard(k) or 0) < soglia for k, soglia, _ in chiavi)
```

Il confronto delle password deve essere a tempo costante e la risposta di errore identica per "utente inesistente" e "password errata": un messaggio diverso trasforma l'attacco in enumerazione di account e riduce a metà il lavoro dell'attaccante. Su scala applicativa `nftables` o un reverse proxy come nginx, con `limit_req_zone`, fermano il traffico prima che arrivi all'applicazione e riducono il costo di un attacco distribuito.

```nginx
# nginx: 10 richieste al secondo per IP sul percorso di login, con coda
limit_req_zone $binary_remote_addr zone=login:10m rate=10r/s;

location = /login {
    limit_req zone=login burst=20 nodelay;
    proxy_pass http://app;
}
```

Con un attacco distribuito da mille indirizzi, il limite per IP conta poco: servono controlli aggregati per sottorete, per fingerprint del client e per combinazione di parametri, e una risposta che non dipenda dalla sola presenza dell'IP. Per i servizi esposti su internet, un WAF o un provider con punteggio reputazionale aggiunge segnali che il server applicativo non ha.

## Rilevamento e risposta

La parte più utile è la sequenza: i fallimenti prima del successo. Un accesso riuscito preceduto da sette fallimenti nello stesso minuto è sospetto anche se isolato. Le metriche da misurare sono il tasso di fallimenti per account, la distribuzione dell'IP per account e la distribuzione dell'account per IP, con soglie derivate dal comportamento storico e non inventate.

| Metrica | Soglia di esempio | Significato |
| --- | --- | --- |
| fallimenti per account / 15 min | superiore a 20 | brute-force mirato |
| account distinti per IP / ora | superiore a 50 | password spraying |
| successo dopo 5+ fallimenti | qualsiasi | successo sospetto, forzare MFA |
| fallimenti / successi totali | oltre il 60% con volume alto | stuffing in corso |

La risposta deve essere automatica e reversibile: blocco temporaneo, MFA obbligatoria, notifica all'utente, e un elenco di IP o sessioni da rivedere. Un blocco permanente deciso da una soglia è un regalo a chi vuole negare il servizio; un blocco che non si registra con il motivo è un problema di audit. Le soglie vanno tarate su un lab con traffico replicato prima di toccare produzione, perché un falso positivo su un servizio critico costa quanto un'esposizione reale.

## Errori comuni

- **Contare solo i fallimenti per IP**: un attaccante distribuito non è visibile, un'azienda dietro NAT è bloccata ingiustamente.
- **Mandare un messaggio diverso per utente inesistente**: regala l'elenco utenti e dimezza il lavoro dell'attaccante.
- **Applicare il lockout senza notifica**: l'utente non sa perché, il supporto non sa quando sbloccare.
- **Trattare il costo della KDF come un dettaglio**: Argon2id con parametri bassi equivale a bcrypt, e un hash nudo equivale a nessuna difesa offline.
- **Rispondere a `429` senza `Retry-After`**: i client legittimi continuano a martellare e il carico non scende.

## In sintesi

Il brute-force è una questione di costi: lo spazio delle candidate, il costo per tentativo e la capacità della difesa di rendere l'errore costoso. Online si difende con limiti calibrati per IP, coppia e account, più MFA; offline si difende con una KDF a costo di memoria, sale e pepper; credential stuffing si riconosce con l'alta percentuale di successi e si mitiga con le liste di credenziali compromesse. Il rilevamento correlato e la risposta graduata, con soglie misurate, completano il quadro.

## Fonti

- [OWASP - Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP - Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [NIST SP 800-63B - Digital Identity Guidelines: Authentication](https://pages.nist.gov/800-63-4/sp800-63b.html)
