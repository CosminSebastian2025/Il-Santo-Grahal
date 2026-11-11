# Lezione 25: Persistenza, validazione e sicurezza

Un'API con i dati in memoria sparisce a ogni riavvio. Questa lezione collega Spring Boot a PostgreSQL con JPA, valida gli input e protegge le password. Chiude la fase 5 con i progetti.

### Entità JPA

```java
package com.esempio.rubrica.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contatti")
public class Contatto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String telefono;
    private String email;

    public Contatto() { }

    public Contatto(String nome, String telefono, String email) {
        this.nome = nome;
        this.telefono = telefono;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public String getTelefono() { return telefono; }
    public String getEmail() { return email; }

    public void setNome(String nome) { this.nome = nome; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public void setEmail(String email) { this.email = email; }
}
```

- `@Entity` mappa la classe su una tabella;
- `@Id` e `@GeneratedValue` gestiscono la chiave;
- il costruttore vuoto è richiesto da JPA;
- i getter e setter servono a JPA e alla serializzazione JSON.

Relazioni comuni:

```java
@ManyToOne
@JoinColumn(name = "utente_id")
private Utente utente;

@OneToMany(mappedBy = "utente", cascade = CascadeType.ALL)
private List<Libro> libri = new ArrayList<>();
```

Attenzione alle relazioni bidirezionali serializzate in JSON: possono causare ricorsione infinita. In quei casi si usano DTO o `@JsonIgnore`.

### Repository

Spring genera l'implementazione a partire dal nome dei metodi.

```java
package com.esempio.rubrica.repository;

import com.esempio.rubrica.model.Contatto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContattoRepository extends JpaRepository<Contatto, Long> {

    List<Contatto> findByNomeContainingIgnoreCase(String nome);

    Optional<Contatto> findByEmail(String email);

    boolean existsByEmail(String email);
}
```

`JpaRepository` fornisce già `findAll`, `findById`, `save`, `deleteById`, `count`, `existsById`.

Derivazione dei nomi:

| Metodo | Query generata |
| --- | --- |
| `findByNome(String n)` | `WHERE nome = ?` |
| `findByNomeContaining(String n)` | `WHERE nome LIKE %?%` |
| `findByAnnoGreaterThan(int a)` | `WHERE anno > ?` |
| `findByAutoreOrderByAnnoDesc(String a)` | ordinamento incluso |
| `countByAutore(String a)` | conteggio |

Per query più complesse si usa `@Query` con JPQL o SQL nativo.

### Service

```java
package com.esempio.rubrica.service;

import com.esempio.rubrica.model.Contatto;
import com.esempio.rubrica.repository.ContattoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContattoService {

    private final ContattoRepository repository;

    public ContattoService(ContattoRepository repository) {
        this.repository = repository;
    }

    public List<Contatto> tutti() {
        return repository.findAll();
    }

    @Transactional
    public Contatto crea(Contatto contatto) {
        if (repository.existsByEmail(contatto.getEmail())) {
            throw new EmailDuplicataException(contatto.getEmail());
        }
        return repository.save(contatto);
    }

    public List<Contatto> cerca(String nome) {
        return repository.findByNomeContainingIgnoreCase(nome);
    }

    @Transactional
    public void elimina(Long id) {
        if (!repository.existsById(id)) {
            throw new ContattoNonTrovatoException(id);
        }
        repository.deleteById(id);
    }
}
```

L'iniezione per costruttore è la forma consigliata: la dipendenza è obbligatoria, il campo può essere `final` e i test sono semplici.

`@Transactional` fa iniziare una transazione al metodo e la conferma alla fine, oppure la annulla se viene lanciata un'eccezione runtime.

### Validazione

Non fidarti dell'input. Con `spring-boot-starter-validation`:

```java
package com.esempio.rubrica.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContattoRequest(

    @NotBlank(message = "Il nome è obbligatorio")
    @Size(max = 100, message = "Il nome è troppo lungo")
    String nome,

    @NotBlank(message = "Il telefono è obbligatorio")
    String telefono,

    @Email(message = "Email non valida")
    @NotBlank(message = "L'email è obbligatoria")
    String email
) { }
```

