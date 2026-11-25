Una servlet è un oggetto Java che il container web invoca per rispondere a una richiesta HTTP: non apre socket, non fa parsing del protocollo, non gestisce il ciclo di vita della connessione. Riceve un `HttpServletRequest` già popolato e scrive su un `HttpServletResponse`; tutto il resto è compito del container, Tomcat in primis. Capire questo confine è il punto di partenza per scrivere servlet corrette.

## Obiettivi

- Descrivere il ciclo di vita di una servlet (`init`, `service`, `destroy`) e il ruolo del container.
- Distinguere `GenericServlet`, `HttpServlet` e i metodi `doGet`/`doPost`.
- Leggere parametri, header, cookie e body senza perdere la semantica HTTP.
- Configurare una servlet con `@WebServlet` o `web.xml` e capire quale mappatura vince.
- Riconoscere i problemi di concorrenza: una sola istanza, molte richieste in parallelo.

## Container, contesto e ciclo di vita

Il container è un processo Java (Tomcat 10.1 o 11.0) che carica un'applicazione Web impacchettata come WAR. Il WAR contiene `WEB-INF/web.xml`, le classi in `WEB-INF/classes` e le librerie in `WEB-INF/lib`. Il container crea un `ServletContext` per ogni applicazione: è il registro condiviso di parametri di inizializzazione, attributi e risorse.

Per ogni classe servlet il container segue un contratto preciso. Se lo stesso WAR è installato su più nodi, ogni JVM ha la sua istanza: la servlet è singola per processo, non per cluster. Il container non carica la classe finché non arriva la prima richiesta, a meno che la servlet non sia marcata con `loadOnStartup` (annotazione) o `<load-on-startup>` (`web.xml`).

| Fase | Metodo | Frequenza | Nota |
| --- | --- | --- | --- |
| inizializzazione | `init(ServletConfig)` | una volta | `ServletConfig` espone i parametri `init-param` |
| servizio | `service(...)` | una volta per richiesta | smista su `doGet`, `doPost`, ecc. |
| distruzione | `destroy()` | alla fine del contesto | chiude pool e risorse aperte in `init` |
| mappatura | `getServletInfo()` / `getServletPath()` | a richiesta | descrittore e percorso ridondanti ma utili nei log |

`HttpServlet` implementa `service` per te: decodifica il metodo HTTP e chiama `doGet`, `doPost`, `doPut`, `doDelete` o `doHead`. Se non sovrascrivi `doPost`, la classe base risponde `405 Method Not Allowed` con header `Allow` corretto, invece di fallire in silenzio.

## Scrivere una servlet moderna

Dal rilascio di Jakarta EE 9 il pacchetto è `jakarta.servlet`, non più `javax.servlet`. Su Tomcat 10.1 e 11 una servlet scritta con `javax.*` non viene nemmeno caricata, perché le classi non esistono più nel classpath del container. La dipendenza giusta è `jakarta.servlet:jakarta.servlet-api:6.1.0` con scope `provided`, perché l'implementazione la fornisce il container.

```java
package it.esempio.web;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebServlet(name = "saluto", urlPatterns = "/saluta/*", loadOnStartup = 1)
public class SalutoServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String nome = req.getParameter("nome");
        resp.setContentType("text/plain; charset=utf-8");
        resp.getWriter().printf("Ciao, %s%n", nome == null || nome.isBlank() ? "anonimo" : nome);
    }
}
```

Tre dettagli di questo frammento meritano attenzione. `urlPatterns = "/saluta/*"` è un pattern a prefisso: `/saluta/mario` arriva alla stessa servlet e `req.getPathInfo()` vale `/mario`. `req.getParameter` legge la query string per `GET` e, per `POST` con `Content-Type` `application/x-www-form-urlencoded` o `multipart/form-data`, anche il body; il body viene consumato e poi `getInputStream` restituisce uno stream vuoto. `getWriter` restituisce un writer con la codifica dichiarata, mentre `getOutputStream` serve per i byte grezzi: chiamare entrambi sulla stessa risposta lancia `IllegalStateException`.

