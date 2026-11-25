In questo laboratorio costruisci **dashboard-ordini**, una piccola applicazione Angular 22 generata con la CLI: tabella con ricerca, dettaglio con parametro di rotta, un servizio HTTP e un `HttpInterceptor` per l'errore 401. Ogni passo è verificabile con un comando o un test, e il risultato finale è una build di produzione con lazy loading e budget rispettati. Il codice di partenza è quello generato da `ng new`, non un progetto preparato.

## Obiettivi

- Generare l'applicazione e i pezzi (componente, servizio, guardia) con `ng generate`.
- Scrivere un servizio `OrdiniService` tipizzato con `HttpClient` e `Observable`.
- Collegare rotte con `loadComponent` e leggere il parametro `id` come input.
- Gestire errori e caricamento con signal e `AsyncPipe`.
- Verificare comportamento con test di componente e `HttpTestingController`, poi controllare la build.

## Passo 1: progetto e struttura

```bash
npm create @angular@latest dashboard-ordini -- --style=scss --ssr=false --routing=true
cd dashboard-ordini
ng generate component ordini/lista --skip-tests=false
ng generate component ordini/dettaglio
ng generate service ordini/ordini
ng generate environments
```

| Comando | File prodotti | Nota |
| --- | --- | --- |
| `ng g component` | `.ts`, `.html`, `.scss`, `.spec.ts` | standalone, importato dove serve |
| `ng g service` | `ordini.service.ts` e spec | da registrare con `providedIn: 'root'` |
| `ng g environments` | `src/environments/{,development.}` | `apiUrl` per ambiente |
| `ng serve` | — | ricarica incrementale su 4200 |
| `ng build` | `dist/` | verifica anche i budget |

Nel browser non caricare l'applicazione con un server diverso da `ng serve`: la CORS policy dell'API in sviluppo vale su `http://localhost:4200`. L'`apiUrl` va in `src/environments/environment.ts` (`http://localhost:8080/api`) e la variante `development` viene usata da `ng serve`.

## Passo 2: servizio HTTP e modello

Il servizio è il solo punto che conosce l'API. Restituire `Observable` mantiene la cancellazione (`switchMap`, `takeUntilDestroyed`) disponibile a chi lo usa; convertire in signal è compito del componente.

```ts
// src/app/ordini/ordini.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Ordine { id: number; cliente: string; totale: number; creato: string }

@Injectable({ providedIn: 'root' })
export class OrdiniService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ordini`;

  cerca(q: string) {
    const params = new HttpParams().set('q', q).set('_limit', 50);
    return this.http.get<Ordine[]>(this.base, { params });
  }

  perId(id: number) {
    return this.http.get<Ordine>(`${this.base}/${id}`);
  }
}
```

```ts
// src/app/app.config.ts (estratto)
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()), // :id arriva come input
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ],
};
```

`withFetch()` usa l'API `fetch` del browser invece di `XMLHttpRequest`: abilita lo streaming delle risposte e semplifica l'interoperabilità con i service worker. Se il backend che consumi non supporta CORS con `fetch` e `credentials`, il problema va corretto sul server, non cambiando provider.

## Passo 3: rotte e dettaglio con parametro

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'ordini', pathMatch: 'full' },
  {
    path: 'ordini',
    loadComponent: () => import('./ordini/lista/lista').then((m) => m.Lista),
  },
  {
    path: 'ordini/:id',
    loadComponent: () => import('./ordini/dettaglio/dettaglio').then((m) => m.Dettaglio),
  },
  { path: '**', loadComponent: () => import('./non-trovato/non-trovato').then((m) => m.NonTrovato) },
];
```

Con `provideRouter(routes, withComponentInputBinding())` il parametro `:id` arriva al componente come input `id`, senza `ActivatedRoute`:

```ts
import { Component, inject, input, resource, ChangeDetectionStrategy } from '@angular/core';
import { OrdiniService } from '../ordini.service';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-dettaglio',
  imports: [DatePipe, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ordine.hasValue()) {
      <h2>Ordine #{{ ordine.value().id }}</h2>
      <p>{{ ordine.value().cliente }} — {{ ordine.value().totale | currency: 'EUR' }}</p>
      <p>Creato il {{ ordine.value().creato | date: 'dd/MM/yyyy HH:mm' }}</p>
    } @else if (ordine.error()) {
      <p class="errore">Ordine non trovato.</p>
    } @else {
      <p>Caricamento…</p>
    }
  `,
})
export class Dettaglio {
  private readonly servizio = inject(OrdiniService);
  readonly id = input.required<number, string>({ transform: Number });
  readonly ordine = resource({
    request: () => ({ id: this.id() }),
    loader: ({ request }) => this.servizio.perId(request.id),
  });
}
```

`resource` gestisce i tre stati della richiesta (`value`, `error`, `isLoading`) senza variabili manuali; nella serie 22 è marchiato sperimentale, quindi per un componente destinato a durare è più prudente usare `toSignal` con `catchError` e un signal `loading` esplicito.

## Passo 4: test e controllo finale

```ts
it('chiede gli ordini con il filtro digitato', () => {
  const controller = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(Lista);
  fixture.detectChanges();

  const req = controller.expectOne((r) => r.url.endsWith('/ordini') && r.params.get('q') === 'mario');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: 1, cliente: 'Mario Rossi', totale: 120, creato: '2026-11-01T09:00:00Z' }]);
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('Mario Rossi');
  controller.verify();
});
```

| Verifica | Comando | Atteso |
| --- | --- | --- |
| test | `ng test --watch=false` | tutti verdi, `controller.verify()` senza richieste pendenti |
| build | `ng build` | `dist/dashboard-ordini/browser` e budget rispettati |
| dimensione | `ng build --stats-json` | chunk lazy per lista e dettaglio |
| rotta | aprire `/ordini/1` e ricaricare | il dettaglio si carica da URL diretto |

Per la ricarica di `/ordini/1` servono un `ng serve` in sviluppo e un `try_files`/fallback su `index.html` in produzione, perché il server di hosting non conosce le rotte client. Su un host statico senza fallback la ricarica restituisce 404 mentre la navigazione interna funziona: è il sintomo tipico di una configurazione di deploy mancante.

## Errori comuni

- **Mettere `apiUrl` assoluto solo in `environment.ts` senza la variante di sviluppo**: l'ambiente di produzione finisce per puntare all'API locale.
- **Restituire `Promise` dal servizio**: si perde la cancellazione di `switchMap` e le risposte arrivano fuori ordine.
- **Leggere `id` come stringa dal parametro**: `resource` fallisce con un URL `/ordini/abc`; usa `transform: Number` o valida.
- **Testare un componente che fa HTTP senza `provideHttpClientTesting()`**: la richiesta parte su rete e il test diventa dipendente dalla rete stessa.
- **Ignorare i budget di build**: la pipeline si rompe solo al deploy; lancia `ng build` in CI a ogni pull request.

## In sintesi

Il laboratorio collega i pezzi di un'applicazione Angular reale: generazione con la CLI, servizio HTTP tipizzato, rotte lazy con parametri legati a input, tre stati della richiesta gestiti con signal e una verifica che passa da test di componente e build. Il passo successivo è l'autenticazione: un interceptor che aggiunge il token, una guardia che protegge `/ordini`, e un test che simula un 401.

## Fonti

- [Angular - Components](https://angular.dev/guide/components)
- [Angular - Routing: lazy loading](https://angular.dev/guide/routing/lazy-loading)
- [Angular - Testing](https://angular.dev/guide/testing)
- [Angular - `ng build`](https://angular.dev/cli/build)
