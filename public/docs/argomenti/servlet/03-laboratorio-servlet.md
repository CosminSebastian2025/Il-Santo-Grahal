In questo laboratorio costruisci `servlet-catalogo`, un'applicazione Web con due servlet, un filtro e una pagina di errore, eseguita su Tomcat 10.1. Il catalogo espone prodotti in JSON e un endpoint di salute; alla fine avrai un WAR che parte con pochi comandi e una verifica manuale di ogni caso, inclusi quelli che di solito si dimenticano.

## Obiettivi

- Creare un progetto Maven `war` con dipendenza `jakarta.servlet-api` in scope `provided`.
- Implementare due servlet con mappature diverse e una servlet senza stato.
- Aggiungere un filtro che verifica un header su un sottoinsieme di URL.
- Verificare il comportamento con `curl`: status code, header e corpo.
- Fermare Tomcat con lo shutdown script e leggere i log per confermare la distruzione del contesto.

## Preparare il progetto

Serve JDK 17 o superiore (Tomcat 10.1 richiede Java 11 come minimo, ma questo laboratorio usa le API fino a Java 17) e Maven 3.9. Il `pom.xml` dichiara `packaging` `war` e una sola dipendenza compilata: l'API del Servlet, che a runtime fornisce il container.

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>it.esempio</groupId>
  <artifactId>servlet-catalogo</artifactId>
  <version>1.0.0</version>
  <packaging>war</packaging>
  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>jakarta.servlet</groupId>
      <artifactId>jakarta.servlet-api</artifactId>
      <version>6.1.0</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
  <build>
    <finalName>catalogo</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-war-plugin</artifactId>
        <version>3.4.0</version>
        <configuration>
          <failOnMissingWebXml>false</failOnMissingWebXml>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

La struttura è quella standard: `src/main/java/it/esempio/web/` per le classi, `src/main/webapp/WEB-INF/web.xml` per il descriptor, `src/main/webapp/WEB-INF/viste/` per le pagine non raggiungibili direttamente.

| Percorso | Ruolo | Mappatura |
| --- | --- | --- |
| `ProdottiServlet` | elenco prodotti in JSON | `/prodotti/*` |
| `SaluteServlet` | stato dell'applicazione | `/salute` |
| `ApiKeyFilter` | header `X-API-Key` obbligatorio | `/prodotti/*` |
| `web.xml` | timeout sessione, pagina 404 | contesto |

## Le due servlet

`SaluteServlet` è la più semplice e serve a verificare che il deploy sia avvenuto: risponde sempre `200` con un corpo fisso. `ProdottiServlet` restituisce JSON e mostra il caso del parametro di percorso, usando `getPathInfo` per distinguere `/prodotti` da `/prodotti/42`.

```java
package it.esempio.web;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;

@WebServlet(name = "prodotti", urlPatterns = "/prodotti/*", loadOnStartup = 1)
public class ProdottiServlet extends HttpServlet {

    private record Prodotto(long id, String nome, int giacenza) {}

    private static final java.util.Map<Long, Prodotto> CATALOGO = java.util.Map.of(
        1L, new Prodotto(1L, "Vite M4", 1200),
        2L, new Prodotto(2L, "Dado M4", 3400),
        42L, new Prodotto(42L, "Rondella", 15)
    );

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json; charset=utf-8");
        String percorso = req.getPathInfo();
        if (percorso == null || "/".equals(percorso)) {
            resp.getWriter().print(aJson(CATALOGO.values()));
            return;
        }
        long id;
        try {
            id = Long.parseLong(percorso.substring(1));
        } catch (NumberFormatException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "id non numerico");
            return;
        }
        resp.getWriter().print(aJson(CATALOGO.values().stream()
            .filter(p -> p.id() == id).toList()));
    }

    private static String aJson(java.util.Collection<Prodotto> prodotti) {
        var sb = new StringBuilder("[");
        prodotti.forEach(p -> sb.append("{\"id\":%d,\"nome\":\"%s\",\"giacenza\":%d},"
            .formatted(p.id(), p.nome(), p.giacenza())));
        if (sb.length() > 1) sb.setLength(sb.length() - 1);
        return sb.append(']').toString();
    }
}
```

`CATALOGO` è `static final` e immutabile: nessuna richiesta può modificarlo, quindi la condivisione tra thread non è un problema. Nel caso reale il catalogo starebbe in un repository sul database, ma la servlet resterebbe senza stato.

## Filtro, sessione ed errori

Il filtro applica la chiave API solo alle richieste `/prodotti/*`: le richieste a `/salute` devono restare aperte, altrimenti il controllo di prontezza del bilanciatore fallisce.

```java
package it.esempio.web;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.*;
import java.io.IOException;

@WebFilter(urlPatterns = "/prodotti/*")
public class ApiKeyFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        String chiave = ((HttpServletRequest) req).getHeader("X-API-Key");
        if (!"lab-2026".equals(chiave)) {
            ((HttpServletResponse) resp).sendError(401, "chiave API mancante");
            return;
        }
        chain.doFilter(req, resp);
    }
}
```

Il `web.xml` aggiunge il timeout di sessione e la pagina di errore 404. La pagina sta sotto `WEB-INF`, quindi si raggiunge solo tramite dispatch interno. Gli URL di `xmlns` e `xsi:schemaLocation` devono essere quelli di Jakarta EE: con il vecchio namespace `java.sun.com` Tomcat legge il descriptor come Java EE 8 e ignora gli elementi nuovi.

