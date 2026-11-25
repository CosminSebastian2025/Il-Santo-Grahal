JSP (Jakarta Server Pages, fino al 2019 JavaServer Pages) è una tecnologia per generare risposte HTTP dinamiche lato server: il file `.jsp` contiene testo e tag, e il motore JSP lo trasforma in una servlet Java che il container compila e tiene in cache. Non è più il centro di un framework, ma resta utile per capire come funzionano le applicazioni Java enterprise, perché molte applicazioni in esercizio hanno ancora questa struttura `WEB-INF` in produzione.

## Obiettivi

- Sapere chi trasforma un `.jsp` in Java, quando lo fa e dove finisce il codice generato.
- Riconoscere i costrutti JSP (scriptlet, espressioni, direttive, EL) e cosa producono nell'HTML.
- Distinguere gli scope `page`, `request`, `session` e `application` e capire cosa sopravvive tra due richieste.
- Leggere la struttura di un WAR e il ruolo di `web.xml` in un'applicazione Servlet 6.

## Il motore JSP e il ciclo di vita di una pagina

Una pagina JSP è servita da un container Servlet. Tomcat 10.1 e 11 implementano la Servlet API sul namespace `jakarta.*` (Tomcat 9 è rimasto sull'identificativo Maven `javax.servlet`) e usano **Jasper** come motore JSP, conforme alla specifica Jakarta Pages 3.1. La prima richiesta a `/welcome.jsp` avvia la traduzione: Jasper genera un sorgente Java che estende `HttpServlet`, lo compila con il compilatore Java presente nel JDK di Tomcat e istanzia la servlet. Le richieste successive riusano la classe, già caricata in memoria.

| Fase | Cosa succede | Dove si vede |
| --- | --- | --- |
| traduzione | il `.jsp` diventa `welcome_jsp.java` | `work/Catalina/localhost/<app>/org/apache/jsp/welcome_jsp.java` |
| compilazione | `javac` produce `welcome_jsp.class` | stessa cartella, sotto `org/apache/jsp` |
| istanziazione | Tomcat crea una sola istanza della servlet | thread diversi la condividono |
| servizio | il metodo `_jspService` scrive la risposta | si esegue a ogni richiesta |

Da qui due comportamenti che sorprendono chi arriva da PHP: la prima richiesta è più lenta, e svuotare `work/` serve a forzare la ritraduzione quando il file sul server non viene rilevato come modificato.

```jsp
<%@ page contentType="text/html; charset=UTF-8" %>
<!DOCTYPE html>
<html lang="it">
<head><title>Benvenuto</title></head>
<body>
  <h1>Ciao, <%= request.getParameter("nome") != null ?
      request.getParameter("nome") : "ospite" %></h1>
  <p>Richiesta servita alle <%= new java.util.Date() %></p>
</body>
</html>
```

## Costrutti: conoscerli per leggere il codice esistente

I costrutti originali del JSP 1.x sono tre blocchi. Il **scriptlet** `<% ... %>` contiene codice Java eseguito al momento della richiesta; l'**espressione** `<%= ... %>` equivale a `out.print(...)`; la **dichiarazione** `<%! ... %>` dichiara campi o metodi della servlet generata, quindi condivisi da tutti i thread. Si aggiungono le **direttive**, come `<%@ page import="java.time.*" %>`, `<%@ include file="header.jsp" %>` (inclusione statica, a tempo di traduzione) e l'azione `<jsp:include page="header.jsp"/>` (a tempo di richiesta).

L'Expression Language `${...}` è la parte che conviene usare: legge attributi di scope, invoca proprietà JavaBean e non esegue codice arbitrario. `${ordine.totale}` cerca l'attributo `ordine` in `pageScope`, `requestScope`, `sessionScope`, poi `applicationScope`, e chiama `getTotale()` sul risultato.

```jsp
<%@ page contentType="text/html; charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<table>
  <c:forEach items="${ordini}" var="o">
    <tr>
      <td><c:out value="${o.cliente}"/></td>
      <td><c:out value="${o.totale}"/></td>
    </tr>
  </c:forEach>
</table>
```

I tag JSTL sono il modo corretto di scrivere logica nei template: `<c:if>`, `<c:choose>`, `<c:forEach>`, `<fmt:formatNumber>`, `<fmt:formatDate>`. Il prefisso `jakarta.tags.core` appartiene a JSTL 3.0, che ha rinominato gli URI da `http://java.sun.com/jsp/jstl/core` a `jakarta.tags.core`: un WAR migrato a Jakarta EE senza aggiornare il `uri` della `taglib` fallisce con "The absolute uri cannot be resolved in either web.xml or the jar files deployed with this application".

## Scope e stato: chi possiede quel valore

Un JSP non ha un modello di stato proprio: legge e scrive attributi in quattro mappe offerte dal container. Scegliere lo scope sbagliato è la causa più frequente di dati che "spariscono" o che restano visibili tra utenti diversi.

| Scope | Durata | Visibilità | Uso tipico |
| --- | --- | --- | --- |
| `page` | una singola servlet | solo la pagina JSP | variabili temporanee del template |
| `request` | una richiesta, anche dopo forward | tutti i componenti coinvolti | dati passati da una servlet |
| `session` | fino a timeout o invalidazione | tutte le richieste dell'utente | carrello, utente autenticato |
| `application` | vita dell'applicazione | tutti gli utenti | configurazione, contatori globali |

```java
// nella servlet che prepara la vista
List<Ordine> ordini = ordineRepository.findByCliente(clienteId);
request.setAttribute("ordini", ordini);   // scope request
request.getRequestDispatcher("/WEB-INF/views/ordini.jsp").forward(request, response);
```

Un attributo in scope `application` è condiviso da tutte le sessioni e richiede quindi una struttura thread-safe, per esempio una `ConcurrentHashMap`. Aggiungere dati con `setAttribute` dalla pagina invece che dalla servlet sposta la logica nel template: è uno dei primi sintomi che una code review segnala in un'applicazione JSP.

## Un JSP dentro un WAR

Il modulo JSP è parte del pacchetto web, non delle librerie generiche. La convenzione `WEB-INF/` è stabile: classi in `WEB-INF/classes`, jar in `WEB-INF/lib`, descrittore `WEB-INF/web.xml` e view in `WEB-INF/views`.

```text
webapp/
├── index.jsp
├── WEB-INF/
│   ├── web.xml
│   ├── views/ordini.jsp      <!-- raggiunta solo con forward -->
│   └── tags/riga-ordine.tag  <!-- file .tag per i tag personalizzati -->
└── assets/app.css
```

```xml
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee
           https://jakarta.ee/xml/ns/jakartaee/web-app_6_0.xsd"
         version="6.0">
  <display-name>ordini-web</display-name>
  <welcome-file-list>
    <welcome-file>index.jsp</welcome-file>
  </welcome-file-list>
</web-app>
```

Con `mvn package` in un progetto Maven `war` ottieni il file `.war`; copiato in `webapps/` di Tomcat viene reso disponibile come contesto con lo stesso nome. Le mappature dei servlet si possono dichiarare con `@WebServlet`, ma `web.xml` resta il punto naturale in cui associare una pagina JSP a un controller che fa il forward.

## Errori comuni

- **Mettere logica di business in uno scriptlet**: la pagina diventa impossibile da testare fuori dal container e da riusare per un'altra vista.
- **Mettere oggetti non serializzabili in sessione**: con la replica di sessione tra nodi la richiesta successiva fallisce con `NotSerializableException`.
- **Scrivere input utente con `<%= ... %>`**: apre una XSS riflessa; `<c:out>` o `${fn:escapeXml(...)}` fanno l'escape necessario.
- **Aprire `WEB-INF/views/x.jsp` nel browser**: il container risponde 404 per progetto; un 200 segnala che la view è stata spostata fuori da `WEB-INF`.
- **Aspettarsi che `<%@ include %>` rispetti lo header della pagina inclusa**: l'inclusione statica è testuale e avviene prima della compilazione, quindi il risultato è un unico file.

## In sintesi

Un JSP è una servlet generata: Jasper traduce il file al primo accesso e ne tiene la classe in memoria. La scrittura moderna usa EL e JSTL, non scriptlet, e riceve i dati da una servlet in scope `request` via forward da `WEB-INF`. Gli scope decidono la durata dello stato, e il modello di sicurezza dipende dall'escape corretto in output. Conoscere questa macchina serve soprattutto per mantenere applicazioni esistenti e per cogliere cosa un framework moderno ha reso implicito.

## Fonti

- [Apache Tomcat 11 - Jasper HOW-TO](https://tomcat.apache.org/tomcat-11.0-doc/jasper-howto.html)
- [Jakarta Server Pages 3.1 - API di riferimento](https://tomcat.apache.org/tomcat-11.0-doc/jspapi/index.html)
- [Jakarta Pages 4.0 - specifica sul sito di Jakarta EE](https://jakarta.ee/specifications/pages/4.0/)
- [Tomcat 10.1 - documentazione della web application di esempio e dei file `web.xml`](https://tomcat.apache.org/tomcat-10.1-doc/appdev/web.xml.txt)
