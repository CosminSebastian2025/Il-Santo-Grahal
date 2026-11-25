Angular è un framework TypeScript per costruire applicazioni web come albero di componenti, con un proprio compilatore di template, dependency injection e router integrati. La sua scommessa è strutturale: vincoli forti, tooling ufficiale e un modello di reattività basato su signal, che rende evidente quale stato sta cambiando. In questa lezione impari come è fatta un'applicazione Angular moderna, come il compilatore gestisce i template e come funziona il sistema di iniezione.

## Obiettivi

- Riconoscere la struttura generata da `ng new` e il ruolo di `angular.json`, `main.ts` e `app.config.ts`.
- Scrivere un componente standalone con input e output e usare il nuovo control flow nel template.
- Capire come il compilatore AOT trasforma un template in istruzioni di rendering.
- Usare la dependency injection con funzioni `inject()` e i token come contratto tra servizio e componente.
- Distinguere zone.js da `provideZonelessChangeDetection`, ancora opzionale nella serie 22.

## Anatomia di un progetto

Angular 22 (rilasciato il 18 novembre 2026, serie sotto supporto attivo) genera un progetto con una `AppComponent` standalone e un bootstrap basato su funzioni. Non c'è più un `AppModule` di default: un componente dichiara nel proprio decoratore tutto ciò che usa.

```bash
npm create @angular@latest dashboard -- --style=scss --ssr=false --routing=true
cd dashboard
ng serve --open        # build incrementale su http://localhost:4200
ng build               # output in dist/dashboard/browser
```

```ts
// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(console.error);

// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes)],
};
```

`ng serve` non ricompila l'intera applicazione: mantiene in memoria una build di sviluppo servita da Vite e aggiorna solo i moduli modificati. La build di produzione passa dal builder `application` dichiarato in `angular.json`, che gestisce asset, stili e budget di dimensione.

| File | Ruolo | Da non confondere con |
| --- | --- | --- |
| `angular.json` | builder, asset e budget di build | `package.json`, dipendenze npm |
| `app.config.ts` | provider globali dell'applicazione | configurazione dell'ambiente |
| `app.routes.ts` | tabella delle rotte del router | rotte dei server API |
| `tsconfig.base.json` | opzioni TypeScript e path alias | configurazione del compilatore Angular |
| `public/` | file statici copiati così come sono | cartella delle risorse compilate |

## Componenti, template e control flow

Un componente è una classe più un template, e in modalità standalone l'import esplicito sostituisce in parte la dichiarazione in un modulo: `imports: [CurrencyPipe]` rende pipe e componenti disponibili nel template.

```ts
import { Component, computed, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface Riga { id: string; nome: string; prezzo: number; quantita: number }

@Component({
  selector: 'app-carrello',
  imports: [CurrencyPipe],
  template: `
    @for (riga of righe(); track riga.id) {
      <li>{{ riga.nome }} — {{ riga.prezzo | currency: 'EUR' }}
        <button (click)="rimuovi(riga.id)">Rimuovi</button></li>
    } @empty {
      <li>Carrello vuoto</li>
    }
    <p>Totale: {{ totale() | currency: 'EUR' }}</p>
  `,
})
export class CarrelloComponent {
  readonly righe = input.required<Riga[]>();
  readonly rimossa = output<string>();
  readonly totale = computed(() =>
    this.righe().reduce((s, r) => s + r.prezzo * r.quantita, 0),
  );

  rimuovi(id: string) { this.rimossa.emit(id); }
}
```

`input.required` rende l'input obbligatorio e lo espone come signal, quindi si legge `this.righe()`; `output` emette verso il padre, e la pagina che gestisce lo stato ascolta `(rimossa)="...">`. Il control flow `@if`, `@for`, `@switch` è nella sintassi del template dalla versione 17 e sostituisce `*ngIf` e `*ngFor`: il `track` in `@for` è obbligatorio e determina come Angular riusa i nodi DOM quando la lista cambia. Un `track` sull'indice annulla quasi tutto il beneficio.

## Compilazione e reattività

Il template non è una stringa interpretata a runtime: la compilazione AOT lo traduce in istruzioni TypeScript, quindi un nome di binding sbagliato o un tipo incompatibile è un errore di build e non un errore in console dell'utente. `ng build` mostra poi l'esito dei budget di `angular.json`, che per il template di partenza limitano il bundle iniziale a 500 kB non compressi e i CSS a 4 kB.

| Meccanismo | Quando si aggiorna la vista | Costo |
| --- | --- | --- |
| zone.js | dopo ogni evento che attraversa la zona | controlla tutti i componenti |
| signal (con zoneless) | quando un signal letto nel template cambia | notifica mirata |
| `OnPush` | su input o evento locale, o su scrittura di signal | riduce i sottotree controllati |

I signal sono il modello reattivo principale: `signal()` è una sorgente scrivibile, `computed()` una derivazione memoizzata, `effect()` un effetto collaterale. Nella serie 22 il rilevamento delle modifiche senza zone.js è supportato ma resta opt-in con `provideZonelessChangeDetection()`; le applicazioni che non lo attivano continuano a dipendere da zone.js per segnalare ad Angular che qualcosa è cambiato.

## Dependency injection

La DI di Angular collega un token a una factory. Con le funzioni `provide*` la registrazione è esplicita, e con `inject()` la dipendenza si legge come campo di classe: il tipo restituito è quello del token, quindi il compilatore segnala un contratto sbagliato prima del runtime.

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);

  cerca(q: string) {
    return this.http.get<{ items: Prodotto[] }>('/api/prodotti', { params: { q } });
  }
}
```

`HttpClient` va registrato con `provideHttpClient()` in `app.config.ts`; senza quel provider l'iniezione fallisce con `NullInjectorError`, l'errore più comune nella prima ora di Angular. `providedIn: 'root'` crea un singleton per applicazione, mentre un provider dichiarato in `providers` di un componente crea un'istanza per componente e per i suoi figli. Per opzioni di configurazione o implementazioni intercambiabili conviene un `InjectionToken`, che diventa un nome stabile e sostituibile nei test.

## Errori comuni

- **Dichiarare un componente e non importarlo nel template**: in modalità standalone il componente sconosciuto è un errore di compilazione "not a known element".
- **Mutare un array con `push` senza notificare**: con un signal serve `update()`, altrimenti la vista non si aggiorna.
- **Usare l'indice come `track` in `@for`**: ogni cambio della lista ricrea i nodi e perde lo stato degli input.
- **Sottoscrivere un Observable senza `takeUntilDestroyed`**: la sottoscrizione resta viva dopo la distruzione del componente; la `async` pipe lo fa per te.
- **Registrare `HttpClient` nei provider di un componente**: duplica l'istanza, perde gli interceptor globali e non riusa la connessione.

## In sintesi

Angular 22 è un framework a componenti standalone con bootstrap per funzioni, template compilati AOT e una DI basata su token e `inject()`. Il control flow nativo e i signal cambiano il modo di scrivere le viste: invece di controllare tutto a ogni evento, si dichiara da cosa dipende il template. La lezione successiva scende nei dettagli di signal, RxJS, HTTP e test.

## Fonti

- [Angular - Components](https://angular.dev/guide/components)
- [Angular - Signals](https://angular.dev/guide/signals)
- [Angular - Dependency injection](https://angular.dev/guide/di)
- [Angular - versioni e cronologia dei rilasci](https://angular.dev/reference/releases)