```xml
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee https://jakarta.ee/xml/ns/jakartaee/web-app_6_1.xsd"
         version="6.1">
  <display-name>Catalogo</display-name>
  <session-config>
    <session-timeout>20</session-timeout>
    <cookie-config>
      <http-only>true</http-only>
    </cookie-config>
  </session-config>
  <error-page>
    <error-code>404</error-code>
    <location>/WEB-INF/viste/404.html</location>
  </error-page>
</web-app>
```

## Build, deploy e verifica

Compila il WAR e avvia Tomcat 10.1 con il WAR in `webapps`; al posto dei comandi puoi usare l'IDE o un'immagine Docker.

```bash
mvn -q clean package
unzip -q apache-tomcat-10.1.zip -d ~/tomcat
cp target/catalogo.war ~/tomcat/apache-tomcat-10.1/webapps/
~/tomcat/apache-tomcat-10.1/bin/startup.sh
tail -f ~/tomcat/apache-tomcat-10.1/logs/catalina.out
```

La verifica è una sequenza di `curl` con il codice di stato atteso: scopri subito se il filtro è mappato male o se la servlet non è stata trovata.

```bash
B=http://localhost:8080/catalogo
curl -s -o /dev/null -w "%{http_code}\n" $B/salute                    # 200
curl -s -o /dev/null -w "%{http_code}\n" $B/prodotti                   # 401
curl -s -H 'X-API-Key: lab-2026' $B/prodotti                           # JSON con 3 elementi
curl -s -H 'X-API-Key: lab-2026' $B/prodotti/42                        # {"id":42,...}
curl -s -w "\n%{http_code}\n" -H 'X-API-Key: lab-2026' $B/prodotti/99  # 404 + pagina
curl -s -w "\n%{http_code}\n" -H 'X-API-Key: lab-2026' $B/prodotti/abc # 400
```

## Esercizi

1. Aggiungi `doPost` su `/prodotti` che legge un JSON con `getReader` e rifiuta con `415` un `Content-Type` diverso da `application/json`.
2. Aggiungi un `Cache-Control: max-age=60` all'elenco e verifica con `curl -s -D - -o /dev/null` che la risposta a `/prodotti/42` invece non abbia cache.
3. Sposta il filtro in `web.xml`, aggiungi un filtro di logging con `Instant` di inizio e verifica quale entra prima.
4. Aggiungi un header `X-Request-Id` con `UUID.randomUUID()` e restituiscilo in errore 400/500.
5. Chiama `req.startAsync()` e prova a leggerne il comportamento: che cosa cambia se il filtro non dichiara `asyncSupported`?
6. Carrello in `HttpSession` su `/carrello`, `changeSessionId()` al login e logout che invalida.

<details>
<summary>Soluzione</summary>

1. `doPost` legge `req.getReader()` e verifica `req.getContentType()`: se manca o non inizia per `application/json` risponde `415`, altrimenti `201` con header `Location`.

2. Con `setHeader("Cache-Control", "max-age=60")` nell'elenco e `no-store` nel dettaglio. `doHead` predefinito invoca `doGet` su una risposta senza corpo, quindi gli header si esaminano con `curl -s -D - -o /dev/null`.

3. In `web.xml` dichiara `<filter-name>` per entrambi e i `<filter-mapping>` nell'ordine voluto: le catene seguono l'ordine dei mapping.

4. Il filtro su tutte le URL scrive l'header con `UUID.randomUUID()` e lo salva come attributo della richiesta, così la pagina di errore lo legge con `request.getAttribute`.

5. Senza `asyncSupported=true` sul filtro il container lancia `IllegalStateException` alla chiamata `startAsync()`: tutti i filtri della catena devono dichiararsi compatibili.

6. Il carrello è una lista nella sessione; `changeSessionId()` serve quando l'identificativo esisteva già prima del login, e con `curl -c jar -b jar` verifichi che il cookie cambi davvero.

</details>

## Errori comuni

- **Mettere `jakarta.servlet-api` in scope `compile`**: il WAR include l'API e Tomcat carica due copie, con errori al deploy.
- **Dimenticare `X-API-Key` nel test di salute**: se il filtro finisce su `/*`, il lifecycle probe riceve `401` e il servizio non entra mai in traffico.
- **Pubblicare la pagina 404 fuori da `WEB-INF`**: chiunque la raggiunge direttamente, e il contenuto delle pagine di errore diventa una risorsa.
- **Usare `System.out` al posto del logger del container**: i messaggi finiscono nel file di catalina senza livello né contesto.
- **Uscire senza `stop`**: Tomcat lascia il processo in ascolto sulla 8080 e il deploy successivo fallisce con `Address already in use`.

## In sintesi

Il laboratorio ha esposto i tre livelli di una servlet: il descriptor che dichiara sessione ed errori, il filtro che protegge un sottoinsieme di URL, la servlet che produce una rappresentazione. La struttura dice che la servlet non è sola nel container: filtri, descriptor e pagine di errore ne determinano gran parte del comportamento. Il passo successivo è la stessa funzionalità con gli standard Jakarta EE, REST, CDI e Persistence.

## Fonti

- [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/)
- [Apache Tomcat 10.1 Download](https://tomcat.apache.org/download-10.cgi)
- [Apache Tomcat Versions](https://tomcat.apache.org/whichversion.html)
- [Apache Maven](https://maven.apache.org/)
