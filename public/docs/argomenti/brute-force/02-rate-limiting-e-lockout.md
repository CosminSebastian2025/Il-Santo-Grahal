Quando un attaccante prova mille combinazioni al minuto, la prima difesa che viene in mente è un limite al numero di tentativi. In pratica un limite mal progettato rompe l'esperienza degli utenti, non ferma un attacco distribuito e non copre il cracking offline. In questa lezione componiamo gli strumenti che una difesa reale usa insieme: un rate limiter a finestra scorrevole su Redis, un lockout progressivo che non rivela se l'account esiste, hashing con Argon2id e pepper, controllo opzionale delle password compromesse e metriche di monitoraggio con soglie giustificabili.

## Obiettivi

- Implementare un rate limiter a finestra scorrevole con conteggi separati per IP, per account e per coppia.
- Progettare un lockout progressivo reversibile che non diventi un attacco di denial of service.
- Applicare Argon2id con parametri giustificati e un pepper fuori dal database.
- Costruire metriche e alert per fallimenti, spray e stuffing.

## Rate limiting componibile

Il limite più utile non è uno solo. Un contatore per IP ferma uno script da un solo host, un contatore per account ferma il tentativo mirato, un contatore per coppia IP-account intercetta i test che ruotano l'IP. La finestra scorrevole su Redis si implementa con un sorted set per chiave, dove lo score è il timestamp: si rimuovono le voci vecchie e si contano le rimanenti. Il costo è proporzionale al numero di eventi nella finestra, che per un endpoint di login resta piccolo.

```python
import time, uuid

def consentito(redis, chiave, limite, finestra_s):
    ora = time.time()
    pipe = redis.pipeline()
    pipe.zremrangebyscore(chiave, 0, ora - finestra_s)
    pipe.zcard(chiave)
    pipe.zadd(chiave, {f"{ora}:{uuid.uuid4().hex[:8]}": ora})
    pipe.expire(chiave, finestra_s * 2)
    _, n, _, _ = pipe.execute()
    return n < limite

def login_verifica(redis, ip, account):
    regole = [
        (f"r:pair:{ip}:{account}", 5, 300),    # 5 in 5 minuti
        (f"r:ip:{ip}", 20, 3600),              # 20 in un'ora
        (f"r:acct:{account}", 50, 86400),      # 50 in un giorno
    ]
    return all(consentito(redis, *r) for r in regole)
```

Alcune scelte non sono dettagli. L'`EXPIRE` viene riscritto a ogni evento, così la chiave sparisce dopo l'ultima attività e non resta in memoria per sempre. Il limite per account ha una finestra lunga e una soglia alta perché serve più a misurare che a bloccare: un utente che sbaglia cinquanta volte in un giorno ha un problema diverso da un attaccante. Il rifiuto va espresso come `429` con `Retry-After` calcolato sulla finestra residua, non come errore generico, perché il client legittimo deve poter smettere di riprovare.

| Regola | Finestra | Soglia | Cosa copre |
| --- | --- | --- | --- |
| coppia IP-account | 5 min | 5 | brute-force mirato da un host |
| IP | 1 ora | 20 | script su più account da un host |
| account | 24 ore | 50 | pressione persistente sullo stesso utente |
| sottorete /24 | 15 min | 60 | attacco distribuito da un blocco unico |
| login riusciti | 10 min | 30 | stuffing con credenziali valide |

## Lockout progressivo senza denial of service

Il lockout classico è pericoloso perché chiunque può bloccare un account. La variante contro cui vale la pena lavorare è progressiva: dopo il primo blocco si aumenta l'attesa, e il blocco non impedisce all'utente di usare un secondo fattore. Una formulazione diffusa è quella di aggiungere un ritardo esponenziale calcolato sul numero di fallimenti recenti, con cap massimo, e di non rivelare la soglia all'esterno.

```python
def ritardo_richiesto(fallimenti, base=1.0, cap=30.0):
    # base * 2^(n-1) fino al cap: 1, 2, 4, 8, 16, 30, 30...
    return min(cap, base * (2 ** max(0, fallimenti - 1)))
```

Il ritardo non è una difesa di sicurezza vera e propria: un attaccante con un solo host lo supera aspettando, ma il costo per tentativo cresce e gli attaccanti opportunisti si spostano altrove. Il vero beneficio è che non si blocca l'utente legittimo. Lato interfaccia si mostra sempre lo stesso messaggio, che l'account esista o no, e l'orario di ogni tentativo viene registrato a valle dell'autenticazione, non solo l'esito.

Due accorgimenti evitano i falsi positivi più comuni. Primo, escludere dal conteggio gli utenti che arriveranno da reti condivise note, come il proxy aziendale, usando un identificatore di rete e non l'IP grezzo dove disponibile. Secondo, registrare ogni blocco con la regola che lo ha causato e con un identificativo di richiesta, perché senza questi dati il supporto non può distinguere un blocco legittimo da un bug.

## Hashing che resiste al cracking offline

