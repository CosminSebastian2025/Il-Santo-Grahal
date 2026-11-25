In questo laboratorio costruisci `catalogo-jakarta`, un servizio REST per un catalogo di prodotti che gira su GlassFish 7 con Jakarta EE 11: entità JPA su H2, bean CDI con transazioni, endpoint `jakarta.ws.rs` e niente framework. Ogni passo termina con una verifica che dice se il contratto delle specifiche è stato rispettato.

## Obiettivi

- Generare un progetto Jakarta EE 11 con il BOM corretto e impacchettarlo come WAR.
- Mappare un'entità e dichiarare l'unità di persistenza per un database H2 in memoria.
- Esporre CRUD REST con JAX-RS 4.0 e servire la risorsa con CDI.
- Dichiarare il confine transazionale con `@Transactional` e verificare il rollback.
- Eseguire il deploy, chiamare l'API con `curl` e leggere i log del server.

## Creare il progetto e predisporre il deploy

GlassFish 7 è implementazione di riferimento del Platform 11 e supporta Java 17 e 21. Il progetto si genera da `start.jakarta.ee` scegliendo "GlassFish" e "Jakarta EE 11"; in alternativa, il `pom.xml` importa il BOM, così tutte le specifiche hanno la stessa versione.

```xml
<properties>
  <maven.compiler.release>17</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>jakarta.platform</groupId>
      <artifactId>jakarta.jakartaee-bom</artifactId>
      <version>11.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>jakarta.platform</groupId>
    <artifactId>jakarta.jakartaee-api</artifactId>
    <scope>provided</scope>
  </dependency>
  <dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <version>2.3.232</version>
  </dependency>
</dependencies>
```

Una sola dipendenza `provided` copre tutte le API del Platform; il driver H2 va nel WAR perché il server non lo fornisce. Il packaging è `war` con `<failOnMissingWebXml>false</failOnMissingWebXml>` e `finalName` `catalogo`.

| File | Posizione | Ruolo |
| --- | --- | --- |
| `Prodotto.java` | `src/main/java/.../entity/` | mappatura JPA |
| `persistence.xml` | `src/main/resources/META-INF/` | unità di persistenza |
| `ProdottiResource.java` | `src/main/java/.../rest/` | endpoint JAX-RS |
| `ProdottiService.java` | `src/main/java/.../service/` | CDI e transazioni |

## Entità, unità di persistenza e servizio

L'entità è un POJO con `@Entity`, chiave generata e colonne nominate esplicitamente: fissare `@Column` rende la mappatura indipendente dalle convenzioni dei nomi di ogni database.

```java
package it.esempio.catalogo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "prodotti")
public class Prodotto {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank @Size(max = 80)
    @Column(name = "nome", nullable = false, length = 80)
    private String nome;

    @Min(0)
    @Column(name = "giacenza", nullable = false)
    private int giacenza;

    public Prodotto() {}                       // richiesto da JPA
    public Prodotto(String nome, int giacenza) { this.nome = nome; this.giacenza = giacenza; }
    public Long getId() { return id; }
    public String getNome() { return nome; }
    public int getGiacenza() { return giacenza; }
}
```

`persistence.xml` dichiara l'unità `catalogo` con le classi gestite e le proprietà del provider. Le proprietà con prefisso `jakarta.persistence.jdbc.*` sono standard dal 2.0 e vengono lette anche quando il provider è EclipseLink, quello incluso in GlassFish.

```xml
<persistence xmlns="https://jakarta.ee/xml/ns/persistence"
             version="3.0">
  <persistence-unit name="catalogo" transaction-type="JTA">
    <class>it.esempio.catalogo.entity.Prodotto</class>
    <exclude-unlisted-classes>true</exclude-unlisted-classes>
    <properties>
      <property name="jakarta.persistence.jdbc.url" value="jdbc:h2:mem:catalogo;DB_CLOSE_DELAY=-1"/>
      <property name="jakarta.persistence.jdbc.driver" value="org.h2.Driver"/>
      <property name="jakarta.persistence.jdbc.user" value="sa"/>
      <property name="jakarta.persistence.schema-generation.database.action" value="drop-and-create"/>
      <property name="eclipselink.logging.level.sql" value="FINE"/>
    </properties>
  </persistence-unit>
</persistence>
```

`DB_CLOSE_DELAY=-1` mantiene il database in memoria finché la JVM è viva; senza, H2 lo cancella alla chiusura dell'ultima connessione e le tabelle spariscono a metà test. `drop-and-create` è comodo in laboratorio ma va rimosso in produzione.

Il servizio è un bean CDI che usa `@Transactional` sui metodi di scrittura, mentre il `@PersistenceContext` con `unitName` lega l'`EntityManager` all'unità dichiarata.

```java
@ApplicationScoped
public class ProdottiService {

    @PersistenceContext(unitName = "catalogo")
    EntityManager em;

    public List<Prodotto> elenco(int max) {
        return em.createQuery("select p from Prodotto p order by p.id", Prodotto.class)
                 .setMaxResults(Math.min(max, 100)).getResultList();
    }

    @Transactional
    public Prodotto crea(String nome, int giacenza) {
        var p = new Prodotto(nome, giacenza);
        em.persist(p);
        return p;
    }

    @Transactional
    public void scarica(long id, int quantita) {
        var p = em.find(Prodotto.class, id);
        if (p == null) throw new NotFoundException("prodotto " + id);
        if (p.getGiacenza() < quantita)
            throw new IllegalStateException("giacenza insufficiente");
        p.setGiacenza(p.getGiacenza() - quantita);    // flush al commit
    }
}
```

