Una servlet che scrive HTML con `resp.getWriter()` è servita per dieci anni, poi arriva la seconda pagina, la terza, e il codice Java diventa un concatenatore di stringhe. Le otto ore di differenza aggiunte con i fusi orari, la sessione scaduta dopo il login, il cookie che il browser non risalva: sono tutti problemi che il ciclo richiesta-risposta deve risolvere una volta sola, non in ogni `doGet`. Questa lezione affronta il ciclo completo: filtri, sessione, inoltro, errori e sicurezza di base.

## Obiettivi

- Usare i filtri per autenticazione, logging e codifica senza duplicare codice nelle servlet.
- Gestire `HttpSession`, cookie e invalidazione con i tempi di vita corretti.
- Distinguere forward e redirect e usare `RequestDispatcher` senza rompere la risposta.
- Centralizzare gli errori con `HttpServletResponse.sendError` e `<error-page>`.

## Filtri: logica trasversale

Un filtro è una classe che il container chiama prima e dopo la servlet. Il metodo `doFilter` riceve `request`, `response` e un `FilterChain`: se chiama `chain.doFilter`, la richiesta prosegue; se non lo fa, la richiesta termina lì. Questa è la differenza sostanziale rispetto a un interceptor di framework: il filtro può rispondere direttamente, per esempio con `401`.

```java
package it.esempio.web;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.*;
import java.io.IOException;

@WebFilter(urlPatterns = "/area/*")
public class AuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest r = (HttpServletRequest) req;
        HttpServletResponse s = (HttpServletResponse) resp;
        HttpSession sessione = r.getSession(false);
        if (sessione == null || sessione.getAttribute("utente") == null) {
            s.sendRedirect(r.getContextPath() + "/login?next=" +
                java.net.URLEncoder.encode(r.getRequestURI(), java.nio.charset.StandardCharsets.UTF_8));
            return;
        }
        chain.doFilter(req, resp);
    }
}
```

Due dettagli cambiano il comportamento in produzione. Il primo è `getSession(false)`: crea una sessione solo se esiste già, quindi un utente anonimo non riempie la memoria del container con sessioni vuote. Il secondo è l'ordine dei filtri: quando la catena è dichiarata con annotazioni, l'ordine non è garantito, quindi un filtro di autenticazione che deve girare prima del filtro di logging va ordinato in `web.xml` con `<filter-mapping>` nell'ordine voluto.

| Filtro tipico | Dove gira | Cosa evita |
| --- | --- | --- |
| codifica UTF-8 | prima di qualsiasi lettura di parametri | caratteri corrotti |
| autenticazione | davanti a `/area/*` | controlli copiati in ogni servlet |
| logging con durata | tutto il contesto | misure spostate nel codice di business |
| compressione (`GzipFilter`) | risposte testuali | bandwidth sprecata su HTML e JSON |
| CORS | API consumate da un altro dominio | preflight `OPTIONS` rifiutato |

## Sessione, cookie e stato dell'utente

`HttpSession` è una mappa lato server identificata da un cookie `JSESSIONID` per default. La sessione non contiene l'utente: contiene il suo identificativo o l'oggetto che lo rappresenta. Tre decisioni determinano il comportamento: il timeout, il flag `HttpOnly` e il flag `Secure`.

```java
HttpSession sessione = req.getSession(true);
sessione.setMaxInactiveInterval(30 * 60);   // 30 minuti
sessione.setAttribute("utente", utenteId);

Cookie sessioneCookie = new Cookie("JSESSIONID", sessione.getId());
sessioneCookie.setHttpOnly(true);
sessioneCookie.setSecure(true);
sessioneCookie.setPath(req.getContextPath());
sessioneCookie.setAttribute("SameSite", "Lax");
resp.addCookie(sessioneCookie);
```

Se non dichiari `<session-timeout>`, Tomcat applica il valore predefinito di `context.xml` (30 minuti): dichiararlo nel WAR evita che un ambiente con configurazione diversa cambi la durata. Dopo `invalidate()` la sessione non è più valida e un secondo accesso a `getSession(false)` restituisce `null`: è così che si gestisce il logout.

