La richiesta `/ordini?stato=aperto` non mostra il client di un cliente: il controller non trova la vista, il bean è `null` e la pagina stampa un `SerializationException` a metà risposta. L'Expression Language è un linguaggio di sola lettura, ma ha regole precise di risoluzione, gestione di `null` e escape che vanno conosciute prima di affidargli una pagina. In questa lezione separiamo questi tre livelli: risoluzione delle espressioni, sicurezza in uscita e componenti riusabili.

## Obiettivi

- Descrivere la grammatica dell'EL (operatori, funzioni, risoluzione degli identificatori) e l'ordine degli scope.
- Gestire `null` e collezioni vuote senza eccezioni a metà pagina.
- Imporre l'escape in uscita con `jsp-config` e con `<c:out>`.
- Costruire componenti riusabili con i tag file in `WEB-INF/tags`.

## Come l'EL risolve una variabile

L'Expression Language di Jakarta (versione 4.0 con Jakarta Pages 3.1) non ha effetti collaterali: leggere `${x}` non modifica lo stato. Un identificatore senza prefisso viene cercato nell'ordine `pageScope`, `requestScope`, `sessionScope`, `applicationScope`; un nome successivo è una proprietà del bean (`getNome()`) oppure una chiave di mappa. Questo spiega un errore classico di diagnosi: un attributo di sessione chiamato `ordini` oscura silenziosamente un attributo di richiesta con lo stesso nome.

| Espressione | Risultato | Quando usarla |
| --- | --- | --- |
| `${nome}` | primo `nome` trovato tra gli scope | attributo impostato dalla servlet |
| `${requestScope.nome}` | attributo solo della richiesta | evitare collisioni con la sessione |
| `${param.q}` | primo valore del parametro GET/POST | filtro di ricerca |
| `${fn:length(ordini)}` | lunghezza di lista, array o stringa | condizioni su collezioni |
| `${empty carrello}` | `true` per `null`, stringa o collezione vuota | guardia standard |

Le funzioni `fn:` arrivano dalla taglib `jakarta.tags.functions` (`contains`, `startsWith`, `join`, `replace`, `escapeXml`) e il loro prefisso va dichiarato con `<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>`; senza dichiarazione la pagina fallisce alla traduzione, non al runtime.

## Null, liste e sicurezza in output

I problemi con `null` sono di due tipi. Il primo è la dereferenziazione: `${utente.nome.length()}` solleva un errore quando `utente` è assente, mentre `${utente.nome}` restituisce semplicemente `null`. Il secondo è l'escape: `${utente.nome}` scritto nudo non viene escapato, `<c:out value="${utente.nome}"/>` sì.

```jsp
<c:choose>
  <c:when test="${empty utente}">
    <a href="/login">Accedi</a>
  </c:when>
  <c:when test="${utente.admin}">
    <a href="/admin">Pannello</a>
  </c:when>
  <c:otherwise>
    Ciao <c:out value="${utente.nome}"/>
  </c:otherwise>
</c:choose>

<c:forEach items="${ordini}" var="o" varStatus="s">
  <p class="${s.index % 2 == 1 ? 'dispari' : 'pari'}">${s.count}. <c:out value="${o.cliente}"/></p>
</c:forEach>
```

`varStatus` espone `index`, `count`, `first` e `last`: sono i valori che evitano contatori Java per le righe alternate o per l'ultima riga di un elenco. La classe `pari`/`dispari` cambia con il conteggio, non con l'indice, quindi funziona anche dopo un filtro applicato alla lista nella servlet. La scelta del separatore dipende dai dati, non dalla pagina: una lista vuota non produce righe e non richiede alcun controllo nel template, perché `c:forEach` non itera.

```xml
<jsp-config>
  <jsp-property-group>
    <url-pattern>*.jsp</url-pattern>
    <page-encoding>UTF-8</page-encoding>
    <scripting-invalid>true</scripting-invalid>
    <trim-directive-whitespaces>true</trim-directive-whitespaces>
    <include-prelude>/WEB-INF/jsp/header.tagfrag</include-prelude>
  </jsp-property-group>
</jsp-config>
```

`scripting-invalid` trasforma ogni scriptlet in un errore di traduzione: in un team misto è il modo più semplice per rendere obbligatorio l'uso di EL e JSTL. `include-prelude` aggiunge a ogni pagina un frammento con le `taglib` comuni: sei righe di direttive spariscono dal 90% dei file e una modifica all'escape diventa un intervento in un solo punto del progetto. Il frammento non deve contenere markup: con `trim-directive-whitespaces` il prelude lascia meno spazi bianchi nel sorgente, ma un tag aperto nel prelude non si chiude nella pagina e produce HTML valido solo per caso.

