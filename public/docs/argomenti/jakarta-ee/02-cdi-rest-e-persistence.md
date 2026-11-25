Su Jakarta EE le specifiche non vanno imparate una per una: vanno imparate nei punti in cui si toccano. Una richiesta REST arriva alla classe annotata con `@Path`, il container crea l'istanza e inietta l'`EntityManager`; una transazione parte al confine del metodo; un errore si traduce in una risposta HTTP. Questa lezione segue un endpoint di catalogo attraverso quattro specifiche — CDI, REST, Persistence e la configurazione del profilo Web — e mostra dove il contratto ti obbliga a fare una scelta.

## Obiettivi

- Strutturare un'applicazione con CDI: scope, injection e alternative.
- Esprimere un endpoint REST con `jakarta.ws.rs` e rispondere con oggetti invece di stringhe.
- Mappare entità con Jakarta Persistence 3.2 e gestire transazioni senza `try/finally` manuali.
- Sapere cosa configurare in `beans.xml`, nello schema del database e nel server.

## CDI: il contenitore che lega le parti

CDI (Contexts and Dependency Injection) crea e gestisce i bean e i loro scope. Un bean è una classe con un costruttore senza argomenti o con `@Inject` sul costruttore, e lo scope dice per quanto tempo vive l'istanza: `@ApplicationScoped` per un servizio senza stato, `@RequestScoped` per un oggetto che dipende dalla richiesta, `@Dependent` per un'istanza che vive quanto chi la inietta. L'iniezione avviene per tipo, non per nome, salvo qualificatori espliciti.

```java
package it.esempio.catalogo;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.enterprise.inject.Produces;
import jakarta.enterprise.inject.Disposes;
import jakarta.persistence.*;

@ApplicationScoped
public class Risorse {

    @PersistenceContext(unitName = "catalogo")
    EntityManager em;

    @Produces @ApplicationScoped
    public java.time.Clock clock() {
        return java.time.Clock.systemUTC();
    }

    public void chiudi(@Disposes java.time.Clock clock) { /* nessuna risorsa da liberare */ }
}
```

`@PersistenceContext` non è CDI puro: è un'annotazione di Persistence che il container riconosce e risolve con un `EntityManager` transazionale. Nella Persistence 3.2 l'`EntityManager` si può anche ottenere con `@Inject` e uno scope CDI, il che permette di decidere il confine della persistenza nel codice invece che nel container. Per un'applicazione tradizionale `@PersistenceContext` resta la scelta più semplice, e l'`EntityManager` vive legato alla transazione.

Sul profilo Web, CDI 4.1 e la sua parte Lite rimuovono il concetto di managed bean: il vecchio `@ManagedBean` di Java EE non esiste più. La migrazione è meccanica: `@ManagedBean` diventa `@Named` più uno scope CDI, e le viste JSF risolvono il nome espresso come prima.

## REST e Persistence: un endpoint di sola lettura

L'endpoint REST è una classe con `@Path`; ogni metodo ha un'annotazione HTTP (`@GET`, `@POST`) e un `@Produces`. Restituire `Response` permette di controllare status e header, ma per un elenco ben definito un `List<ProdottoDto>` con `200` implicito è più leggibile e più facile da testare.

```java
@Path("/prodotti")
@Produces(MediaType.APPLICATION_JSON)
public class ProdottiResource {

    @Inject ProdottiService servizio;

    @GET
    public List<ProdottoDto> elenco(@QueryParam("q") String filtro,
                                    @QueryParam("max") @DefaultValue("20") int max) {
        return servizio.cerca(filtro, Math.min(max, 100));
    }

    @GET @Path("{id}")
    public Response dettaglio(@PathParam("id") long id) {
        var trovato = servizio.trova(id);
        return trovato.isPresent()
            ? Response.ok(trovato.get()).build()
            : Response.status(Response.Status.NOT_FOUND).build();
    }

    @POST @Consumes(MediaType.APPLICATION_JSON)
    public Response crea(NuovoProdotto nuovo, @Context UriInfo uri) {
        var creato = servizio.crea(nuovo);
        return Response.created(uri.getAbsolutePathBuilder().path("" + creato.id()).build()).build();
    }
}

@ApplicationScoped
public class ProdottiService {
    @PersistenceContext(unitName = "catalogo") EntityManager em;

    public List<ProdottoDto> cerca(String q, int max) {
        var cq = em.getCriteriaBuilder().createQuery(ProdottoDto.class);
        var root = cq.from(Prodotto.class);
        cq.select(em.getCriteriaBuilder().construct(ProdottoDto.class, root.get("id"), root.get("nome")));
        if (q != null && !q.isBlank()) cq.where(em.getCriteriaBuilder().like(root.get("nome"), "%" + q + "%"));
        return em.createQuery(cq).setMaxResults(max).getResultList();
    }
}
```