| Metodo | Uso corretto | Errore tipico |
| --- | --- | --- |
| `getParameter` | query string e form | chiamarlo su un body JSON: restituisce `null` |
| `getHeader` / `getHeaders` | metadati, `Accept`, `Authorization` | usarlo per i parametri del form |
| `getCookies` | cookie inviati dal client | non controllare `null` |
| `getSession` / `getSession(false)` | stato per utente | creare sessioni per richieste anonime |
| `setStatus` / `sendError` | codice e messaggio | fare `getWriter` dopo `sendError` |

## Mappatura, configurazione e concorrenza

La mappatura dice quale servlet serve un URL. L'ordine di precedenza è fisso: match esatto (`/report/pdf`), path prefix più lungo (`/report/*`), estensione (`*.json`), poi la servlet di default che serve i file statici. Due servlet con lo stesso pattern nello stesso contesto fanno fallire il deploy con `IllegalArgumentException`, non con un errore silenzioso.

La configurazione può stare in annotazione o in `web.xml`. Non sono alternative fragili: l'annotazione descrive il caso semplice, `web.xml` serve quando devi cambiare comportamento senza ricompilare, cioè quando lo stesso WAR va in ambienti diversi.

```xml
<servlet>
  <servlet-name>saluto</servlet-name>
  <servlet-class>it.esempio.web.SalutoServlet</servlet-class>
  <init-param>
    <param-name>lingua</param-name>
    <param-value>it</param-value>
  </init-param>
</servlet>
<servlet-mapping>
  <servlet-name>saluto</servlet-name>
  <url-pattern>/saluta/*</url-pattern>
</servlet-mapping>
```

Una sola istanza riceve tutte le richieste, quindi i campi della servlet sono condivisi. Il container gestisce la concorrenza con un thread per richiesta (o con thread virtuali su Java 21) e non mette lock al posto tuo: un campo `List` modificato da più richieste produce corruzione o `ConcurrentModificationException`. La regola pratica è che i campi della servlet sono di sola lettura dopo `init`, e lo stato mutabile per utente va nell'`HttpSession` o nel database.

## Errori comuni

- **Mixare `javax.servlet` e `jakarta.servlet`**: sul container la classe non viene trovata; controlla che ogni import e ogni dipendenza sia su `jakarta.*`.
- **Ignorare `setCharacterEncoding`**: senza `req.setCharacterEncoding("UTF-8")` prima di leggere i parametri di un `POST`, i caratteri accentati arrivano corrotti.
- **Tenere stato in un campo della servlet**: la servlet è condivisa; contatori e liste in campi diventano una race condition.
- **Chiamare `getWriter` e `getOutputStream`**: è un errore di contratto della servlet, non una svista innocua.
- **Fare I/O pesante dentro `doGet` senza timeout**: il thread del container resta occupato e il pool si esaurisce sotto carico.
- **Dimenticare `resp.setContentType` prima di scrivere**: il browser interpreta la risposta come `text/html` o come byte opachi e il rendering cambia senza messaggi di errore.

## In sintesi

La servlet è un adattatore tra HTTP e un oggetto Java: il container gestisce socket, parsing e thread, la servlet gestisce la logica della richiesta. Il ciclo di vita ha tre momenti e una sola istanza per processo, quindi la servlet deve essere senza stato o con stato immutabile. `HttpServlet` smista i metodi HTTP e risponde ai metodi non implementati con `405`. Parametri, header e body sono canali diversi: `getParameter` non legge un JSON. La mappatura ha una precedenza fissa e `web.xml` resta utile per rendere il WAR configurabile.

## Fonti

- [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/)
- [Jakarta Servlet 6.1 Specification (PDF)](https://jakarta.ee/specifications/servlet/6.1/jakarta-servlet-spec-6.1.pdf)
- [Apache Tomcat 10.1 Servlet API: HttpServlet](https://tomcat.apache.org/tomcat-10.1-doc/servletapi/jakarta/servlet/http/HttpServlet.html)
- [Apache Tomcat 11.0 Documentation](https://tomcat.apache.org/tomcat-11.0-doc/)
