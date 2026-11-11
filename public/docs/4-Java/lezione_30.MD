# Lezione 30: Cache, code, Docker, CI/CD e monitoraggio

Un'applicazione che funziona sulla propria macchina non è ancora un'applicazione che regge. Questa lezione mette insieme le parti che la rendono veloce, distribuibile e osservabile.

### Cache

Una **cache** salva il risultato di un'operazione costosa per riusarlo. Le letture ripetute diventano quasi istantanee e il database respira.

Le regole di base:

- metti in cache solo dati **letti spesso e scritti raramente**;
- ogni voce ha una **scadenza (TTL)**, così i dati vecchi spariscono da soli;
- quando modifichi il dato, **invalida** la voce corrispondente.

Il pattern più diffuso è **cache-aside**: l'applicazione controlla la cache, se manca il dato lo legge dalla fonte e poi lo salva in cache.

```java
@Service
public class LibroService {

    private final LibroRepository repository;

    public LibroService(LibroRepository repository) {
        this.repository = repository;
    }

    @Cacheable(value = "libri", key = "#id")
    public Libro trova(long id) {
        // log didattico: compare solo quando la cache non viene usata
        System.out.println("Lettura dal database per " + id);
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @CacheEvict(value = "libri", key = "#id")
    public void elimina(long id) {
        repository.deleteById(id);
    }
}
```

Con `@EnableCaching` sull'applicazione e Redis configurato, la seconda chiamata a `trova` non esegue il corpo del metodo.

```properties
spring.cache.type=redis
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.cache.redis.time-to-live=300000
```

`time-to-live=300000` significa cinque minuti. Se il TTL manca, le voci restano per sempre e i dati diventano vecchi senza accorgersene.

### Redis in pratica

```bash
docker run --name redis -p 6379:6379 -d redis:7
docker exec -it redis redis-cli
```

| Comando | Effetto |
| --- | --- |
| `SET chiave valore` | salva un valore |
| `GET chiave` | legge un valore |
| `SETEX chiave 60 valore` | salva con scadenza in secondi |
| `TTL chiave` | secondi rimasti alla scadenza |
| `DEL chiave` | elimina |
| `EXISTS chiave` | 1 se esiste, 0 altrimenti |
| `INCR contatore` | incrementa un intero in modo atomico |

Problemi tipici di una cache:

| Problema | Rimedio |
| --- | --- |
| **dato vecchio** | invalida su scrittura e usa TTL brevi |
| **cache stampede** | scadenze scaglionate e ricostruzione con lock |
| **penetrazione** | metti in cache anche i "non trovato" per pochi secondi |
| **memoria piena** | limita la dimensione e usa una policy di espulsione |

### Code e messaggi

Una **coda** disaccoppia chi produce un evento da chi lo consuma. Chi crea un ordine non deve aspettare l'invio dell'email e l'aggiornamento del magazzino.

| Aspetto | RabbitMQ | Kafka |
| --- | --- | --- |
| Modello | code con routing | log distribuito a partizioni |
| Uso tipico | comandi e task | eventi e stream |
| Dopo la lettura | il messaggio viene consumato | l'evento resta per un periodo |
| Ordine | per coda | per partizione |

Il modello di consegna più comune è **at-least-once**: un messaggio può arrivare due volte. Per questo i consumatori devono essere **idempotenti**, cioè capaci di gestire lo stesso evento senza duplicare gli effetti.

```java
public record OrdineCreato(String codice, double totale) {
}

// schema del producer con Spring AMQP
rabbitTemplate.convertAndSend("ordini", new OrdineCreato("ORD-42", 99.90));
```

Il consumatore riceve l'evento e aggiorna il magazzino controllando prima che l'ordine non sia già stato elaborato.

### Docker

Un `Dockerfile` multi-stage separa la compilazione dall'esecuzione: l'immagine finale contiene solo il JRE e il jar.

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Il file si chiama `app.jar` se nel `pom.xml` c'è:

```xml
<build>
    <finalName>app</finalName>
</build>
```

`docker compose` avvia più servizi insieme:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"

  cache:
    image: redis:7
    ports:
      - "6379:6379"

  app:
    build: .
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/app
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: app
      SPRING_DATA_REDIS_HOST: cache
    ports:
      - "8080:8080"
    depends_on:
      - db
      - cache
