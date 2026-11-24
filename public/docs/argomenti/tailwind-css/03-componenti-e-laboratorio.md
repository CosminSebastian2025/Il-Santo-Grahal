Un'interfaccia con utilità sparse funziona, ma quando gli stessi pulsanti compaiono in venti punti il markup diventa un elenco di classi da confrontare a vista. Il passo successivo è dare un nome ai pattern ricorrenti: componenti con una piccola API di varianti, classi riutilizzabili per i casi semplici e un laboratorio in cui costruisci pulsanti, campi e avvisi accessibili e coerenti.

## Obiettivi

- Scegliere tra componente, classe di utilità ripetuta e pattern condiviso.
- Costruire un pulsante con varianti esplicite e stati completi.
- Composizionare struttura e comportamento senza duplicazioni.
- Progettare campi e avvisi con nomi accessibili e contrasto adeguato.
- Realizzare un laboratorio di componenti verificato su stati e temi.

## Livelli di riuso

Il modello da tenere in mente ha tre livelli. Le utilità restano la base: piccole e locali. Le classi di progetto raggruppano combinazioni stabili in un nome unico. I componenti espongono una piccola API esplicita e servono quando un elemento cambia aspetto per varianti e compare in molti punti.

| Livello | Quando usarlo | Rischio |
|:--------|:--------------|:--------|
| utilità | caso singolo, una tantum | ripetizione |
| classe di progetto | combinazione stabile, senza varianti | nomi che nascondono il comportamento |
| componente | varianti, stati, comportamenti complessi | API troppo ampia |

La regola pratica è estrarre quando la ripetizione è già visibile, non quando la prevedi. Aggiungi la seconda variante quando compare il secondo utilizzo reale.

## Un pulsante con varianti esplicite

Il pulsante è il componente che più rivela la qualità del sistema. Deve coprire almeno quattro stati: normale, hover, focus da tastiera e disattivato. Le varianti visive si esprimono come valori espliciti e complete, mai come frammenti di stringa da comporre.

```tsx
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

const varianti = {
  primario: "bg-emerald-700 text-white hover:bg-emerald-800",
  secondario: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  pericolo: "bg-red-700 text-white hover:bg-red-800",
} as const;

type Variante = keyof typeof varianti;

export function Bottone(props: { variante?: Variante; children: React.ReactNode }) {
  const { variante = "primario", children } = props;
  return <button type="button" className={`${base} ${varianti[variante]}`}>{children}</button>;
}
```

Ogni valore in `varianti` è una classe completa: il generatore la trova e la emette. Il contorno è su `focus-visible`, quindi appare solo a chi usa la tastiera. Anche le dimensioni si gestiscono con una mappa separata. L'alternativa, un muletto di booleani, moltiplica le combinazioni e rende il componente difficile da testare.

## Campi, etichette e avvisi

Un campo con utilità deve mantenere le garanzie accessibili viste nel modello di form: etichetta associata, messaggio d'errore collegato e stato visibile non affidato al solo colore. Le utilità non cambiano il significato del markup, quindi la struttura resta compito dell'HTML.

```tsx
export function Campo(props: { id: string; etichetta: string; errore?: string }) {
  const { id, etichetta, errore } = props;
  const descrizione = errore ? `${id}-errore` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">{etichetta}</label>
      <input
        id={id}
        aria-invalid={errore ? true : undefined}
        aria-describedby={descrizione}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm
                   focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
      />
      {errore ? (
        <p id={descrizione} className="text-sm font-medium text-red-700">{errore}</p>
      ) : null}
    </div>
  );
}
```

Per l'avviso la variante cambia solo colori e icona; testo e `role="alert"` restano nel comportamento. Il contrasto va comunque verificato su ogni variante, perché un messaggio rosso su bianco e uno bianco su rosso scuro non sono equivalenti in leggibilità.

## Laboratorio: un sistema di componenti

Il laboratorio richiede quattro passi. Primo, definisci i token nel tema, così che colori e raggi dei componenti provengano da un'unica fonte. Secondo, scrivi il pulsante con le varianti e prova tutti gli stati con la tastiera. Terzo, componi campo e avviso e verifica che l'errore sia annunciato. Quarto, assembla una scheda che usi i tre componenti e ripeti la verifica in tema chiaro e scuro.