Il cambio di identità richiede anche la rotazione dell'ID. Se un attaccante riesce a far accettare al browser un `JSESSIONID` noto prima del login, può riusarlo dopo: la difesa è chiamare `req.changeSessionId()` al momento dell'autenticazione, che rigenera l'identificatore conservando gli attributi.

## Forward, redirect e gestione degli errori

`forward` avviene sul server: la stessa richiesta passa a un'altra risorsa (una JSP, un'altra servlet) e l'URL del browser non cambia. `redirect` avviene sul client: il server risponde `302` con la nuova posizione e il browser effettua una seconda richiesta. Le conseguenze pratiche sono diverse: dopo un `POST` servito con `forward` un refresh del browser ripete il `POST` e duplica l'ordine; con `redirect` il refresh ripete solo la `GET`. Il pattern si chiama POST/Redirect/GET.

```java
// POST validato: si redirige, non si inoltra
if (ordineValido) {
    resp.sendRedirect(req.getContextPath() + "/ordine/conferma?id=" + id);
    return;
}
// errore di validazione: si inoltra alla pagina del form con il messaggio
req.setAttribute("errore", "Quantità non valida");
req.getRequestDispatcher("/WEB-INF/viste/form.jsp").forward(req, resp);
```

`RequestDispatcher` si ottiene con `getRequestDispatcher` sul contesto (percorso assoluto dall'applicazione) oppure sul request (percorso relativo). Dopo `forward` non si può più scrivere sulla risposta: il container lancia `IllegalStateException`. Le viste stanno sotto `WEB-INF` proprio perché non devono essere raggiungibili con un URL diretto: un JSP fuori da `WEB-INF` può essere richiesto senza il codice che prepara i dati.

Gli errori si centralizzano in `web.xml`: `<error-page>` associa un codice o una classe di eccezione a un percorso, e il container serve quella pagina al posto dello stack trace.

```xml
<error-page>
  <error-code>404</error-code>
  <location>/WEB-INF/errori/404.jsp</location>
</error-page>
<error-page>
  <exception-type>java.lang.IllegalArgumentException</exception-type>
  <location>/WEB-INF/errori/400.jsp</location>
</error-page>
<error-page>
  <error-code>500</error-code>
  <location>/WEB-INF/errori/500.jsp</location>
</error-page>
```

Dal Servlet 6.1 il dispatch verso la pagina di errore espone anche la query string della richiesta originale, utile per ricostruire nei log quale URL ha fallito.

## Errori comuni

- **Usare `getSession()` senza argomento nei filtri**: crea sessioni per crawler e richieste API anonime, e il container consuma memoria.
- **Non cambiare l'ID dopo il login**: la session fixation diventa banale da sfruttare.
- **Mettere l'`Authorization` in un cookie senza `Secure` e `HttpOnly`**: il token finisce nei log del proxy o a una `XSS`.
- **Serve una vista protetta con URL diretto**: le pagine sotto `WEB-INF` non devono essere raggiungibili, e quelle fuori lo sono.
- **Chiamare `chain.doFilter` due volte**: la catena viene eseguita di nuovo e la risposta viene riscritta dopo il commit.
- **Scrivere su stderr l'eccezione e restituire `200`**: i client credono al successo; `sendError(500)` o una pagina di errore esplicita sono l'unico segnale corretto.

## In sintesi

Il ciclo di una richiesta ha più di una servlet: ha filtri davanti e in mezzo, una sessione che accompagna le richieste e pagine di errore che sostituiscono lo stack trace. I filtri spostano logica trasversale in un unico punto e l'ordine va dichiarato, non sperato. La sessione è un identificatore con un timeout e due flag di sicurezza, e l'ID si cambia al login. Forward e redirect hanno semantica diversa, e il pattern giusto per un `POST` è redirect. Gli errori si centralizzano in `<error-page>`, così il comportamento cambia modificando un descriptor.

## Fonti

- [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/)
- [Apache Tomcat 10.1 Documentation](https://tomcat.apache.org/tomcat-10.1-doc/)
- [Apache Tomcat 10.1 Context Configuration](https://tomcat.apache.org/tomcat-10.1-doc/config/context.html)
- [Jakarta EE Tutorial](https://jakarta.ee/learn/docs/jakartaee-tutorial/current/)