Il rate limit non protegge un database rubato. Per questo l'hashing va trattato come una parte della difesa contro brute-force, non solo come una formalità. I parametri di Argon2id che la comunità OWASP indica come base sono 19 MiB di memoria, 2 iterazioni e grado di parallelismo 1 per le configurazioni che devono restare leggere su server condivisi; per un servizio che può permetterselo conviene salire a 64 MiB e 3 iterazioni. Il tempo di verifica obiettivo è tra 50 e 100 millisecondi su hardware di produzione, misurato e dichiarato.

```python
from argon2.low_level import hash_secret_raw, Type
import hmac, hashlib, os

PEPPER = os.environ["PWD_PEPPER"].encode()  # secret manager, non il DB

def hash_password(password: str) -> str:
    sale = os.urandom(16)
    chiave = hmac.new(PEPPER, password.encode(), hashlib.sha256).digest()
    h = hash_secret_raw(chiave, sale, time_cost=3, memory_cost=65536,
                        parallelism=1, hash_len=32, type=Type.ID)
    return f"argon2id${3}${65536}${sale.hex()}${h.hex()}"

def verifica(password: str, stored: str) -> bool:
    _, t, m, sale_hex, h_hex = stored.split("$")
    chiave = hmac.new(PEPPER, password.encode(), hashlib.sha256).digest()
    calcolato = hash_secret_raw(chiave, bytes.fromhex(sale_hex), int(t), int(m),
                                1, 32, Type.ID)
    return hmac.compare_digest(calcolato, bytes.fromhex(h_hex))
```

Il pepper va applicato con HMAC e non concatenato alla password, perché concatenare può creare collisioni tra la password e il pepper stesso; la chiave vive in un secret manager e non nel database, così un dump del DB non basta per iniziare il cracking. Le verifiche d'utente dovrebbero girare anche per utenti inesistenti, con un hash fittizio, per non creare differenze di tempo osservabili.

| Parametro | Valore | Motivo |
| --- | --- | --- |
| memoria | 64 MiB | rende costoso il parallelismo su GPU |
| iterazioni | 3 | bilancia CPU e memoria |
| sale | 16 byte casuali | impedisce i precalcoli condivisi |
| pepper | 32 byte | separa il database dal segreto applicativo |
| tempo verifica | 50-100 ms | misura su hardware reale |

## Monitoraggio, liste e soglie

La difesa migliore dopo il secondo fattore è non permettere password già compromesse. Al cambio password si può verificare in modo privacy-preserving l'impronta SHA-1 k-anonima contro un servizio di liste come Pwned Passwords, che restituisce centinaia di hash con lo stesso prefisso: il server vede solo i primi cinque caratteri dell'hash. Il controllo va fatto anche al login, con un esito che obbliga il cambio nel prossimo accesso, e non deve bloccare l'accesso stesso.

Le metriche da raccogliere sono quattro, e vanno registrate per account, per IP e per sottorete: fallimenti, successi dopo fallimenti, account distinti per IP, IP distinti per account. Un alert costruito su queste è molto più stabile di uno costruito sul conteggio grezzo. Le soglie iniziali si derivano dalla distribuzione storica del traffico nel lab, per esempio il percentile 99,9 dei fallimenti per account in una settimana, e si ricalibrano dopo ogni rilascio.

```sql
-- esempio: accessi riusciti preceduti da almeno 5 fallimenti nello stesso minuto
SELECT account, ip, ts
FROM  login_events
WHERE success AND failures_15m >= 5
ORDER BY ts DESC
LIMIT 200;
```

Gli strumenti esterni completano il quadro senza sostituirlo: `fail2ban` legge i log e aggiunge regole di firewall, utile per SSH e servizi internet; un WAF aggiunge reputazione e regole di pattern. Nessuno dei due conosce la logica dell'applicazione, quindi la correlazione per coppia e per account resta responsabilità del servizio.

## Errori comuni

- **Bloccare l'IP del proxy aziendale perché tutti i dipendenti condividono l'uscita**: si genera un incidente di disponibilità e il team disattiva i limiti.
- **Aggiornare i parametri di Argon2 senza misurare**: tempi di login sopra il secondo vengono percepiti come guasti e portano a un downgrade affrettato.
- **Usare `compare_digest` solo nel ramo felice**: un confronto anticipato sulla lunghezza o sul tipo di errore reintroduce differenze osservabili.
- **Memorizzare il pepper nel codice**: chi ha accesso al repository e al database può ricalcolare tutto.
- **Consentire tre tentativi e bloccare per un'ora**: equivale a lasciare a chiunque la possibilità di lockout su un utente noto.

## In sintesi

Il rate limiting a finestre multiple rende costoso l'attacco online, il lockout progressivo evita il denial of service che un blocco rigido porta con sé, la KDF a memoria protegge quando il database esce. Pepper, liste di password compromesse e metriche con soglie derivate dal proprio traffico chiudono i punti che restano. Nessuna di queste difese agisce da sola su online e offline: una difesa credibile le tiene insieme e le verifica con il proprio carico.

## Fonti

- [OWASP - Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [OWASP - Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [nginx - Module ngx_http_limit_req_module](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [MDN - 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429)
