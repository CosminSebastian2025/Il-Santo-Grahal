In questo laboratorio costruisci **catalogo-jsp**, un'applicazione web completa e minima con Jakarta Server Pages: un elenco di prodotti letto da un repository in memoria, una ricerca con `GET /prodotti?q=`, un form che aggiunge un prodotto e una pagina di dettaglio. L'obiettivo non è avere un sito: è vedere ogni passaggio tra servlet, attributi, forward e JSP, con test sul container vero. Alla fine saprai dove guardare quando una pagina risponde 404, 500 o stampa vuoto.

## Obiettivi

- Creare un WAR Maven con Tomcat 11 embedded e verificare che parta con un solo comando.
- Scrivere una servlet di elenco e una di form che usano `request` come contratto verso le view.
- Impedire le richieste non idempotenti con il pattern redirect dopo POST (POST/Redirect/GET).
- Trasferire view in `WEB-INF`, EL e JSTL come unico modo di scrivere output.
- Aggiungere log e un test d'integrazione con `Tomcat.start()` contro l'HTML prodotto.

## Il contratto dell'applicazione

| Rotta | Metodo | Input | Output | Codice |
| --- | --- | --- | --- | --- |
| `/prodotti` | GET | `q` (opzionale) | elenco filtrato in `request` | 200 |
| `/prodotti/nuovo` | GET | nessuno | form di inserimento | 200 |
| `/prodotti` | POST | `nome`, `prezzo` | redirect a `/prodotti?creato=1` | 303 |
| `/prodotti/{id}` | GET | path `id` | dettaglio o 404 | 200 / 404 |
| `/WEB-INF/views/*` | qualsiasi | — | mai raggiungibile | 404 |

Il principio è quello di MVC classico: una sola classe servlet per gruppo di azioni, che prepara gli attributi e fa `forward` verso la view. Il POST non renderizza mai direttamente: risponde `303 See Other` con `Location: /prodotti?creato=1`, così un refresh non duplica il prodotto.

```bash
mvn archetype:generate -DgroupId=it.esempio -DartifactId=catalogo-jsp \
  -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false
```

## Struttura e dipendenze

Tomcat embedded evita di installare un server e rende il test ripetibile in CI. La dipendenza `tomcat-embed-jasper` porta con sé il motore JSP; `jakarta.servlet-api` resta in scope `provided` perché il container la fornisce.

```xml
<dependencies>
  <dependency>
    <groupId>org.apache.tomcat.embed</groupId>
    <artifactId>tomcat-embed-core</artifactId>
    <version>11.0.14</version>
  </dependency>
  <dependency>
    <groupId>org.apache.tomcat.embed</groupId>
    <artifactId>tomcat-embed-jasper</artifactId>
    <version>11.0.14</version>
  </dependency>
  <dependency>
    <groupId>org.glassfish.web</groupId>
    <artifactId>jakarta.servlet.jsp.jstl</artifactId>
    <version>3.0.1</version>
  </dependency>
</dependencies>
```

La versione di `tomcat-embed-*` va allineata in un solo punto, con una proprietà `<tomcat.version>`: dipendenze con patch diverse producono `NoSuchMethodError` all'avvio, un errore che sembra un problema dell'applicazione e non del build.

```text
src/main/java/it/esempio/
├── Prodotto.java          record con id, nome, prezzo
├── Catalogo.java          repository in memoria, thread-safe
├── ProdottiServlet.java    GET elenco e dettaglio, POST creazione
└── Server.java            Tomcat embedded con context a "src/main/webapp"
src/main/webapp/
├── WEB-INF/web.xml
└── WEB-INF/views/
    ├── layout.tagfrag
    ├── prodotti.jsp
    └── dettaglio.jsp
```

## La servlet che prepara la vista

`ProdottiServlet` sceglie l'azione dal path. Per l'elenco copia il filtro in `request`, invoca il repository e fa forward: la JSP non tocca mai il repository.

```java
@WebServlet(urlPatterns = {"/prodotti", "/prodotti/*"})
public class ProdottiServlet extends HttpServlet {
    private final Catalogo catalogo = new Catalogo();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String path = req.getPathInfo(); // null, "/" oppure "/{id}"
        if (path == null || path.equals("/")) {
            String q = Optional.ofNullable(req.getParameter("q")).orElse("").trim();
            req.setAttribute("query", q);
            req.setAttribute("prodotti", catalogo.cerca(q));
            req.getRequestDispatcher("/WEB-INF/views/prodotti.jsp").forward(req, resp);
            return;
        }
        long id = Long.parseLong(path.substring(1)); // NumberFormatException = 400
        var trovato = catalogo.trova(id);
        if (trovato.isEmpty()) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Prodotto " + id);
            return;
        }
        req.setAttribute("prodotto", trovato.get());
        req.getRequestDispatcher("/WEB-INF/views/dettaglio.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8"); // va impostato prima di getParameter nei form POST
        String nome = req.getParameter("nome");
        BigDecimal prezzo = new BigDecimal(req.getParameter("prezzo"));
        catalogo.aggiungi(nome, prezzo);
        resp.setStatus(HttpServletResponse.SC_SEE_OTHER);
        resp.setHeader("Location", req.getContextPath() + "/prodotti?creato=1");
    }
}
```

