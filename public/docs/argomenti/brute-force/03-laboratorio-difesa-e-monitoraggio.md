In questo laboratorio costruisci una difesa contro il brute-force e la misuri con un attacco simulato che gira tutto su `127.0.0.1`. L'obiettivo non è "provare che il limite funziona", ma produrre numeri: quanti tentativi al secondo riesce a fare un client prima e dopo il rate limit, quale percentuale arriva all'hash, quanto costa in tempi di risposta un attacco distribuito simulato da più indirizzi sorgente, quali eventi finiscono nei log e con quale regola. Alla fine hai una difesa tarata su dati e un elenco di soglie che sai giustificare.

## Obiettivi

- Costruire un servizio di login locale con Argon2id, contatori Redis e `429` con `Retry-After`.
- Simulare brute-force verticale, password spraying e attacco distribuito da più IP.
- Misurare tentativi accettati, hash eseguiti e latenza per scenario.
- Scrivere test automatici che verificano sia i blocchi sia l'accesso legittimo.

## Ambiente del lab

Servono Python 3.11 o superiore, Redis locale e le dipendenze di test. Tutto gira in loopback: nessun traffico verso l'esterno, nessuna credenziale reale. Redis serve solo per i contatori e va svuotato tra uno scenario e l'altro, in modo che i risultati siano ripetibili.

```bash
python -m venv .venv && source .venv/Scripts/activate
pip install fastapi uvicorn redis argon2-cffi pytest httpx
docker run -d --name lab-redis -p 6379:6379 redis:7   # oppure redis-server locale
```

Il servizio carica in memoria un databasino di account con hash Argon2id calcolati all'avvio, con parametri bassi per il lab (19 MiB, 2 iterazioni) così il test non diventa lento. Le regole di limite sono uguali a quelle della lezione precedente, ma qui le soglie diventano variabili di configurazione per poterle variare tra gli scenari.

```python
# lab_login.py
import hmac, os, time, uuid
from argon2.low_level import hash_secret_raw, Type
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import redis.asyncio as aioredis

app = FastAPI()
r = aioredis.Redis(decode_responses=True)
PEPPER = os.environ.get("PWD_PEPPER", "lab-pepper").encode()

def hash_pw(pw: str) -> str:
    s = os.urandom(16)
    k = hmac.new(PEPPER, pw.encode(), "sha256").digest()
    h = hash_secret_raw(k, s, 2, 19 * 1024, 1, 32, Type.ID)
    return f"argon2id$2$19456${s.hex()}${h.hex()}"

UTENTI = {f"utente{i:02d}": "Lab-Password-2026!" for i in range(1, 21)}
DB = {u: hash_pw(p) for u, p in UTENTI.items()}
HASH_FINTO = hash_pw("nessuno")

async def contatore(chiave: str, limite: int, finestra: int) -> bool:
    ora = time.time()
    p = r.pipeline()
    p.zremrangebyscore(chiave, 0, ora - finestra)
    p.zcard(chiave)
    p.zadd(chiave, {f"{ora}:{uuid.uuid4().hex[:8]}": ora})
    p.expire(chiave, finestra * 2)
    _, n, _, _ = await p.execute()
    return n < limite

def ip_client(request: Request) -> str:
    return request.headers.get("X-Forwarded-For", request.client.host).split(",")[0].strip()

@app.post("/login")
async def login(request: Request):
    corpo = await request.json()
    account, password = corpo.get("account", ""), corpo.get("password", "")
    ip = ip_client(request)
    regole = [(f"r:pair:{ip}:{account}", 5, 300),
              (f"r:ip:{ip}", 20, 3600),
              (f"r:acct:{account}", 50, 86400)]
    for chiave, limite, finestra in regole:
        if not await contatore(chiave, limite, finestra):
            return JSONResponse({"errore": "troppo spesso"}, status_code=429,
                                headers={"Retry-After": str(finestra)})
    esito = verifica(password, DB.get(account, HASH_FINTO)) and account in DB
    if not esito:
        return JSONResponse({"errore": "credenziali non valide"}, status_code=401)
    return {"ok": True}
```