```html
<div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
  <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Iscrizione al corso</h2>
  <form class="mt-4 grid gap-4">
    <div class="grid gap-1.5">
      <label for="mail" class="text-sm font-medium text-slate-800 dark:text-slate-200">Email</label>
      <input id="mail" type="email" aria-describedby="mail-errore"
             class="rounded-md border border-slate-300 px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100" />
      <p id="mail-errore" class="text-sm font-medium text-red-700 dark:text-red-400">
        Inserisci un indirizzo valido.
      </p>
    </div>
    <div role="alert" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
      Restano due posti disponibili.
    </div>
    <button type="submit"
            class="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
      Iscriviti
    </button>
  </form>
</div>
```

La checklist del laboratorio è breve ma severa: ogni variante ha tutti e quattro gli stati; la tastiera raggiunge campi e pulsante; l'errore resta leggibile in entrambi i temi; nessuna classe è composta da frammenti variabili; il markup nel punto di utilizzo è corto, perché la complessità vive nel componente.

## Esercizi

1. Aggiungi una variante `fantasma` al pulsante, senza colore di sfondo.
2. Aggiungi la dimensione grande al pulsante con una mappa separata.
3. Sposta i colori dei componenti su token del tema e usali come prefissi.
4. Aggiungi al campo lo stato `disabled` leggibile in entrambi i temi.
5. Estrai una classe condivisa per la scheda e usala in tre punti.
6. Verifica il contrasto dell'avviso nel tema scuro e correggilo.

<details><summary>Soluzione</summary>

**1. Variante fantasma**

```tsx
const varianti = {
  primario: "bg-emerald-700 text-white hover:bg-emerald-800",
  secondario: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  pericolo: "bg-red-700 text-white hover:bg-red-800",
  fantasma: "bg-transparent text-emerald-800 hover:bg-emerald-50",
} as const;
```

**2. Dimensione grande**

```tsx
const dimensioni = {
  media: "px-4 py-2 text-sm",
  grande: "px-6 py-3 text-base",
} as const;

const className = `${base} ${varianti[variante]} ${dimensioni[dimensione]}`;
```

Mappa separata e valori completi dentro il componente: il markup chiamante resta `variante="primario" dimensione="grande"`.

**3. Token del tema**

```css
@theme {
  --color-azione: #047857;
  --color-azione-scura: #065f46;
}
```

```html
<button class="bg-azione text-white hover:bg-azione-scura">Conferma</button>
```

Il colore vive in un punto solo e le utilità generano classi dai token.

**4. Stato disattivato**

```html
<input id="mail" disabled
       class="rounded-md border border-slate-300 px-3 py-2 text-sm
              disabled:bg-slate-100 disabled:text-slate-500
              dark:disabled:bg-slate-800 dark:disabled:text-slate-400" />
```

Il testo disattivato mantiene un contrasto leggibile e cambia insieme al tema.

**5. Classe condivisa per la scheda**

```css
@utility scheda-base {
  border-radius: 1rem;
  border-width: 1px;
  padding: 1.5rem;
  background-color: white;
}
```

```html
<article class="scheda-base">…</article>
<div class="scheda-base">…</div>
<section class="scheda-base">…</section>
```

La combinazione stabile ha un nome unico; le variazioni specifiche restano utilità sul singolo elemento.

**6. Contrasto in tema scuro**

`bg-amber-900/30` con `text-amber-100` mantiene il testo chiaro su uno sfondo scuro trasparente e supera i 4.5:1. La versione sbagliata è `dark:text-amber-900` su fondo scuro: il testo quasi scompare e va corretto anche nei bordi.

</details>

## Errori comuni

- **Moltiplicare le opzioni booleane** (`grande`, `pieno`, `arrotondato`) invece di mappe di varianti: le combinazioni crescono a dismisura e il componente diventa difficile da testare.
- **Ricreare in una classe di progetto ciò che le utilità già fanno**: due sorgenti di verità per lo stesso stile vanno in conflitto alla prima modifica.
- **Testare solo lo stato normale**: hover, focus e disattivato sono quelli che rivelano i difetti di contrasto.
- **Duplicare il markup del componente** copiando le classi invece di riusarlo: la prima correzione di accessibilità applicata a una sola copia.

## In sintesi

Le utilità sono il fondamento, i componenti l'organizzazione dei pattern ricorrenti. Un buon componente ha varianti esplicite, classi complete e stati previsti. I token del tema tengono insieme colori e spaziature. La verifica su tastiera, contrasto e tema scuro chiude il ciclo.

## Fonti

- [Tailwind CSS – Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes)
- [Tailwind CSS – Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)
- [Tailwind CSS – Theme variables](https://tailwindcss.com/docs/theme)
- [W3C – Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
