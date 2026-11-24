Tailwind CSS parte da un'idea radicale: invece di inventare classi con nomi arbitrari e scrivere CSS separato, componi l'interfaccia con piccole classi di utilità che fanno una cosa sola. Ogni classe corrisponde a una proprietà o a un piccolo insieme di proprietà, e il risultato si legge direttamente nel markup. In questa lezione capisci perché questo approccio riduce l'indecisione nella scelta dei nomi, riduce la duplicazione e rende le modifiche più locali, senza perdere la possibilità di definire componenti quando servono davvero.

## Obiettivi

- Comprendere il modello utility first e confrontarlo con il CSS tradizionale.
- Riconoscere la sintassi delle classi di utilità e la scala di spaziature.
- Usare le varianti di stato e i modificatori più comuni.
- Organizzare il markup leggibile con le classi raggruppate per funzione.
- Saper identificare quando estrarre un componente o una classe personalizzata.

## Dal CSS tradizionale alle utilità

Con il CSS classico si ragiona per componenti e si scrivono fogli che accumulano regole: ogni nuovo design richiede nomi nuovi, ogni modifica può toccare altri punti della pagina. Con le utilità la carta vincente è che nessuna striscia di CSS risulta "orfana": se rimuovi un elemento, spariscono anche le sue classi. Il prezzo è il markup più verboso, che però diventa uno stile coerente e ispezionabile.

| Aspetto | CSS tradizionale | Utility first |
|:--------|:-----------------|:--------------|
| Dove sta lo stile | foglio separato | attributo `class` |
| Nomi da inventare | molti | nessuno |
| Riuso | classi condivise | componenti e classi ripetute |
| Modifica locale | rischio di effetti collaterali | confinata all'elemento |
| Verbosità | bassa nel markup | alta, ma prevedibile |

Il valore più grande non è la brevità: è il **vincolo**. Le utilità disponibili derivano dalla scala di configurazione, quindi margini, colori e dimensioni dei caratteri sono già coerenti tra loro e non bisogna inventarli ogni volta.

## Sintassi e scala

Le classi di Tailwind seguono una forma compatta: prefisso della proprietà e valore, per esempio `mt-4` (margin-top), `px-6` (padding orizzontale), `text-lg` (dimensione del testo), `bg-slate-900` (colore di sfondo). La scala non usa pixel arbitrari, ma passi che crescono in modo logico; il passo `4` corrisponde a un'unità di riferimento coerente con la scala scelta nel progetto.

```html
<article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 class="text-xl font-semibold tracking-tight text-slate-900">Colture di stagione</h2>
  <p class="mt-2 text-sm leading-relaxed text-slate-600">
    Ogni mese tre varietà adatte al tuo balcone.
  </p>
  <a class="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
     href="/calendario/">Apri il calendario</a>
</article>
```

I valori fuori scala si esprimono con la sintassi delle parentesi quadre, come `w-[37rem]` o `text-[0.9rem]`: utile per casi isolati, da non abusare perché rompe l'armonia visiva e crea eccezioni invisibili. Le varianti si compongono con i due punti: `hover:` per il passaggio del mouse, `focus-visible:` per il focus da tastiera, `disabled:` per lo stato disattivato, `md:` per punti di rottura, `dark:` per il tema scuro, `group-hover:` quando lo stato dipende dal contenitore.

```html
<button
  class="rounded-lg bg-slate-900 px-4 py-2 text-white
         hover:bg-slate-700
         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900
         disabled:cursor-not-allowed disabled:opacity-50">
  Conferma
</button>
```

La proprietà CSS che le classi generano è lo strumento di verifica: se non funziona un `focus-visible:`, spesso manca la regola CSS di base o il browser non considera l'elemento interattivo.

## Leggibilità del markup

Un elenco di venti classi sulla stessa riga è difficile da revisionare. La regola pratica è raggruppare le classi per funzione, una riga per gruppo: layout, spaziature, tipografia, colori, stati. Mantieni lo stesso ordine in tutta la base di codice, così ogni classe nuova viene nel posto abituato. Evita la concatenazione dinamica di stringhe per costruire le classi: il generatore le deve vedere scritte per intero, altrimenti non le produce.

```html
<!-- Bene: gruppi coerenti, classi intere e visibili -->
<div class="flex items-center gap-3 mt-6 px-4 py-3 text-sm text-slate-700 bg-slate-50 rounded-md">
  <span class="font-medium">Prezzo</span>
</div>

<!-- Da evitare: nome costruito a runtime -->
<span class="text-{{ size }}">Prezzo</span>
```

Nei template di un framework l'HTML commenta più righe, quindi il raggruppamento visivo si ottiene andando a capo e riallineando il `class` su righe consecutive; per lunghezze estreme meglio un componente, che riporta il markup a una sola riga nel punto di utilizzo. Per gli stati condizionali usa una mappa esplicita tra condizione e classe completa, non la concatenazione di frammenti.

## Quando creare un componente o una classe

Le utilità sono il livello di partenza, non il tetto. Tre segnali indicano che è il momento di estrarre: lo stesso gruppo di classi compare in molti punti, una regola complessa non si esprime bene con utilità, l'elemento cambia per varianti (grande, piccolo, pericoloso). In questi casi crei un componente con un'API piccola oppure, in CSS, una classe con `@apply` o una variabile del tema.

Il confine tra utilità e componente non è rigido: si parte con le utilità anche ripetute e si estrae solo quando la ripetizione diventa rumorosa o incoerente. Il rischio opposto, estrarre troppo presto, produce componenti con troppe opzioni e un'API che non conosci ancora.

## Errori comuni

- **Costruire i nomi delle classi a runtime**: il generatore non riconosce le stringhe e le utilità spariscono in produzione.
- **Mescolare utilità e CSS globale senza criterio**: le regole globali vincono sulla specificità e rendono imprevedibile il risultato.
- **Usare valori arbitrari ovunque**: l'interfaccia perde coerenza e l'arrivo di un nuovo elemento non segue nessuna scala.
- **Dimenticare gli stati di focus da tastiera**: `hover:` è diffuso, `focus-visible:` è spesso dimenticato, ma è quello indispensabile.

## In sintesi

Utility first significa comporre lo stile con classi piccole, coerenti e locali. La scala del progetto sostituisce le decisioni arbitrarie. Le varianti con i due punti coprono stati e breakpoint in modo leggibile. Le utilità si estraggono in componenti soltanto quando la ripetizione lo giustifica.

## Fonti

- [Tailwind CSS – Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS – Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes)
- [Tailwind CSS – Funzioni e direttive](https://tailwindcss.com/docs/functions-and-directives)