La funzione `verifica` è la stessa della lezione precedente: ricostruisce il pepper con HMAC, esegue Argon2id con i parametri salvati nella stringa e confronta con `hmac.compare_digest`. La riga che conta per il lab è `DB.get(account, HASH_FINTO)`: quando l'account non esiste si esegue comunque un hash, così il tempo di risposta non distingue i due casi e il brute-force non degenera in enumerazione.

L'header `X-Forwarded-For` serve unicamente a simulare indirizzi diversi in locale, è il trucco che rende possibile l'attacco distribuito senza container separati. In produzione, naturalmente, quell'header va fidato solo provenendo dal proxy autorevole, ed è il primo errore che si commette proprio in questo tipo di difesa.

## Gli scenari di attacco

Ogni scenario genera richieste con `httpx` e conta le risposte per codice di stato. Il client simulato non fa nulla di speciale, il che è utile: ciò che misura è la difesa, non la fantasia dell'attaccante. Tre scenari bastano per coprire le difese: verticale su un solo account, spray su tutti gli account, distribuito con IP diversi.

```python
# attacchi.py
import asyncio, time, httpx

BASE = "http://127.0.0.1:8000"

async def colpisci(n, account, password, ip):
    async with httpx.AsyncClient(timeout=5) as c:
        r = await c.post(f"{BASE}/login",
                         json={"account": account, "password": password},
                         headers={"X-Forwarded-For": ip})
        return r.status_code, r.headers.get("Retry-After")

async def scenario_verticale(total=60):
    return await asyncio.gather(*[colpisci(1, "utente01", f"tentativo{i}", "127.0.0.1")
                                  for i in range(total)])

async def scenario_spray():
    return await asyncio.gather(*[colpisci(1, f"utente{i:02d}", "Estate2026!", "127.0.0.1")
                                  for i in range(1, 21)])

async def scenario_distribuito(ip_per=10, tentativi=5):
    job = [colpisci(1, "utente01", "x", f"10.0.{g}.7")
           for g in range(ip_per) for _ in range(tentativi)]
    return await asyncio.gather(*job)

if __name__ == "__main__":
    for nome, fn in (("verticale", scenario_verticale()),
                     ("spray", scenario_spray()),
                     ("distribuito", scenario_distribuito())):
        t0 = time.perf_counter()
        esiti = asyncio.run(fn)
        dt = time.perf_counter() - t0
        c = {}
        for stato, _ in esiti: c[stato] = c.get(stato, 0) + 1
        print(f"{nome:12} {dt:6.2f}s  {c}")
```

Il risultato atteso, come ordine di grandezza, è che lo scenario verticale su sessanta tentativi ne fa passare solo cinque e risponde `429` per gli altri cinquantacinque, con `Retry-After` crescente; lo spray su venti utenti passa quasi tutto perché ogni account riceve un solo tentativo, ed è il punto didattico della lezione: serve la regola per IP; lo scenario distribuito, con dieci IP da cinque tentativi, passa ed è quello che mette in crisi il limite per IP.

| Scenario | Tentativi | Attesi accettati | Attesi 429 | Regola che scatta |
| --- | --- | --- | --- | --- |
| verticale | 60 | 5 | 55 | coppia IP-account |
| spray | 20 | 20 | 0 | nessuna (da aggiungere: per IP) |
| distribuito | 50 | 50 | 0 | nessuna (serve regola per sottorete) |

| Misura | Prima | Dopo |
| --- | --- | --- |
| hash eseguiti in 60 s | 60 | circa 5 |
| latenza media risposta | dominata da Argon2id | sub-millisecondo sui 429 |
| eventi nei log | 60 di autenticazione | 60, di cui 55 di blocco con regola |

## Test e criteri di uscita

Il test automatico deve coprire il blocco e il flusso lecito, e va eseguito con un Redis isolato per test, altrimenti i contatori si contaminano tra i casi. `httpx` con `ASGITransport` evita di avviare il server e mantiene il test veloce. Il caso lecito è quello che si rompe più spesso quando si alza la soglia.

