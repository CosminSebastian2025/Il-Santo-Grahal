# Lezione 24: Spring Boot e API REST

Spring Boot crea applicazioni Java con server web incluso. In pochi minuti hai un endpoint HTTP funzionante; con qualche classe hai una API REST completa.

### Creare il progetto

Si parte da [start.spring.io](https://start.spring.io) con:

- **Spring Web** per le API REST;
- **Spring Data JPA** per il database;
- **Validation** per i controlli sugli input;
- **PostgreSQL Driver** oppure **H2** per i test.

Il progetto generato contiene:

```text
demo/
├── pom.xml
├── mvnw
└── src/
    ├── main/
    │   ├── java/com/esempio/demo/
    │   │   └── DemoApplication.java
    │   └── resources/
    │       └── application.properties
    └── test/
```

### La classe di avvio

```java
package com.esempio.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

Avvio:

```bash
./mvnw spring-boot:run      # Linux e macOS
mvnw.cmd spring-boot:run    # Windows
```

Il server ascolta su `http://localhost:8080`.

### Primo controller

```java
package com.esempio.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SalutoController {

    @GetMapping("/api/saluto")
    public String saluto() {
        return "Ciao dal server";
    }
}
```

`@RestController` registra la classe e converte il valore di ritorno in JSON (o testo, se è una stringa). Apri `http://localhost:8080/api/saluto` nel browser: vedi il messaggio.

### REST: risorse e metodi

| Metodo | Operazione | Esempio |
| --- | --- | --- |
| `GET` | legge | `GET /api/libri` |
| `GET` | legge uno | `GET /api/libri/7` |
| `POST` | crea | `POST /api/libri` |
| `PUT` | sostituisce | `PUT /api/libri/7` |
| `PATCH` | modifica parziale | `PATCH /api/libri/7` |
| `DELETE` | elimina | `DELETE /api/libri/7` |

Regole:

- i nomi sono sostantivi al plurale: `/api/libri`, non `/api/getLibri`;
- lo stato non va nell'URL: il metodo HTTP dice l'operazione;
- ogni risposta ha un codice coerente.

### Un CRUD in memoria

```java
package com.esempio.demo;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/libri")
public class LibroController {

    public record Libro(Long id, String titolo, String autore, int anno) { }

    private final List<Libro> libri = new ArrayList<>();
    private final AtomicLong contatore = new AtomicLong(0);

    @GetMapping
    public List<Libro> elenco(@RequestParam(required = false) String autore) {
        if (autore == null) {
            return libri;
        }
        return libri.stream()
            .filter(l -> l.autore().equalsIgnoreCase(autore))
            .toList();
    }

    @GetMapping("/{id}")
    public Libro dettaglio(@PathVariable Long id) {
        return cerca(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Libro crea(@RequestBody Libro libro) {
        Libro nuovo = new Libro(contatore.incrementAndGet(),
            libro.titolo(), libro.autore(), libro.anno());
        libri.add(nuovo);
        return nuovo;
    }

    @PutMapping("/{id}")
    public Libro aggiorna(@PathVariable Long id, @RequestBody Libro libro) {
        Libro esistente = cerca(id);
        libri.remove(esistente);
        Libro aggiornato = new Libro(id, libro.titolo(), libro.autore(), libro.anno());
        libri.add(aggiornato);
        return aggiornato;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void elimina(@PathVariable Long id) {
        libri.remove(cerca(id));
    }

    private Libro cerca(Long id) {
        return libri.stream()
            .filter(l -> l.id().equals(id))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Libro non trovato"));
    }
}
```

Annotazioni principali:

| Annotazione | Uso |
| --- | --- |
| `@RestController` | controller che restituisce dati, non pagine |
| `@RequestMapping` | prefisso comune degli URL |
| `@GetMapping`, `@PostMapping`, ... | metodo HTTP dell'endpoint |
| `@PathVariable` | valore preso dal percorso (`/libri/{id}`) |
| `@RequestParam` | valore dalla query string (`?autore=Eco`) |
| `@RequestBody` | corpo della richiesta convertito in oggetto |
| `@ResponseStatus` | codice di stato della risposta |

### Codici di stato

| Codice | Significato |
| --- | --- |
| 200 | OK |
| 201 | creato |
| 204 | nessun contenuto (eliminazione riuscita) |
| 400 | richiesta non valida |
| 401 | non autenticato |
| 403 | non autorizzato |
| 404 | risorsa non trovata |
| 409 | conflitto (per esempio email duplicata) |
| 500 | errore del server |

### JSON

Spring converte automaticamente gli oggetti in JSON.

Richiesta:

```bash
curl -X POST http://localhost:8080/api/libri \
  -H "Content-Type: application/json" \
  -d '{"titolo":"Il nome della rosa","autore":"Umberto Eco","anno":1980}'
```

Risposta:

```json
{"id":1,"titolo":"Il nome della rosa","autore":"Umberto Eco","anno":1980}
```

Altre chiamate:

```bash
curl http://localhost:8080/api/libri
curl http://localhost:8080/api/libri/1
curl "http://localhost:8080/api/libri?autore=Umberto%20Eco"
curl -X DELETE http://localhost:8080/api/libri/1 -i
```

`-i` mostra gli header e il codice di stato: utile per verificare `201`, `204`, `404`.

### Configurazione

`src/main/resources/application.properties`:

```properties
spring.application.name=demo
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/miodb
spring.datasource.username=postgres
spring.datasource.password=password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

Le credenziali in chiaro vanno bene solo in locale. In produzione si usano variabili d'ambiente:

```properties
spring.datasource.password=${DB_PASSWORD}
```

### HTTP: cosa contiene una richiesta

```text
POST /api/libri HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer <token>

{"titolo":"Il nome della rosa"}
```

- **metodo** e **percorso**;
- **header**: tipo di contenuto, autenticazione, cache;
- **body**: i dati, solo per `POST`, `PUT` e `PATCH`.

La risposta ha un codice, degli header e un body.

### Esempio completo: API contatti

```java
package com.esempio.demo;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/contatti")
public class ContattoController {

    public record ContattoRequest(String nome, String telefono, String email) { }

    public record ContattoResponse(long id, String nome, String telefono, String email) { }

    private final List<ContattoResponse> contatti = new ArrayList<>();
    private long prossimoId = 1;

    @GetMapping
    public List<ContattoResponse> elenco() {
        return contatti;
    }

    @GetMapping("/{id}")
    public ContattoResponse uno(@PathVariable long id) {
        return trova(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContattoResponse crea(@RequestBody ContattoRequest request) {
        if (request.nome() == null || request.nome().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome obbligatorio");
        }

        ContattoResponse nuovo = new ContattoResponse(
            prossimoId++, request.nome(), request.telefono(), request.email());
        contatti.add(nuovo);
        return nuovo;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void elimina(@PathVariable long id) {
        contatti.remove(trova(id));
    }

    private ContattoResponse trova(long id) {
        return contatti.stream()
            .filter(c -> c.id() == id)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Contatto " + id + " non trovato"));
    }
}
```

Con questo controller:

- `GET /api/contatti` restituisce la lista;
- `GET /api/contatti/1` restituisce un contatto o `404`;
- `POST /api/contatti` crea e risponde `201`;
- `DELETE /api/contatti/1` elimina e risponde `204`.

I dati sono in memoria: al riavvio spariscono. Nella lezione 25 arrivano database, validazione e sicurezza.

### Errori comuni

- Usare `@Controller` invece di `@RestController` e ottenere una pagina invece di JSON.
- Dimenticare `@RequestBody`: il parametro arriva `null`.
- Mettere lo stato nell'URL (`/api/libri/crea`).
- Restituire `200` dopo una creazione: il codice corretto è `201`.
- Restituire `200` con `null` quando la risorsa non esiste: serve `404`.
- Lasciare `spring.jpa.hibernate.ddl-auto=create` in produzione: cancella le tabelle a ogni avvio.
- Inserire credenziali reali in `application.properties` versionato.

## Esercizi progressivi

**Esercizio 1.** Genera un progetto Spring Boot con Spring Web e crea `/api/saluto` che restituisce una stringa.

**Esercizio 2.** Crea `/api/ora` che restituisce l'ora corrente come JSON.

**Esercizio 3.** Crea un controller `/api/libri` con un `record Libro` e un `GET` che restituisce una lista fissa di tre libri.

**Esercizio 4.** Aggiungi `GET /api/libri/{id}` che restituisce `404` se l'id non esiste.

**Esercizio 5.** Aggiungi `POST /api/libri` con `201` e id progressivo.

**Esercizio 6.** Aggiungi `PUT /api/libri/{id}` e verifica la risposta con `curl`.

**Esercizio 7.** Aggiungi `DELETE /api/libri/{id}` con risposta `204`.

**Esercizio 8.** Aggiungi il filtro `GET /api/libri?autore=Eco`.

**Esercizio 9.** Aggiungi una validazione manuale che risponde `400` se il titolo è vuoto.

**Esercizio 10.** Prova tutte le operazioni con `curl -i` e annota i codici di stato.

**Esercizio 11.** Configura `server.port=9090` in `application.properties` e verifica.

### Varianti

- Sposta la lista in un `@Service` e inietta il service nel controller.
- Aggiungi `PATCH /api/libri/{id}` che aggiorna solo l'anno.
- Aggiungi un endpoint `/api/libri/conta` che restituisce il numero di libri in JSON.