## L'endpoint REST e il confine transazionale

`ProdottiResource` è un bean CDI a scope richiesta: ogni chiamata HTTP ha un'istanza e l'iniezione risolve il servizio. `@Path` dichiara il prefisso della classe, i metodi dichiarano il verbo e `@Consumes` il tipo letto.

```java
@Path("/prodotti")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class ProdottiResource {

    @Inject ProdottiService servizio;

    @GET
    public List<Prodotto> elenco(@QueryParam("max") @DefaultValue("20") int max) {
        return servizio.elenco(max);
    }

    @POST @Consumes(MediaType.APPLICATION_JSON)
    public Response crea(NuovoProdotto corpo, @Context UriInfo uri) {
        var p = servizio.crea(corpo.nome(), corpo.giacenza());
        return Response.created(uri.getAbsolutePathBuilder().path(p.getId().toString()).build()).build();
    }
}
```

Il rollback è la parte da verificare. Su `POST /prodotti/{id}/scarica` il servizio lancia `IllegalStateException` quando la giacenza non basta: essendo una `RuntimeException`, il container esegue rollback. Con una `Exception` controllata il container farebbe commit, e questo è il caso da provare nel punto 5.

Gli errori REST si traducono in status con `ExceptionMapper`: senza mapper un `IllegalStateException` diventa `500`, mentre `NotFoundException` di JAX-RS diventa già `404`.

```java
@Provider
public class ErroriMapper implements ExceptionMapper<Throwable> {
    public Response toResponse(Throwable t) {
        if (t instanceof jakarta.ws.rs.NotFoundException nf) return Response.status(404).entity(nf.getMessage()).build();
        if (t instanceof IllegalStateException e) return Response.status(409).entity(e.getMessage()).build();
        return Response.status(500).build();
    }
}
```

## Deploy e verifica

Deploy del WAR su GlassFish 7 e verifica con `curl`.

```bash
mvn -q clean package
asadmin deploy --force target/catalogo.war
B=http://localhost:8080/catalogo/api
curl -s -o /dev/null -w "%{http_code}\n" $B/prodotti                  # 200 []
curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/prodotti \
  -H 'Content-Type: application/json' -d '{"nome":"Rondella","giacenza":10}'   # 201
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$B/prodotti/1/scarica?q=99" # 409
curl -s $B/prodotti | grep giacenza                                    # resta 10
```

## Esercizi

1. Aggiungi `GET /prodotti/{id}` con `404` esplicito.
2. Sostituisci l'entità restituita con un `record` DTO costruito direttamente in query.
3. Aggiungi Bean Validation sul corpo di `crea` e un mapper per `ConstraintViolationException`: quale status scegli?
4. Porta la giacenza su una colonna `@Version` e prova due scariche concorrenti con `curl`.
5. Sostituisci `IllegalStateException` con una `Exception` controllata: che cosa cambia dopo la scarica fallita?

<details>
<summary>Soluzione</summary>

1. `em.find` restituisce `null` e il servizio lancia `NotFoundException` di JAX-RS, che diventa `404`.

2. Con Criteria API `construct` e un `record` come tipo di ritorno: nessuna entità esce e le relazioni pigre non sono più un problema.

3. Il mapper costruisce un JSON con i campi violati; `422` distingue la richiesta sintatticamente valida ma semanticamente errata.

4. `@Version` fa fallire il secondo update con `OptimisticLockException`: due `curl` con `&` mostrano la sequenza.

5. Con l'eccezione controllata il container esegue commit: serve `@Transactional(rollbackOn = MiaEccezione.class)`.

</details>

## Errori comuni

- **Dimenticare `@Transactional` sul metodo di scrittura**: con JTA e un `EntityManager` container-managed, fuori transazione il `persist` lancia `TransactionRequiredException`.
- **Includere `jakarta.jakartaee-api` in scope `compile`**: il WAR package tutte le API e il server ne carica una copia in conflitto con la sua.
- **Lasciare `drop-and-create` in produzione**: al riavvio le tabelle vengono ricreate e i dati spariscono.
- **Deployare su GlassFish senza driver nel WAR**: `ClassNotFoundException: org.h2.Driver` arriva alla prima connessione, non al deploy.

## In sintesi

Il laboratorio ha attraversato le specifiche che rendono utile Jakarta EE: CDI crea e inietta, JAX-RS traduce HTTP, Persistence traduce oggetti, Transactions decide se una modifica vive o sparisce. Il WAR non contiene framework, solo il driver del database, e il codice compilato resta portabile tra server. La verifica più importante non è il `201` ma il `409` seguito da una giacenza invariata.

## Fonti

- [Jakarta EE 11 Release](https://jakarta.ee/release/11/)
- [Jakarta EE Starter](https://start.jakarta.ee/)
- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/)
- [Jakarta RESTful Web Services 4.0](https://jakarta.ee/specifications/restful-ws/4.0/)