```python
# test_difesa.py
import pytest, httpx
from lab_login import app, UTENTI

@pytest.fixture(autouse=True)
async def redis_pulito():
    import lab_login, redis.asyncio as aioredis
    lab_login.r = aioredis.Redis(decode_responses=True)
    await lab_login.r.flushdb()
    yield

def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                             base_url="http://test")

@pytest.mark.anyio
async def test_blocco_dopo_cinque():
    async with client() as c:
        esiti = [ (await c.post("/login", json={"account": "utente01", "password": "x"})).status_code
                  for _ in range(7) ]
    assert esiti[:5] == [401] * 5
    assert 429 in esiti[5:]

@pytest.mark.anyio
async def test_login_legittimo_entro_soglia():
    async with client() as c:
        r = await c.post("/login", json={"account": "utente02",
                                         "password": UTENTI["utente02"]})
    assert r.status_code == 200

@pytest.mark.anyio
async def test_utente_inesistente_stesso_tempo():
    async with client() as c:
        a = await c.post("/login", json={"account": "fantasma", "password": "x"})
        b = await c.post("/login", json={"account": "utente03", "password": "x"})
    assert a.status_code == b.status_code == 401
    assert a.text == b.text
```

Il terzo test è quello che molti dimenticano: senza eseguire un hash anche per utenti inesistenti, il tempo di risposta rivela quali account esistono e trasforma il brute-force in enumerazione. La verifica va fatta anche sui messaggi, non solo sui codici.

Il criterio di uscita del laboratorio è un prospetto con tre righe, da compilare con le misure fatte: lo scenario verticale riduce gli hash del novanta per cento, lo spray tiene gli hash bassi perché sono le credenziali lente a proteggere, il distribuito viene fermato dalla regola per sottorete aggiunta come esercizio. Se la terza riga non si chiude, la difesa per IP è solo un filtro contro gli attaccanti poco motivati, e va detto esplicitamente.

## Esercizi

1. Aggiungi la regola per sottorete `/24` sull'IP e riesegui lo scenario distribuito: quanti tentativi restano accettati?
2. Alza l'Argon2id a 64 MiB e 3 iterazioni e misura la latenza p50 e p99 con la stessa sequenza di richieste.
3. Simula un successo dopo sei fallimenti e verifica che l'evento "successo sospetto" finisca nei log con la regola che lo ha generato.
4. Implementa `Retry-After` come numero di secondi residui della finestra più stringente e verifica che il client possa rispettarlo.
5. Aggiungi una lista di password compromesse fittizia (cinque voci) e obbliga il cambio al prossimo login, senza bloccare l'accesso.

## Errori comuni

- **Fidarsi di `X-Forwarded-For` senza un proxy autorevole**: l'attaccante cambia IP nell'header e il rate limit per IP sparisce; nel lab serve, in produzione va filtrato.
- **Disabilitare Redis nei test**: i contatori si azzerano a ogni richiesta e il test "blocco dopo cinque" passa sempre per caso.
- **Alzare le soglie per far passare un test**: la difesa diventa nominale e i numeri misurati non valgono più.
- **Misurare solo il codice di stato**: un `429` con hash eseguito a monte non ha protetto né CPU né database.
- **Lasciare il pepper di default nel lab e copiarlo in produzione**: la separazione dal database ne risulta nulla.

## In sintesi

Il laboratorio trasforma le raccomandazioni in numeri: contatori a finestre multiple, `429` con `Retry-After`, hash Argon2id eseguito anche per account inesistenti e test che verificano blocco e accesso legittimo. Gli scenari mostrano che ogni regola copre un attacco diverso e che le soglie vanno lette insieme, non una alla volta. Il valore finale non è il codice ma il prospetto di misure: tentativi accettati, hash eseguiti e latenza, che è quello che permette di difendere le soglie in una revisione.

## Fonti

- [OWASP - Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [OWASP - Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [Pwned Passwords API](https://www.haveibeenpwned.com/API/v3)
- [MDN - Retry-After header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)
