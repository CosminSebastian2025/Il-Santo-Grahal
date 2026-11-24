Un sito responsive si adatta alla larghezza, ma soprattutto al contesto: la dimensione della finestra, la dimensione del componente, la preferenza dell'utente sul movimento e sul tema. Il metodo che regge nel tempo è semplice: layout fluidi per principio, media query solo quando serve un cambio strutturale, container query quando un componente deve essere autonomo. Questa lezione spiega le tecniche e le applica in un laboratorio guidato, dall'immagine all'interfaccia completa.

## Obiettivi

- Scrivere media query con intervalli sensati e mobile first.
- Usare unità e funzioni fluide (`clamp()`, `min()`, `max()`) al posto di controlli puntuali.
- Distinguere le media query per il viewport dalle container query per il componente.
- Gestire immagini e testo leggibili su ogni larghezza, incluso lo zoom.
- Applicare le tecniche in un laboratorio pratico.

## Media query e approccio mobile first

Una media query applica un blocco di regole quando una condizione sul dispositivo è vera. Nell'approccio mobile first lo stile di base descrive la versione più semplice, adatta a schermi stretti, e le query aggiungono progressivamente complessità con `min-width`.

```css
.scheda { display: block; padding: 1rem; }

@media (min-width: 48em) {
  .scheda { display: grid; grid-template-columns: 1fr 1fr; }
}

@media (min-width: 64em) {
  .scheda { grid-template-columns: 2fr 1fr; }
}
```

Usa `em` invece di `px` negli intervalli: in `em` la query tiene conto dello zoom del testo e delle dimensioni predefinite dell'utente. Evita query sovrapposte e numeri arbitrari: scegli i due o tre punti in cui il layout oggettivamente non regge più. Le query su `prefers-reduced-motion` e `prefers-contrast` completano il quadro perché riguardano l'utente, non il dispositivo.

## Layout fluidi e testo

Prima di aggiungere una query, chiediti se il layout può essere fluido. Griglie con `auto-fit` e `minmax()`, contenitori con larghezza massima e `padding` in percentuale, elementi con `width: 100%` sono già responsive. Le funzioni `clamp()`, `min()` e `max()` permettono di esprimere un intervallo invece di un valore fisso.

```css
.contenitore {
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

h1 { font-size: clamp(1.75rem, 1rem + 2vw, 3rem); }

img { max-width: 100%; height: auto; }
```

Per le immagini `max-width: 100%` e `height: auto` evitano lo sbordamento; per le immagini principali aggiungi `srcset` e `sizes` affinché il browser scelga la risorsa adatta. Per il testo, il vincolo più importante è la larghezza massima in `ch` (65-75 caratteri) e `line-height` sufficiente. Lo zoom del 200% deve restare utilizzabile: non bloccare con `maximum-scale=1` nel viewport e non fissare altezze rigide sui contenitori di testo.

## Container query

Le media query guardano il viewport, che non è sempre il contesto rilevante: una scheda in una barra laterale è stretta anche su un monitor grande. Le container query spostano il riferimento al contenitore e permettono componenti davvero portabili.

```css
.cornice {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .scheda { display: grid; grid-template-columns: 8rem 1fr; gap: 1rem; }
}
```

"container-type: inline-size" rende il contenitore un riferimento per le query sulla larghezza, e l'unità `cqi` misura una percentuale della sua larghezza. Formula mentale: media query per la pagina, container query per il componente.

## Laboratorio: un card responsive

Costruiamo una scheda che passa da verticale a orizzontale secondo lo spazio che ha davvero, non secondo lo schermo.

```html
<article class="scheda">
  <img src="/img/orto.webp" alt="File di lattughe su un balcone" width="640" height="360" />
  <div class="testo">
    <h2>Lattughe sul balcone</h2>
    <p>Semina da marzo a maggio in un vaso profondo almeno 25 cm.</p>
    <a class="azione" href="/colture/lattuga/">Leggi la scheda</a>
  </div>
</article>
```

