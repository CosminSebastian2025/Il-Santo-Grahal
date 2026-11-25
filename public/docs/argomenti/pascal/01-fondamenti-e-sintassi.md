Pascal nasce nel 1970 come linguaggio didattico pensato da Niklaus Wirth: codice leggibile, tipi forti e regole semplici. Da lì si sono sviluppati Object Pascal e le implementazioni moderne come Free Pascal e Delphi, che ancora oggi producono applicazioni desktop native. In questa lezione impari la sintassi di base e, soprattutto, il modello di esecuzione compilato che rende il linguaggio così prevedibile.

## Obiettivi

- Riconoscere la struttura `program`–`var`–`begin`–`end` e l'ordine delle sezioni.
- Dichiarare variabili e costanti con tipi espliciti e usarle nei calcoli.
- Controllare il flusso con `if`, `case` e i tre tipi di ciclo.
- Scrivere procedure e funzioni, con distinzione tra parametri per valore e per riferimento.
- Compilare un file con `fpc` e leggere i messaggi del compilatore.

## Struttura di un programma

Un programma Pascal è una sequenza di sezioni dichiarative seguita da un blocco eseguibile tra `begin` ed `end.`. Il punto finale chiude il programma, non una riga.

```pascal
program saluto;
const
  Nome = 'Grahal';
  Ripetizioni = 3;
var
  i: Integer;
begin
  for i := 1 to Ripetizioni do
    WriteLn(Nome, ' #', i);
end.
```

L'operatore di assegnazione è `:=`, mentre `=` serve solo per i confronti e le costanti. La distinzione è netta e aiuta a leggere il codice. Fortran e C usano `=` per entrambe le cose, Pascal no: questa è una delle scelte che rendono il linguaggio didattico.

## Tipi e dichiarazioni

I tipi primitivi hanno nomi espliciti: `Integer`, `Int64`, `Real`, `Double`, `Char`, `Boolean`, `String`. Il tipo `String` in Free Pascal è un alias di `AnsiString`, quindi è gestito automaticamente.

```pascal
program tipi;
var
  quantita: Integer;
  prezzo: Double;
  totale: Double;
  attivo: Boolean;
  lettera: Char;
  etichetta: ShortString;
begin
  quantita := 3;
  prezzo := 19.99;
  totale := quantita * prezzo;
  attivo := totale > 50.0;
  lettera := 'A';
  etichetta := 'ordine';
  WriteLn(etichetta, ': ', totale:0:2, ' attivo=', attivo);
end.
```

| Tipo | Contenuto | Attenzione |
| --- | --- | --- |
| `Integer` | intero nativo, sufficiente per indici | l'overflow non è controllato senza `-Cr` |
| `Int64` | intero a 64 bit | dichiaralo per contatori grandi |
| `Double` | reale a doppia precisione | `Real` è un alias in Free Pascal |
| `Char` | un carattere, apici singoli | le stringhe usano apici singoli |
| `Boolean` | `True` / `False` | non è un intero, non usare `1`/`0` |

I formati di output si scrivono dopo i due punti: `totale:0:2` significa larghezza minima zero e due decimali. Il `:` semplice controlla solo la larghezza.

## Flusso di controllo e cicli

Pascal offre tre cicli: `for` per intervalli noti, `while` per condizioni verificate prima e `repeat` per condizioni verificate dopo.

```pascal
program controllo;
var
  n, i, somma: Integer;
begin
  n := 7;
  case n mod 3 of
    0: WriteLn('multiplo di 3');
    1, 2: WriteLn('resto non nullo');
  else
    WriteLn('impossibile');
  end;

  somma := 0;
  for i := 1 to n do
    somma := somma + i;

  i := 1;
  while i <= n do
  begin
    somma := somma + i;
    Inc(i);
  end;

  repeat
    Dec(n);
  until n = 0;
  WriteLn('somma=', somma, ' n=', n);
end.
```

`Inc` e `Dec` sono procedure intrinseche: aggiornano la variabile in modo esplicito e lo rendono evidente. Le istruzioni composte da più righe vanno racchiuse tra `begin` ed `end`, perché Pascal non usa indentazione significativa per delimitare i blocchi.

## Procedure, funzioni e modello di esecuzione

Le procedure e le funzioni si dichiarano prima del blocco principale. I parametri per valore (`x: Integer`) sono copie, quelli per riferimento (`var x: Integer`) modificano la variabile del chiamante. La funzione restituisce un valore assegnandolo al proprio nome.

```pascal
program geometria;

function AreaCerchio(r: Double): Double;
begin
  AreaCerchio := Pi * r * r;      // Pi e le funzioni matematiche sono intrinseche
end;

procedure Incrementa(var n: Integer; passo: Integer);
begin
  n := n + passo;                  // modifica visibile al chiamante
end;

function Media(const v: array of Double): Double;
var
  i: Integer;
  s: Double;
begin
  s := 0;
  for i := 0 to High(v) do
    s := s + v[i];
  if Length(v) = 0 then
    Exit(0);
  Media := s / Length(v);
end;

var
  n: Integer;
begin
  n := 1;
  Incrementa(n, 4);
  WriteLn('n=', n, ' area=', AreaCerchio(2.0):0:4);
  WriteLn('media=', Media([1.0, 2.0, 3.0]):0:4);
end.
```

`const` sui parametri promette sola lettura, `array of Double` è un array aperto che accetta argomenti di lunghezza qualsiasi, e `High`/`Low` danno i limiti. Il modello di esecuzione è semplice: ogni chiamata crea uno stack frame, il programma principale è un frame radice e non esistono eccezioni non gestite se non con `try..except`. Il garbage collector non esiste: la memoria è gestita dall'allocatore e dalle stringhe gestite automaticamente.

```bash
fpc -Mobjfpc -Cr -Co -O2 -gh geometria.pas
./geometria
```

`-Cr` attiva i controlli di range (accessi fuori indice e overflow interi), `-gh` include le informazioni per glibc heap debugging. Durante lo sviluppo compila sempre con i controlli attivi: è il modo più rapido per individuare gli errori di indice.

## Errori comuni

- **Usare `=` invece di `:=` nell'assegnazione**: il compilatore segnala un errore di sintassi, non un bug silenzioso, ma il messaggio confonde i principianti.
- **Omettere il `;` tra le dichiarazioni**: il punto e virgola separa, ma dopo `end` del blocco esecutivo serve il punto.
- **Dimenticare `begin..end` in un ramo con due istruzioni**: solo la prima rientra nella condizione, e il resto gira sempre.
- **Confondere parametri per valore e per riferimento**: senza `var` la procedura lavora su una copia e il chiamante non vede i cambiamenti.
- **Fidarsi di `Integer` per somme grandi**: senza `-Cr` l'overflow è silenzioso e il risultato diventa negativo.

## In sintesi

Pascal privilegia la leggibilità: sezioni dichiarative esplicite, `:=` per assegnare e blocchi `begin..end`. I tipi sono nominati e il compilatore li controlla prima dell'esecuzione, senza conversioni implicite pericolose. Le procedure distinguono copia e riferimento con una parola chiave, e con Free Pascal il linguaggio resta compilato, rapido e semplice da leggere.

## Fonti

- [Free Pascal, documentazione di riferimento del linguaggio](https://www.freepascal.org/docs-html/ref/ref.html)
- [Free Pascal, guida del programmatore](https://www.freepascal.org/docs-html/current/prog/prog.html)
- [Free Pascal, guida utente e opzioni del compilatore](https://www.freepascal.org/docs-html/current/user/user.html)
- [Lazarus IDE, sito ufficiale e download](https://www.lazarus-ide.org/)
