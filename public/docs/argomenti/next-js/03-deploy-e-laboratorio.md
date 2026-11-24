Una volta che l'applicazione funziona in locale, il passo successivo è produrre un artefatto affidabile e portarlo dove gli utenti possono raggiungerlo. Next.js distingue due famiglie di output: il server Node che serve SSR e rendering dinamico, e l'export statico che genera solo file HTML, CSS e JS. Questa lezione di laboratorio spiega build, variabili d'ambiente, export statico e un flusso di deploy verificabile.

## Obiettivi

- Produrre una build di produzione e leggere gli esiti del prerender.
- Distinguere deploy su server Node ed export statico, con i rispettivi limiti.
- Gestire variabili d'ambiente pubbliche e private senza esporre segreti.
- Configurare `output: "export"` e correggere le pagine incompatibili.
- Verificare l'artefatto in locale e capire cosa rompe il deploy.

## Build di produzione e prerequisiti

`next build` compila l'app, esegue il prerender delle pagine statiche e mostra una tabella con il tipo di ogni rotta: statica, dinamica o con durata di rivalidazione. `next start` serve la build su Node; non va confuso con `next dev`, che è ottimizzato per il ciclo di sviluppo e non rappresenta le prestazioni reali.

```bash
npm ci
npm run build
npm start
```

Prima della build conviene lanciare il linter e il type-check: in Next.js il build esegue anche i controlli dei tipi e un errore lì blocca l'artefatto. Attenzione a `ignoreBuildErrors`, che è una scorciatoia che nasconde i problemi finché non arrivano a runtime.

| Output | Genera | Richiede server | Funziona con |
| --- | --- | --- | --- |
| Default (Node) | `.next/`, server | sì | SSR, Server Actions, ISR, route handler dinamici |
| `export` | cartella `out/` statica | no | pagine pre-renderizzate, asset, JS client |
| `standalone` | server minimale | sì | deploy in container leggeri |

## Variabili d'ambiente

Solo le variabili con prefisso `NEXT_PUBLIC_` vengono incorporate nel bundle client al momento della build: cambiarle richiede una nuova build. Le altre restano solo sul server e vanno lette nei Server Components, nelle Server Actions o nelle route handler.

```bash
# .env.local (non committare)
NEXT_PUBLIC_SITO_URL=https://esempio.org
DATABASE_URL=postgres://utente:password@host/db
```

Una variabile `NEXT_PUBLIC_` è visibile nel JavaScript finale: mai usarla per chiavi o token. Nell'export statico non esiste server, quindi tutto ciò che serve al client deve essere pubblico e i segreti vanno su un backend esterno.

## Export statico

Con `output: "export"` in `next.config.ts` la build produce file statici, pubblicabili su qualsiasi host di file o CDN. Diventano obbligatorie alcune scelte: niente Server Actions, niente `cookies()`/`headers()` nelle pagine, e rotte dinamiche con parametri dichiarati.

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
```

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return [{ slug: "primo" }, { slug: "secondo" }];
}
```

`trailingSlash` evita problemi con URL senza estensione su alcuni host. Se una pagina usa API dinamiche la build fallisce: meglio scoprirlo prima del deploy.

## Laboratorio: pubblicare un sito statico

Crea un'app con una home, una pagina `about` e un blog con `generateStaticParams`, poi imposta `output: "export"` e `trailingSlash: true` ed esegui `npm run build`. Dopo la build controlla le cartelle `out/about/` e `out/blog/primo/` e servi l'output in locale:

```bash
npx serve out
# oppure
python -m http.server 8080 --directory out
```

Se il sito finisce sotto un sottopercorso imposta `basePath` e `assetPrefix`, altrimenti CSS e JS non vengono trovati. Collega la build a CI: `npm ci`, `npm run lint`, `npm run build` e pubblicazione di `out/` solo a job verde. La sequenza vale anche per il deploy Node, dove si avvia `.next/` con `next start` o in modalità standalone.

## Errori comuni

- **Testare con `next dev` e fare deploy della stessa modalità**: in produzione serve sempre la build.
- **Mettere segreti in `NEXT_PUBLIC_`**: finiscono nel bundle pubblico, leggibili da chiunque.
- **Export statico con Server Actions o `cookies()`**: la build fallisce, o peggio il comportamento cambia in produzione.
- **Dimenticare `generateStaticParams`**: le rotte dinamiche non esistono nell'output statico.
- **Pubblicare `out/` con link assoluti a `/`**: sotto un sottopercorso serve `basePath`.

## Esercizi

1. Riproduci la build di un'app con una pagina statica e una dinamica che usa `cookies()`; spiega la differenza nella tabella delle rotte.
2. Aggiungi `NEXT_PUBLIC_NOME_APP` e `API_SECRET`, poi cerca nel bundle quale compare.
3. Trasforma la pagina dinamica in statica con `generateStaticParams` e configura l'export.
4. Aggiungi `basePath: "/docs"` e verifica asset e link.
5. Scripta un check che fallisca se `out/index.html` non esiste o pesa meno di una soglia minima.
6. Scrivici in un workflow CI i tre passi lint, build e publish di `out/`.

<details><summary>Soluzione</summary>

1. La pagina statica risulta prerenderizzata e uguale per tutti; quella con `cookies()` risulta dinamica e richiede il server a ogni richiesta.

2. Nel bundle compare solo `NEXT_PUBLIC_NOME_APP`: `API_SECRET` resta lato server. Se la trovi nel client, è stata letta in un Client Component o stampata in una pagina statica.

3. `generateStaticParams` elenca gli slug noti e la pagina non usa API di richiesta: dopo la build trovi una cartella per slug.

4. `basePath` prefissa i `<Link href="/about">` in `/docs/about`; per gli asset in `public/` evita URL assoluti.

5. `test -f out/index.html && [ "$(wc -c < out/index.html)" -gt 1000 ] || exit 1`.

6. In CI: `npm ci`, `npm run lint && npm run build`, poi upload di `out/` solo se i passi precedenti sono verdi.
</details>

## In sintesi

`next build` produce l'artefatto reale e mostra quali rotte sono statiche o dinamiche. Il deploy Node serve SSR e mutazioni; l'export statico solo pagine prerenderizzate, senza Server Actions né API di richiesta. Le variabili `NEXT_PUBLIC_` finiscono nel bundle pubblico. Un deploy affidabile è una sequenza CI: lint, build, verifica dell'artefatto, pubblicazione.

## Fonti

- [Next.js Docs - Deploying](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js Docs - Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- [Next.js Docs - App Router](https://nextjs.org/docs/app)