```

| Comando | Effetto |
| --- | --- |
| `docker build -t app .` | costruisce l'immagine |
| `docker run -p 8080:8080 app` | avvia un container |
| `docker compose up --build` | costruisce e avvia i servizi |
| `docker compose down` | ferma e rimuove i container |
| `docker compose logs -f app` | segue i log |
| `docker ps` | elenca i container attivi |

`depends_on` avvia i servizi nell'ordine indicato, ma non aspetta che il database sia pronto a ricevere connessioni. Per un avvio affidabile si aggiunge un `healthcheck` e `condition: service_healthy`.

### CI/CD

La **CI** esegue build e test a ogni push. Se il codice non compila o un test fallisce, lo scopri subito, non il giorno del rilascio.

```yaml
name: build

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
      - name: Build e test
        run: mvn -B verify
```

La **CD** aggiunge la pubblicazione: costruire l'immagine, salvarla in un registry e distribuirla in un ambiente. Per un progetto didattico la pipeline che compila e testa è già un ottimo traguardo.

### Monitoraggio

Un sistema senza metriche si scopre rotto quando lo dice l'utente. Con Spring Boot Actuator si espongono informazioni di salute e metriche.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```properties
management.endpoints.web.exposure.include=health,info,metrics
```

```bash
curl http://localhost:8080/actuator/health
```

Le metriche che contano:

- latenza media e **p95/p99**;
- tasso di errori 5xx;
- saturazione di CPU, memoria, connessioni al database;
- messaggi in coda non ancora consumati.

Strumenti tipici: Prometheus e Grafana per le metriche, Loki o ELK per i log, Jaeger o Tempo per le tracce distribuite.

### Errori comuni

- **Cache senza scadenza.** I dati restano vecchi e nessuno se ne accorge.
- **Cache senza invalidazione.** Una modifica al database non si vede più.
- **Mettere in cache tutto.** Gli oggetti grandi o raramente riusati occupano memoria per nulla.
- **Consumer non idempotente.** Un messaggio consegnato due volte crea due ordini.
- **`copy . .` prima di `pom.xml`.** Ogni modifica al codice invalida la cache delle dipendenze.
- **`depends_on` scambiato per "database pronto".** L'app può partire prima del database e fallire.
- **Nessun test nella pipeline.** Una CI che non esegue i test dà solo una falsa sicurezza.

### Esempio completo

Un servizio che legge un prodotto, lo mette in cache per un minuto e lo invalida quando cambia:

```java
@Service
public class ProdottoService {

    private final ProdottoRepository repository;

    public ProdottoService(ProdottoRepository repository) {
        this.repository = repository;
    }