L'entità mappa la tabella e non deve uscire direttamente come JSON: un `ProdottoDto` evita di serializzare relazioni pigre e di esporre campi interni. Il costruttore `construct` della Criteria API crea il DTO direttamente in query, senza caricare l'entità.

| Specifica | Annotazione | Contratto che impone |
| --- | --- | --- |
| CDI 4.1 | `@Inject`, `@ApplicationScoped` | l'istanza è gestita dal container, non da `new` |
| RESTful WS 4.0 | `@Path`, `@GET`, `@Produces` | la risorsa è per risorsa, i metodi HTTP hanno semantica |
| Persistence 3.2 | `@Entity`, `@PersistenceContext` | l'`EntityManager` è legato alla transazione |
| Bean Validation 3.1 | `@NotNull`, `@Size` | la validazione avviene prima del metodo |
| JSON Binding 3.0 | `@SerializedName` | il nome del campo Java e del JSON possono divergere |

Da Jakarta RESTful Web Services 4.0 l'annotazione `@Context` è deprecata: al suo posto si usa `@Inject`, che rende l'iniezione coerente con il resto della piattaforma; `@Context` resta accettato per compatibilità verso il codice esistente, compreso quello dei JAX-RS 3.x.

## Transazioni, persistenza e configurazione

Scrivere richiede un confine transazionale. Su un bean CDI con un `EntityManager` transazionale, `@Transactional` di Transactions 2.0 dichiara il confine e il container fa commit o rollback in base all'eccezione: le `RuntimeException` fanno rollback, le eccezioni controllate no, salvo `@Transactional(rollbackOn = ...)`. Questa è la differenza più frequente rispetto a chi arriva da Spring: la regola del rollback dipende dal tipo di eccezione, non da un'interfaccia.

```java
@Transactional
public ProdottoDto crea(NuovoProdotto nuovo) {
    var p = new Prodotto();
    p.setNome(nuovo.nome());
    em.persist(p);          // SQL eseguito al flush, non subito
    return new ProdottoDto(p.getId(), p.getNome());
}
```

Il file `persistence.xml` in `META-INF` dichiara l'unità di persistenza; dal 3.2 la si può costruire in Java, utile nei test e nelle librerie che non possono scrivere risorse. Con GlassFish l'unità è configurata anche nel `domain.xml`, e il nome usato in `@PersistenceContext` deve corrispondere a quello dichiarato lì.

## Errori comuni

- **Usare `new` per un bean CDI**: il container non può iniettare, le transazioni non partono e gli interceptor sono saltati.
- **Iniettare un bean a scope molto più breve in uno a scope lungo**: un `@RequestScoped` in un `@ApplicationScoped` funziona solo con un client proxy, che in alcuni container è disattivato per default.
- **Restituire entità JPA come JSON**: relazioni pigre non inizializzate e cicli di serializzazione; DTO o trasferimenti di valori evitano entrambi.
- **Aspettarsi il rollback su una `Exception` controllata**: il container fa commit: serve `@Transactional(rollbackOn = MiaException.class)`.
- **Aggiungere `beans.xml` vuoto sperando che attivi tutto**: in CDI 4 l'`emptiness` è implicito, il file serve per le alternative e per attivare gli interceptor.
- **Testare solo con il `main`**: senza il container CDI non c'è iniezione; testare service e resource con un runtime leggero è il modo per vedere i confini veri.

## In sintesi

Jakarta EE funziona quando le specifiche si incontrano: CDI gestisce la vita degli oggetti, REST la traduzione da HTTP a chiamate Java, Persistence la traduzione da oggetti a SQL, Transactions la loro unità. Ogni specifica ha una regola che il codice deve rispettare, e molte sono regole di tenuta del contesto: bean gestiti, `EntityManager` legato alla transazione, rollback deciso dal tipo di eccezione. Rispettare questi confini rende il codice portabile tra GlassFish, WildFly e Payara senza scrivere adattatori.

## Fonti

- [Jakarta RESTful Web Services 4.0](https://jakarta.ee/specifications/restful-ws/4.0/)
- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/)
- [Jakarta CDI 4.1](https://jakarta.ee/specifications/cdi/4.1/)
- [Jakarta EE Tutorial](https://jakarta.ee/learn/docs/jakartaee-tutorial/current/)
