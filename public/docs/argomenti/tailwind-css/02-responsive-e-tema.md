Un'interfaccia progettata per una sola larghezza si rompe al primo telefono, e un tema chiaro fisso ignora chi lavora di notte. Tailwind affronta entrambi i problemi con due sistemi dichiarativi: i punti di rottura, che si esprimono direttamente nel markup, e un tema centrale fatto di variabili, dal quale derivano colori, spaziature, tipografia e tutti i token del progetto. In questa lezione impari a scrivere interfacce responsive senza fogli paralleli e a costruire un tema scuro coerente con le preferenze del sistema e dell'utente.

## Obiettivi

- Usare le varianti di breakpoint con approccio mobile first.
- Modificare il tema con variabili CSS e token nominati.
- Implementare un tema scuro coerente con le preferenze del sistema.
- Definire punti di rottura e varianti personalizzate in modo sostenibile.
- Evitare pattern che generano classi mancanti o temi incoerenti.

## Punti di rottura e mobile first

Le varianti come `md:` e `lg:` applicano un'utilità a partire da una larghezza minima, quindi il CSS di base descrive il layout mobile e i prefissi aggiungono comportamenti per schermi più larghi. Questo è lo stesso principio del mobile first visto nel CSS, ma espresso direttamente sull'elemento: nessun blocco di media query da mantenere.

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <div class="rounded-lg border border-slate-200 p-4">Prima</div>
  <div class="rounded-lg border border-slate-200 p-4">Seconda</div>
  <div class="rounded-lg border border-slate-200 p-4">Terza</div>
</div>
```

| Prefisso | Significato | Uso tipico |
|:---------|:------------|:-----------|
| (nessuno) | mobile | base, una colonna |
| `sm:` | schermi piccoli | tablet stretti |
| `md:` | schermi medi | due colonne |
| `lg:` | schermi larghi | tre colonne, layout con barra laterale |
| `xl:` / `2xl:` | molto larghi | contenuti ampi, limiti di larghezza |

La logica mobile first implica che le classi senza prefisso valgano ovunque: scrivi prima gli stili comuni, poi aggiungi solo ciò che cambia. Le larghezze dei breakpoint fanno parte del tema e si adattano al progetto, ma non vanno moltiplicate per comodità: se ti accorgi che `md` non corrisponde a nessun cambiamento reale, forse il punto giusto è un altro. Per le mutazioni basate sulla dimensione del componente usa invece una `@container` scritta nel foglio di stile: le varianti di viewport non conoscono lo spazio reale del singolo componente.

## Il tema come fonte unica

Il tema contiene la scala di colori, spaziature, tipografia, raggi e ombre. Le utilità non sono valori magici: sono nomi che puntano alle variabili del tema, e cambiarle in un solo punto aggiorna tutta l'interfaccia. In Tailwind CSS 4 il tema vive in CSS, dichiarato con un blocco dedicato e importato tramite il file principale.

```css
@import "tailwindcss";

@theme {
  --color-brando-50: #ecfdf5;
  --color-brando-700: #047857;
  --color-brando-900: #064e3b;
  --font-sans: "Inter", system-ui, sans-serif;
  --spacing: 0.25rem;
  --radius-utile: 0.625rem;
}
```

Dopo questa dichiarazione sono disponibili utilità come `bg-brando-700`, `text-brando-900` e `rounded-utile`. Le variabili di tema generano le classi corrispondenti, quindi un token non dichiarato non produce alcuna utilità: è il primo indizio quando una classe "non funziona". Per gli stili che non devono generare utilità, come il colore di uno sfondo decorativo, si usano normali proprietà personalizzate con la sintassi delle variabili CSS.

## Tema scuro e preferenze

Ci sono due esigenze diverse: rispettare la preferenza del sistema espressa con `prefers-color-scheme`, e permettere all'utente di forzare un tema. La variante `dark:` di Tailwind si attiva in base alla strategia configurata: con la strategia basata sulla classe, dipende dalla classe o dall'attributo che imposti sull'elemento radice, così il pulsante di commutazione controlla il tema in modo esplicito.

```html
<html class="bg-white text-slate-900">
  ...
  <div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
    <h2 class="text-slate-900 dark:text-slate-100">Promemoria</h2>
    <p class="text-slate-600 dark:text-slate-300">Il corso riprende lunedì.</p>
  </div>
</html>
```

Indipendentemente dalla strategia, i colori devono essere scelti per coppie: uno sfondo chiaro con testo chiaro è un errore che il tema scuro rende visibile subito. Non scrivere `text-white` come default pensando che il tema scuro se ne occupi: il tema non cambia i valori, cambia le varianti. Il contrasto va verificato in entrambi i temi, compresi i bordi e gli stati disattivati.

```css
@media (prefers-contrast: more) {
  .bordo-sottile { border-color: currentColor; }
}
```

Le preferenze dell'utente sono un completamento utile, ma non sostituiscono il contrasto ben scelto: la media query deve essere un rinforzo per chi la richiede, non la sola garanzia.

## Varianti e personalizzazioni

Oltre ai breakpoint, le varianti si possono definire per esigenze specifiche. Una variante personalizzata in CSS copre casi come "quando il genitore ha un certo attributo". Le varianti di stato e quelle di tema si combinano: `dark:hover:bg-slate-800` significa hover solo in tema scuro. Mantieni basso il numero di varianti su misura: ogni variante aggiuntiva è un concetto in più da conoscere, e il markup diventa un linguaggio parallelo difficile da apprendere.

## Errori comuni

- **Scrivere stili desktop e sovrascriverli al ribasso**: Tailwind non ha prefissi "max", quindi l'approccio corretto è sempre mobile first.
- **Usare un token inesistente** (per esempio `bg-brando-500` su una scala dichiarata solo a passi 50-700): la classe viene ignorata e l'elemento resta senza colore.
- **Dimenticare `dark:` sui bordi e sui testi secondari**: il tema scuro risulta quasi leggibile ma non coerente.
- **Affidarsi solo a `prefers-color-scheme`** senza commutatore: chi vuole fissare il tema non può farlo.

## In sintesi

Le varianti di breakpoint esprimono il responsive direttamente nel markup, con logica mobile first. Il tema centrale è la fonte unica di colori, spaziature e tipografia. Il tema scuro si costruisce con varianti coerenti e un controllo esplicito dell'utente. Meno token e meno varianti inventate significano un'interfaccia più semplice da mantenere.

## Fonti

- [Tailwind CSS – Responsive design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS – Theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind CSS – Dark mode](https://tailwindcss.com/docs/dark-mode)
