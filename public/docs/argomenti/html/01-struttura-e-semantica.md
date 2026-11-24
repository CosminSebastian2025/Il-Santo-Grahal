Un documento HTML è prima di tutto una struttura: un albero di elementi che descrive il significato del contenuto, non il suo aspetto. Quando usi l'elemento giusto al posto giusto, browser, motori di ricerca e tecnologie assistive capiscono la pagina senza bisogno di spiegazioni aggiuntive. In questa lezione impari a costruire uno scheletro affidabile, a scegliere gli elementi semantici e a riconoscere i casi in cui un `div` è ancora la scelta corretta.

## Obiettivi

- Scrivere la struttura minima di un documento HTML con `<!doctype html>`, `lang` e codifica.
- Usare `header`, `nav`, `main`, `section`, `article`, `aside` e `footer` in modo coerente.
- Costruire una gerarchia di titoli corretta e un indice dei contenuti sensato.
- Comprendere i landmark impliciti e il loro valore per la navigazione assistita.
- Distinguere l'HTML semantico dall'uso generico di `div` e `span`.

## La struttura minima del documento

Ogni pagina parte da un contratto preciso con il browser: la dichiarazione del doctype in modalità standard, un attributo `lang` che dice alla sintesi vocale come pronunciare il testo e un `charset` dichiarato presto per evitare caratteri corrotti.

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Guida al giardinaggio urbano</title>
  </head>
  <body>
    <header>
      <p>Orto di quartiere</p>
    </header>
    <main>
      <h1>Guida al giardinaggio urbano</h1>
      <p>Come coltivare ortaggi su un balcone esposto a sud.</p>
    </main>
    <footer>
      <p>Licenza Creative Commons</p>
    </footer>
  </body>
</html>
```

Il `title` è l'unico titolo che non appartiene al contenuto visibile e identifica la pagina nelle schede e nei risultati di ricerca. Il `main` deve essere unico per documento e contenere il contenuto che non si ripete tra le pagine.

## Elementi semantici e landmark

Gli elementi di sezionamento creano automaticamente delle **landmark region**: punti di riferimento che un lettore di schermo può elencare e raggiungere con una scorciatoia. Non servono attributi aggiuntivi: il browser e le tecnologie assistive ricavano il ruolo dall'elemento.

| Elemento | Ruolo implicito | Quando usarlo | Quando evitarlo |
|:---------|:----------------|:--------------|:----------------|
| `header` | banner (se di pagina) | intestazione, logo, titolo | come wrapper arbitrario di card |
| `nav` | navigation | gruppi di link di navigazione | per un singolo link isolato |
| `main` | main | contenuto principale, uno solo | per ogni sezione |
| `section` | region (con nome accessibile) | blocco tematico con titolo | senza titolo interno |
| `article` | article | contenuto autoconclusivo e distribuibile | per un semplice paragrafo |
| `aside` | complementary | contenuti correlati o marginali | per il contenuto primario |
| `footer` | contentinfo (se di pagina) | note, contatti, licenze | dentro ogni paragrafo |

Un `section` senza titolo diventa solo un contenitore generico: se non ha un `h2`, il ruolo `region` non viene comunque annunciato e la scelta perde valore. Preferisci sempre una struttura con pochi blocchi chiari invece di un livellamento di sezioni fini a se stesse.

```html
<body>
  <header>
    <nav aria-label="Navigazione principale">
      <ul>
        <li><a href="/colture/">Colture</a></li>
        <li><a href="/calendario/">Calendario</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <h1>Coltivare pomodori in vaso</h1>
    <article>
      <h2>Scelta del vaso</h2>
      <p>Serve una profondità di almeno 30 centimetri.</p>
    </article>
    <aside aria-label="Nota stagionale">
      <p>Aprile è il mese migliore per il trapianto.</p>
    </aside>
  </main>
</body>
```

L'`aria-label` sul `nav` distingue la navigazione principale da eventuali blocchi di link secondari; è utile solo quando ci sono più landmark dello stesso tipo.

## Gerarchia dei titoli e contenuto

I titoli `h1`-`h6` non sono strumenti di stile: sono la mappa del documento. Le regole che danno risultati solidi sono tre. Il primo titolo del contenuto è un `h1` unico. I livelli scendono uno alla volta senza salti, così un titolo di terzo livello vive sempre dentro un titolo di secondo. Il testo dell'elemento descrive la sezione, non è una parola sola come "Dettagli".

Per il testo in linea scegli l'elemento che riflette il significato: `strong` per la rilevanza, `em` per l'enfasi, `time` con attributo `datetime` per le date, `abbr` con `title` per le sigle, `code` e `pre` per il codice, `blockquote` e `cite` per le citazioni. Il grassetto puramente decorativo si ottiene con il CSS, non con `b`.

```html
<h2>Periodo di semina</h2>
<p>Semina tra <time datetime="2026-03-15">metà marzo</time> e
   <time datetime="2026-04-10">inizio aprile</time>.</p>
<abbr title="Indice Ultravioletti">IUV</abbr>
```

## Struttura sicura, aspetto separato

La semantica risponde a "che cosa è", il CSS a "come appare". Un titolo non diventa più grande perché è un `h1`: diventa tale perché il CSS glielo dice. Questa separazione permette di cambiare grafica senza rompere la struttura per chi usa un lettore di schermo o un parser automatico. Il `div` resta legittimo come contenitore puramente visivo, quando nessun elemento semantico descrive il suo ruolo e non crea confusione nella mappa dei titoli.

## Errori comuni

- **Usare un `div` con `role="banner"` quando `header` fa già lo stesso lavoro**: duplica la semantica e crea ambiguità.
- **Saltare i livelli di titolo** (`h1` seguito da `h4`) solo per ottenere testo più piccolo: la mappa del documento diventa incoerente.
- **Inserire più `main` nello stesso documento** o annidarne uno dentro un `article`: il ruolo perde significato.
- **Affidare la struttura a classi come `.titolo-grande` invece che agli elementi**: la semantica sparisce quando il CSS cambia.

## In sintesi

La struttura minima (`doctype`, `lang`, `charset`, `title`) è un contratto non negoziabile con il browser. Gli elementi semantici producono landmark gratuiti e affidabili. La gerarchia dei titoli è la mappa del documento e va costruita per livelli. Il `div` resta utile come contenitore visivo, ma non è una scelta semantica.

## Fonti

- [MDN – HTML: HyperText Markup Language](https://developer.mozilla.org/it/docs/Web/HTML)
- [HTML Living Standard – Sections](https://html.spec.whatwg.org/multipage/sections.html)
- [W3C WAI – Page Structure Tutorial](https://www.w3.org/WAI/tutorials/page-structure/)