## Tag file, include e impaginazione

Un `include` ripete la stessa `request` e ricarica il frammento a ogni richiesta, quindi è adatto a un footer. Un **tag file** in `WEB-INF/tags` definisce invece un componente con attributi tipizzati, documentati nella direttiva `@attribute`, e un corpo raggiungibile con `jsp:doBody`.

```jsp
<%-- WEB-INF/tags/riga-ordine.tag --%>
<%@ tag pageEncoding="UTF-8" %>
<%@ attribute name="ordine" type="it.esempio.Ordine" required="true" %>
<%@ attribute name="evidenzia" type="java.lang.Boolean" required="false" %>
<%@ taglib prefix="fmt" uri="jakarta.tags.fmt" %>
<tr class="riga ${evidenzia ? 'riga--evidenziata' : ''}">
  <td><c:out value="${ordine.cliente}"/></td>
  <td><fmt:formatNumber value="${ordine.totale}" type="currency" currencySymbol="€"/></td>
  <td><fmt:formatDate value="${ordine.creato}" pattern="dd/MM/yyyy HH:mm"/></td>
</tr>
```

```jsp
<%@ taglib prefix="ui" tagdir="/WEB-INF/tags" %>
<table>
  <c:forEach items="${ordini}" var="o" varStatus="s">
    <ui:riga-ordine ordine="${o}" evidenzia="${s.index % 2 == 1}"/>
  </c:forEach>
</table>
```

Gli attributi `type` dei tag file fanno parte del contratto: un `String` passato dove è atteso `BigDecimal` produce un `ClassCastException` durante la richiesta, non alla compilazione, perché l'EL è dinamico. Le `taglib` usate dentro un tag file devono essere dichiarate nel tag file stesso: le direttive della pagina chiamante non si propagano.

Gli attributi dei tag file sono il posto giusto per documentare un contratto: se un attributo viene rinominato, il compilatore non se ne accorge e il problema si vede aprendo la pagina in produzione, quindi vale la pena affiancare un test HTTP che copra ogni tag del catalogo.

## Errori comuni

- **Scrivere `${utente.nome}` senza guardia**: se il bean può essere assente, ogni pagina deve gestire `null` con `empty` o `c:choose`.
- **Confondere `${param.x}` e `${x}`**: il primo legge un parametro HTTP, il secondo un attributo; usare il parametro al posto dell'attributo, senza escape, apre una XSS.
- **Dimenticare `taglib` in un tag file**: l'errore compare quando viene tradotta la pagina che lo usa, con un messaggio che punta al tag e non alla direttiva mancante.
- **Includere una pagina che chiama `response.setHeader`**: dopo il `flush` dello stream la modifica viene ignorata e la pagina perde il `contentType`.
- **Affidare l'escape a un custom tag scritto in fretta**: meglio contrastare con `<c:out>` e con `output encoding` verificato da un test di penetrazione mirato.
- **Scrivere markup dentro il prelude di `jsp-config`**: un tag aperto in una pagina diversa da quella che lo chiude produce HTML valido solo per caso, e i validatori non riescono a dirlo.

## In sintesi

L'EL è un linguaggio puro di lettura con risoluzione a cascata su quattro scope: saperlo descrivere significa sapere dove cercare un valore che "non arriva". Il comportamento con `null` impone la guardia `empty`, mentre l'escape in uscita resta il contratto più importante di tutta la tecnologia. Tag file e `jsp-config` permettono di scrivere pagine senza scriptlet, con componenti il cui contratto è scritto nella direttiva `@attribute` e non nascosto in un commento.

## Fonti

- [Apache Tomcat 11 - Jasper HOW-TO](https://tomcat.apache.org/tomcat-11.0-doc/jasper-howto.html)
- [Apache Tomcat 10.1 - web.xml e configurazione `jsp-config`](https://tomcat.apache.org/tomcat-10.1-doc/appdev/web.xml.txt)
- [Jakarta Server Pages 3.1 - API Reference](https://tomcat.apache.org/tomcat-11.0-doc/jspapi/index.html)
- [Jakarta Pages 4.0 - pagina della specifica](https://jakarta.ee/specifications/pages/4.0/)