    @Cacheable(value = "prodotti", key = "#id")
    public Prodotto trova(long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @CachePut(value = "prodotti", key = "#prodotto.id")
    public Prodotto salva(Prodotto prodotto) {
        return repository.save(prodotto);
    }

    @CacheEvict(value = "prodotti", key = "#id")
    public void elimina(long id) {
        repository.deleteById(id);
    }
}
```

Con una prima chiamata il dato arriva dal database; le successive arrivano da Redis. Dopo `salva` o `elimina` la voce viene aggiornata o rimossa, così non si leggono dati vecchi.

## Esercizi progressivi

**Esercizio 1.** Avvia Redis con Docker e prova `SET`, `GET`, `SETEX`, `TTL` e `DEL` da `redis-cli`.

**Esercizio 2.** Aggiungi `@Cacheable` a un metodo di lettura e verifica, con un log nel corpo, che la seconda chiamata non esegua il metodo.

**Esercizio 3.** Aggiungi `@CacheEvict` sulle operazioni di modifica e verifica che la chiamata successiva torni alla fonte.

**Esercizio 4.** Configura un TTL di 30 secondi e controlla con `TTL` quanto resta prima della scadenza.

**Esercizio 5.** Modifica un dato direttamente sul database senza passare dal service e osserva per quanto tempo la cache restituisce il valore vecchio.

**Esercizio 6.** Spiega in cinque righe come ridurre il rischio di cache stampede quando molte voci scadono insieme.

**Esercizio 7.** Scrivi un `Dockerfile` multi-stage per un'app Spring Boot e costruisci l'immagine con `docker build`.

**Esercizio 8.** Avvia un PostgreSQL con `docker compose` e collega l'applicazione usando le variabili d'ambiente.

**Esercizio 9.** Aggiungi Redis al `docker-compose.yml` e configura l'applicazione per usarlo come cache.

**Esercizio 10.** Aggiungi un `healthcheck` al servizio database e fai partire l'app solo quando è pronto.

**Esercizio 11.** Crea il workflow GitHub Actions con `JDK 21` e `mvn -B verify`; verifica che parta a ogni push.

**Esercizio 12.** Abilita `health` e `metrics` con Actuator e leggi entrambi gli endpoint con `curl`.

**Esercizio 13.** Scegli tre metriche per un'API di ordini e indica per ciascuna una soglia oltre la quale allarmare.

**Esercizio 14.** Descrivi che cosa succede se un consumatore di messaggi riceve due volte lo stesso evento e come lo rendi idempotente.

### Varianti

- Aggiungi un consumatore RabbitMQ che registra su log gli ordini creati.
- Aggiungi alla CI un passaggio che costruisce l'immagine Docker senza pubblicarla.
- Confronta i tempi di una lettura con cache calda e con cache vuota, riportando i valori.

## Progetti della fase 6

### Progetto 1: Benchmark concorrente

Requisiti:

- somma un array di 10 milioni di interi in tre modi: sequenziale, `ExecutorService` con 4 thread, virtual thread;
- verifica che i tre risultati coincidano;
- misura i tempi con `System.nanoTime()` dopo una fase di riscaldamento;
- stampa una tabella con tempo e speedup rispetto alla versione sequenziale;
- spiega nel README perché i tempi cambiano.

Criterio: le misure sono reali, ripetute e commentate; un test JUnit verifica la correttezza della somma parallela.

### Progetto 2: Servizio con cache, Docker e CI

Requisiti:

- parti dal CRUD realizzato nella fase 5;
- aggiungi una cache con TTL di 60 secondi su una lettura e invalidala su modifica ed eliminazione;
- scrivi un `Dockerfile` multi-stage che produce un'immagine con solo il JRE;
- crea un `docker-compose.yml` con applicazione, PostgreSQL e Redis;
- aggiungi il workflow GitHub Actions con `mvn -B verify`;
- documenta nel README avvio, chiamate `curl` e scelte fatte.

Criterio: `docker compose up --build` avvia tutto e le API rispondono; la CI è verde.

### Progetto 3: Progetto finale del percorso

Una sola applicazione che metta insieme tutto: è il progetto che chiude Java.

Requisiti:

- applicazione Spring Boot con database PostgreSQL;
- API REST per almeno due risorse collegate (per esempio `Autore` e `Libro`);
- CRUD completo con validazione e gestione errori centralizzata;
- test automatici con JUnit e `MockMvc`, con `mvn verify` verde;
- logging nei punti chiave;
- una cache con scadenza su una lettura costosa;
- `Dockerfile` e `docker-compose.yml` per avviare applicazione e database;
- workflow GitHub Actions che compila e testa a ogni push;
- README con descrizione, istruzioni di avvio, esempi di chiamate `curl` e scelte progettuali;
- repository pubblico su GitHub con una storia dei commit leggibile.

Criterio: una persona che clona il repository riesce, seguendo solo il README, ad avviare il sistema con Docker, chiamare le API e vedere i test passare.

### Criteri di verifica

Per i tre progetti controlla che:

- [ ] `mvn verify` termina con successo, test compresi.
- [ ] `docker compose up --build` avvia tutti i servizi.
- [ ] Le chiamate `curl` restituiscono i codici di stato corretti.
- [ ] Un input non valido produce un `400` con un messaggio chiaro.
- [ ] I dati restano nel database dopo un riavvio.
- [ ] La cache si invalida dopo una modifica.
- [ ] Il workflow di CI è verde.
- [ ] Il README permette a un'altra persona di ripetere tutto da zero.

### Criteri di completamento del percorso

Hai chiuso la fase 6 quando sai:

- spiegare perché un contatore non sincronizzato perde aggiornamenti;
- scegliere tra `synchronized`, `AtomicInteger` e un pool;
- usare `ExecutorService` e `CompletableFuture` per lavoro asincrono;
- dire quando i virtual thread convengono e quando no;
- spiegare cosa fanno lo stack, lo heap e il garbage collector;
- trovare un collo di bottiglia misurando, non indovinando;
- riconoscere i pattern più comuni e non applicarli a caso;
- scrivere una classe con una sola responsabilità e dipendenze iniettate;
- aggiungere una cache con scadenza e spiegare come invalidarla;
- scrivere un `Dockerfile` e un `docker-compose.yml` funzionanti;
- impostare una pipeline di build e test;
- dire quali metriche guardare in produzione.

### Dopo questo percorso

Il passo successivo non è un altro tutorial: è un progetto scelto da te, portato fino al deploy, con test e CI. Da lì gli argomenti da approfondire dipendono dal dominio: web con Spring, Android, dati, sistemi distribuiti. La base per impararli è tutta qui.