```java
import jakarta.validation.Valid;

@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public ContattoResponse crea(@Valid @RequestBody ContattoRequest request) {
    Contatto creato = service.crea(new Contatto(
        request.nome(), request.telefono(), request.email()));
    return ContattoResponse.da(creato);
}
```

Se la validazione fallisce, Spring risponde `400 Bad Request` con i dettagli.

Altre annotazioni utili:

| Annotazione | Verifica |
| --- | --- |
| `@NotNull` | non nullo |
| `@NotBlank` | testo non vuoto e con caratteri non di spazio |
| `@NotEmpty` | collezione o stringa non vuota |
| `@Size(min, max)` | lunghezza |
| `@Min` / `@Max` | intervallo numerico |
| `@Positive` / `@PositiveOrZero` | segno |
| `@Pattern(regexp = ...)` | espressione regolare |
| `@Past` / `@Future` | data passata o futura |

### Errori in JSON

```java
package com.esempio.rubrica.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GestoreErrori {

    @ExceptionHandler(ContattoNonTrovatoException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> nonTrovato(ContattoNonTrovatoException e) {
        return Map.of("errore", e.getMessage());
    }

    @ExceptionHandler(EmailDuplicataException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> duplicato(EmailDuplicataException e) {
        return Map.of("errore", e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> nonValido(MethodArgumentNotValidException e) {
        String messaggio = e.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .findFirst()
            .orElse("Richiesta non valida");
        return Map.of("errore", messaggio);
    }
}
```

Un solo punto per gli errori evita di ripetere `try`/`catch` in ogni controller.

### Password e sicurezza

Le password non si salvano mai in chiaro.

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SicurezzaConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

```java
String hash = passwordEncoder.encode("password-utente");
boolean corretta = passwordEncoder.matches("password-utente", hash);
```

`BCrypt` genera un hash con sale casuale: due password uguali producono hash diversi.

Regole minime per un'API:

- password hashate con BCrypt, mai in chiaro e mai nei log;
- HTTPS in produzione;
- token o sessioni con scadenza;
- CORS configurato solo per i domini necessari;
- rate limiting sull'endpoint di login;
- nessun dato sensibile nelle risposte;
- dipendenze aggiornate.

Con Spring Security lo standard pratico è **JWT** oppure un provider OAuth2. Non implementare da zero la crittografia: usa le librerie.

Configurazione sicura del database:

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
```

### Esempio completo

```java
package com.esempio.rubrica.web;

import com.esempio.rubrica.model.Contatto;
import com.esempio.rubrica.service.ContattoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contatti")
public class ContattoController {

    private final ContattoService service;

    public ContattoController(ContattoService service) {
        this.service = service;
    }

    record Risposta(long id, String nome, String email) {
        static Risposta da(Contatto c) {
            return new Risposta(c.getId(), c.getNome(), c.getEmail());
        }
    }