Il body della JSP resta dichiarativo: la ricerca è un form GET che porta `q`, la creazione un form POST che non viene mai ri-renderizzato.

```jsp
<%@ page contentType="text/html; charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fmt" uri="jakarta.tags.fmt" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<form method="get" action="${pageContext.request.contextPath}/prodotti">
  <input type="search" name="q" value="${fn:escapeXml(query)}" placeholder="Cerca prodotto">
  <button>Cerca</button>
</form>
<p>${fn:length(prodotti)} prodott<c:out value="${fn:length(prodotti) == 1 ? 'o' : 'i'}"/> trovati</p>
<table>
  <c:forEach items="${prodotti}" var="p">
    <tr>
      <td><a href="${pageContext.request.contextPath}/prodotti/${p.id}"><c:out value="${p.nome}"/></a></td>
      <td><fmt:formatNumber value="${p.prezzo}" type="currency" currencySymbol="€"/></td>
    </tr>
  </c:forEach>
</table>
```

`pageContext.request.contextPath` è la strada corretta per i link: senza il contesto l'applicazione funziona in sviluppo su `/` e si rompe quando viene distribuita su `/catalogo`. `fn:escapeXml` sul valore del campo di ricerca impedisce che un `q` contenente virgolette chiuda l'attributo `value` e inietti markup nel form.

## Avvio con Tomcat embedded e test

Il `main` avvia Tomcat sulla porta 8080 con il contesto che punta a `src/main/webapp`. Il test JUnit 5 segue lo stesso schema su una porta libera, scarica una pagina e controlla l'HTML prodotto: il comportamento che conta è quello visibile al client.

```java
public static void main(String[] args) throws Exception {
    Tomcat tomcat = new Tomcat();
    tomcat.setPort(8080);
    tomcat.getConnector();
    tomcat.addWebapp("", Path.of("src/main/webapp").toAbsolutePath().toString());
    tomcat.start();
    tomcat.getServer().await();
}

@Test
void elencoContieneIlProdottoCercato() throws Exception {
    try (var server = new EmbeddedServer(0)) { // porta 0 = assegnata
        server.start();
        var res = server.get("/prodotti?q=lampada");
        assertTrue(res.headers().firstValue("content-type").orElse("").startsWith("text/html"));
        assertTrue(res.body().contains("Lampada"));
        assertFalse(res.body().contains("Sedia"));
    }
}
```

| Verifica | Comando o richiesta | Atteso |
| --- | --- | --- |
| avvio | `mvn compile exec:java -Dexec.mainClass=it.esempio.Server` | Tomcat in ascolto su 8080 |
| elenco | `curl -s localhost:8080/prodotti` | tabella con tutti i prodotti |
| filtro | `curl -s "localhost:8080/prodotti?q=lamp"` | una o più righe, nessuna sedia |
| POST | `curl -si -d "nome=Tavolo&prezzo=199" localhost:8080/prodotti` | 303 e `Location: /prodotti?creato=1` |
| view protetta | `curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/WEB-INF/views/prodotti.jsp` | 404 |
| XSS | `curl -s "localhost:8080/prodotti?q=<script>"` | markup escapato, nessun `<script>` |

## Errori comuni

- **Chiamare `getParameter` prima di `setCharacterEncoding`**: i caratteri accentati arrivano rotti; l'encoding va impostato all'inizio di `doPost`.
- **Fare forward dalla POST invece del redirect**: un F5 duplica il prodotto e il problema si scopre solo in produzione.
- **Calcolare i link senza `contextPath`**: le applicazioni con contesto diverso da `/` generano 404 sui link interni.
- **Mettere la view fuori da `WEB-INF`**: la pagina diventa raggiungibile direttamente e mostra uno stato che il controller non ha preparato.
- **Testare il codice senza container**: la validazione dell'EL e della sintassi JSP avviene alla traduzione, quindi un test che non fa una richiesta HTTP non copre i template.

## In sintesi

Il laboratorio rende visibile il flusso completo: una servlet legge input, prepara attributi e fa forward a una view in `WEB-INF`; la view usa solo EL e JSTL, con escape in uscita; il POST risponde con un redirect e il test verifica l'HTML prodotto da Tomcat. Il passo successivo naturale è spostare il repository dietro un `DataSource` JNDI e ripetere i test con un database in-memory.

## Fonti

- [Apache Tomcat 11 - download delle distribuzioni](https://tomcat.apache.org/download-11.cgi)
- [Apache Tomcat 10.1 - applicazione di esempio (incluso JSP)](https://tomcat.apache.org/tomcat-10.1-doc/appdev/sample/)
- [Apache Tomcat 11 - Jasper HOW-TO](https://tomcat.apache.org/tomcat-11.0-doc/jasper-howto.html)
- [Jakarta Server Pages 4.0 - pagina della specifica](https://jakarta.ee/specifications/pages/4.0/)