```css
.scheda {
  container-type: inline-size;
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.scheda img { width: 100%; height: auto; border-radius: 0.5rem; }

@container (min-width: 420px) {
  .scheda { grid-template-columns: 40% 1fr; align-items: center; }
}

@media (prefers-reduced-motion: no-preference) {
  .scheda .azione { transition: transform 150ms ease-out; }
  .scheda:hover .azione { transform: translateX(2px); }
}
```

Per verificare: ridimensiona la finestra, simula 320px e 1440px dagli strumenti di sviluppo, controlla che non compaia scroll orizzontale al 200% di zoom e che l'immagine conservi le proporzioni. Le dimensioni dichiarate sull'immagine riservano spazio ed evitano salti di layout durante il caricamento.

## Esercizi

1. Converti tre media query basate su `px` in `em`.
2. Rendi fluida la dimensione di un titolo con `clamp()`.
3. Trasforma una griglia con larghezze percentuali in `auto-fit` + `minmax()`.
4. Applica una container query a una scheda dentro una barra laterale.
5. Disattiva un'animazione quando l'utente preferisce movimento ridotto.
6. Verifica e correggi lo scroll orizzontale a 320px.

<details><summary>Soluzione</summary>

**1. Query in `em`**

```css
@media (min-width: 30em) { .barra { display: flex; } }   /* 480px a 16px */
@media (min-width: 48em) { .griglia { grid-template-columns: 1fr 1fr; } }
```

**2. Titolo fluido**

```css
h1 { font-size: clamp(1.5rem, 1rem + 1.8vw, 2.75rem); }
```

La dimensione resta tra 24px e 44px e cresce in proporzione al viewport nel mezzo.

**3. Griglia adattiva**

```css
.elenco {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
```

Il numero di colonne dipende dalla larghezza disponibile e nessun elemento scende sotto 220px.

**4. Container query**

```css
.sidebar { container-type: inline-size; }

@container (min-width: 360px) {
  .mini-scheda { display: flex; gap: 0.75rem; align-items: center; }
}
```

La scheda usa la stessa regola sia nella barra sia nel corpo principale, ma reagisce alla larghezza che realmente possiede.

**5. Movimento ridotto**

```css
@media (prefers-reduced-motion: no-preference) {
  .notifica { animation: entra 300ms ease-out; }
}
```

Applicando l'animazione solo quando l'utente non ha chiesto meno movimento, chi ha sensibilità alle animazioni riceve l'interfaccia statica.

**6. Overflow a 320px**

```css
html { overflow-wrap: break-word; }
img, video, table { max-width: 100%; height: auto; }
pre { overflow-x: auto; }
```

Le cause più comuni sono immagini senza `max-width`, tabelle con colonne rigide e parole lunghe senza spazi: i tre rimedi sopra coprono la maggior parte dei casi.

</details>

## Errori comuni

- **Progettare desktop first e "rattoppare" i mobile**: le regole di base restano pesanti e le eccezioni si accumulano.
- **Usare larghezze fisse in `px` per i contenitori di testo**: lo zoom del 200% spezza la leggibilità.
- **Bloccare lo zoom nel viewport con `maximum-scale=1`**: impedisce un'azione essenziale di accessibilità.
- **Usare le media query dove serve una container query**: il componente si adatta allo schermo invece che allo spazio che gli è stato assegnato.

## In sintesi

Mobile first e intervalli in `em` rendono le media query prevedibili. Layout fluidi con `min`, `max` e `clamp` riducono il numero di regole. Le container query rendono i componenti portabili. Bisogna sempre verificare a 320px, al 200% di zoom e con le preferenze dell'utente rispettate.

## Fonti

- [web.dev – Responsive web design basics](https://web.dev/articles/responsive-web-design-basics)
- [web.dev – Learn CSS](https://web.dev/learn/css)
- [CSS Conditional Rules Module Level 5](https://drafts.csswg.org/css-conditional-5/)
- [MDN – CSS: Cascading Style Sheets](https://developer.mozilla.org/it/docs/Web/CSS)