    @GetMapping
    public List<Risposta> elenco(@RequestParam(required = false) String nome) {
        List<Contatto> contatti = nome == null ? service.tutti() : service.cerca(nome);
        return contatti.stream().map(Risposta::da).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Risposta crea(@Valid @RequestBody ContattoRequest request) {
        Contatto creato = service.crea(new Contatto(
            request.nome(), request.telefono(), request.email()));
        return Risposta.da(creato);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void elimina(@PathVariable Long id) {
        service.elimina(id);
    }
}
```

```bash
curl -X POST http://localhost:8080/api/contatti \
  -H "Content-Type: application/json" \
  -d '{"nome":"Anna","telefono":"3331112222","email":"anna@example.com"}'
```

```json
{"id":1,"nome":"Anna","email":"anna@example.com"}
```

Con un'email vuota la risposta è `400` con `{"errore":"email: L'email è obbligatoria"}`. Con la stessa email due volte la risposta è `409`.

### Errori comuni

- Restituire l'entità con la password: usa un DTO.
- Usare `ddl-auto=create` in produzione: cancella le tabelle a ogni avvio.
- Gestire le eccezioni con `try`/`catch` in ogni controller invece di `@RestControllerAdvice`.
- Salvare la password con `MD5` o `SHA-1`: sono inadeguati per le password.
- Confondere `401` (non autenticato) con `403` (non autorizzato).
- Lasciare il database aperto a Internet senza credenziali forti.

## Esercizi progressivi

**Esercizio 1.** Crea un'entità `Libro` con id, titolo, autore e anno, e un `LibroRepository`.

**Esercizio 2.** Aggiungi a un controller `GET /api/libri` che usa `repository.findAll()`.

**Esercizio 3.** Aggiungi `GET /api/libri/{id}` con `404` se non esiste.

**Esercizio 4.** Aggiungi `POST /api/libri` con `@Valid` e un record di request.

**Esercizio 5.** Aggiungi una ricerca `GET /api/libri?titolo=...` con un metodo derivato.

**Esercizio 6.** Aggiungi `DELETE /api/libri/{id}` con `204` e `404` corretto.

**Esercizio 7.** Crea `Utente` con email unica e risposta `409` se duplicata.

**Esercizio 8.** Aggiungi un `@RestControllerAdvice` con tre gestori: 400, 404, 409.

**Esercizio 9.** Hasha una password con BCrypt e verifica con `matches`.

**Esercizio 10.** Configura il database con variabili d'ambiente e nessuna credenziale nel file di configurazione.

**Esercizio 11.** Scrivi un test con `@SpringBootTest` e `MockMvc` che chiama `GET /api/libri` e verifica `200`.

### Varianti

- Aggiungi `@ManyToOne` tra `Libro` e `Autore` e un endpoint per i libri di un autore.
- Aggiungi paginazione a `GET /api/libri` con `Pageable`.
- Aggiungi `@Pattern` sul telefono e verifica la risposta `400`.

## Progetti della fase 5

### Progetto 1: API libri

Requisiti: entità `Libro` con titolo, autore, anno e ISBN; CRUD completo; ricerca per titolo e autore; validazione con `@NotBlank` e `@Min(1000)` sull'anno; errori JSON con codici corretti.

### Progetto 2: API utenti

Requisiti: entità `Utente` con nome, email unica e data di registrazione; `409` su email duplicata; password hashata con BCrypt; `GET` che non restituisce mai la password; aggiornamento di nome ed email; eliminazione con `204`.

### Progetto 3: Blog backend

Requisiti: `Post` con titolo, contenuto, autore e data; `Commento` collegato con `@ManyToOne`; `GET /api/posts` con paginazione; `GET /api/posts/{id}/commenti`; `POST /api/posts/{id}/commenti`; lunghezza minima del contenuto validata.

### Progetto 4: Sistema ordini

Requisiti: `Cliente`, `Ordine` e `RigaOrdine`; un ordine con più righe (`@OneToMany`); totale calcolato nel service; `POST /api/ordini` con verifica disponibilità e salvataggio in transazione; `GET /api/clienti/{id}/ordini`; annullamento con stato aggiornato.

### Progetto 5: Gestionale semplificato

Requisiti: prodotti con giacenza; movimenti di entrata e uscita in una tabella `Movimento`; allarme sotto soglia; report mensile per prodotto; API per elenco prodotti, movimenti e report.

### Progetto 6: CRUD completo end-to-end

Requisiti: API REST per una risorsa a scelta; Create, Read, Update, Delete; validazione, gestione errori e test con `MockMvc`; chiamate `curl` documentate nel README; PostgreSQL avviato con Docker e istruzioni nel README.

Criterio: chi segue il README avvia database e applicazione ed esegue tutte le operazioni.

### Criteri di verifica

- [ ] Le credenziali arrivano da variabili d'ambiente.
- [ ] Le password sono hashate con BCrypt.
- [ ] Ogni input passa da `@Valid`.
- [ ] Gli errori sono gestiti in un `@RestControllerAdvice`.
- [ ] Le risposte usano DTO, non entità con dati interni.
- [ ] I codici di stato sono coerenti (`201`, `204`, `404`, `409`).
- [ ] I test con `MockMvc` coprono almeno elenco, dettaglio e creazione.

Nella fase 6 si affrontano concorrenza, prestazioni e architettura: gli argomenti che distinguono un progetto che funziona da un progetto che regge il carico.
