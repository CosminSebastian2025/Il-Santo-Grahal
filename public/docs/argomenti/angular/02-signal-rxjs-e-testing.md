Il software web è pieno di catene di osservatori: `combineLatest` con sette argomenti, `switchMap` annidati, un `BehaviorSubject` che dimentica di emettere il valore iniziale. Angular ha introdotto i signal per ridurre questo carico, ma non li ha resi l'unica strada: RxJS resta la libreria per gli eventi nel tempo, HTTP compreso. In questa lezione impari a usare i signal onestamente, a convertire i due mondi e a verificare il risultato con `TestBed`.

## Obiettivi

- Distinguere stato letto e stato derivato, e usare `computed` senza ricalcolare a ogni accesso.
- Comprendere `effect`, `linkedSignal` e `resource` (ancora sperimentale) e quando non usarli.
- Collezionare le sottoscrizioni con `takeUntilDestroyed` e passare a `AsyncPipe`.
- Scrivere test di componente con `TestBed` e `HttpTestingController`, sostituendo i servizi con stub.

## Signal: stato e derivazioni

Un `signal` è una sorgente con una scrittura controllata: `set` sostituisce, `update` applica una funzione al valore precedente, `mutate` permette una modifica in place di un oggetto o array dichiarato come mutabile. Il template si ridisegna solo quando un signal letto cambia, purché il componente usi il rilevamento senza zone o `OnPush`: un signal aggiornato da un callback esterno alla zona non basta a svegliare una vista gestita da zone.js.

```ts
import { signal, computed, linkedSignal } from '@angular/core';

export class FiltriStore {
  readonly prodotti = signal<Prodotto[]>([]);
  readonly query = signal('');
  readonly pagina = signal(1);
  readonly risultati = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.prodotti().filter((p) => p.nome.toLowerCase().includes(q));
  });
  // ricalcola la pagina quando la ricerca cambia: derivato e scrivibile
  readonly paginaCorrente = linkedSignal(() => {
    this.query();
    return 1;
  });
  readonly pagineTotali = computed(() => Math.ceil(this.risultati().length / 10));
}
```

`computed` è memoizzato: finché i signal letti non cambiano, il template riusa il valore. Una funzione pesante che dipende anche dal tempo, da `Date.now()` o da un DOM esterno va invece in un `effect`, con la consapevolezza che l'effetto gira dopo il rendering e non deve aggiornare signal usati per la vista senza motivo.

| API | Ruolo | Caso concreto |
| --- | --- | --- |
| `signal` | stato scrivibile | filtro, carrello |
| `computed` | derivato puro e memoizzato | totale, righe filtrate |
| `linkedSignal` | derivato con scrittura locale | pagina da azzerare quando cambia il filtro |
| `effect` | effetto collaterale | sincronizza con `localStorage` o log |
| `resource` | caricamento asincrono (stato incluso) | fetch con `loading` e `error` |

## RxJS e il confine con i signal

Le API HTTP di Angular continuano a restituire `Observable`, e i flussi di eventi (tastiera, websocket, `valueChanges` dei form) restano il dominio degli operatori. Il ponte si crea con `toSignal` e `toObservable`: il primo trasforma un Observable che emette in un signal, con un valore iniziale obbligatorio per gli stream sincroni; il secondo converte un signal in Observable per passarlo a un operatore RxJS.

```ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({ /* ... */ })
export class OrdiniPage {
  private readonly http = inject(HttpClient);
  readonly q = signal('');
  // switchMap: annulla la richiesta precedente quando q cambia
  readonly ordini = toSignal(
    toObservable(this.q).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => this.http.get<Ordine[]>('/api/ordini', { params: { q } })),
    ),
    { initialValue: [] },
  );
}
```

`toSignal` richiede un `injector` o va chiamato nel contesto di iniezione del costruttore o di un campo. La sottoscrizione creata da `toSignal` si chiude con il contesto, quindi non serve `takeUntilDestroyed`; per le sottoscrizioni manuali il pattern corretto è `pipe(takeUntilDestroyed(this.destroyRef))`, oppure evitare del tutto l'iscrizione e usare `AsyncPipe` nel template.

## Test: da `TestBed` al comportamento

Un test significativo verifica ciò che l'utente vede, non la struttura interna. `TestBed` monta il componente, `provideHttpClientTesting` intercetta le richieste e `flush` restituisce le risposte: il test resta veloce e non richiede un server.

```ts
describe('CarrelloComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarrelloComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('mostra il vuoto quando non ci sono righe', () => {
    const fixture = TestBed.createComponent(CarrelloComponent);
    fixture.componentRef.setInput('righe', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carrello vuoto');
  });

  it('emette l\'id della riga rimossa', () => {
    const fixture = TestBed.createComponent(CarrelloComponent);
    fixture.componentRef.setInput('righe', [{ id: 'a', nome: 'Tazza', prezzo: 8, quantita: 1 }]);
    const emesso: string[] = [];
    fixture.componentInstance.rimossa.subscribe((id) => emesso.push(id));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(emesso).toEqual(['a']);
  });
});
```

`setInput` è l'unico modo affidabile di impostare un input signal in un test, perché la scrittura diretta è vietata dal tipo. Per un servizio che fa HTTP il test usa `HttpTestingController`, verifica `req.url` e `req.request.params`, e conclude con `controller.verify()`: una richiesta non consumata fa fallire il test e smaschera chiamate duplicate.

Un errore di rete restituisce `HttpErrorResponse`, quindi il messaggio mostrato va distinto tra server che rifiuta e connessione assente.

## Errori comuni

- **Aggiornare un array con `push` su un signal**: il riferimento non cambia e `computed` non ricalcola; usa `update((a) => [...a, nuovo])` o `mutate`.
- **Mettere `effect` per calcolare valori del template**: un `computed` è dichiarativo e non dipende dall'ordine di esecuzione; l'effetto serve solo per il mondo esterno.
- **Dimenticare il valore iniziale in `toSignal`**: sugli Observable asincroni il template riceve `undefined` e va gestito, altrimenti si rompe al primo `@for`.
- **Chiamare `inject()` o `toSignal` fuori dal contesto di iniezione**: l'errore `NG0203` arriva a runtime; sposta la chiamata in un campo o in un `constructor`.
- **Testare con `fixture.debugElement` e classi interne**: il test si rompe a ogni refactor del template; meglio query sul DOM reso e su `textContent`.

Un ultimo dettaglio utile nei test: `TestBed` può sostituire l'intero `OrdiniService` con un fake dichiarato in `providers` del test, e allora il test del componente non dipende più da `HttpTestingController`. La regola pratica è testare il servizio con `HttpTestingController` e il componente con un fake: così un cambio di URL non rompe l'intero albero di test.

## In sintesi

I signal danno un modello di stato leggibile e derivazioni memoizzate, ma RxJS resta il linguaggio del tempo e delle cancellazioni: HTTP, debounce, `switchMap`. `toSignal` e `toObservable` vanno usati al confine tra i due mondi, con l'iniezione nel posto giusto. Il test di componente con `TestBed` e `HttpTestingController` verifica comportamento e richieste senza server e senza attese reali, e una richiesta non consumata fa fallire il test.

## Fonti

- [Angular - Signals](https://angular.dev/guide/signals)
- [Angular - LinkedSignal](https://angular.dev/guide/signals/linked-signal)
- [Angular - Testing](https://angular.dev/guide/testing)
- [Angular - HTTP client: setup](https://angular.dev/guide/http/setup)
