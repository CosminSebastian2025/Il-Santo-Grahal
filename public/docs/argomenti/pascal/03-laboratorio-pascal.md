In questo laboratorio costruisci `inventario`, uno strumento a riga di comando in Free Pascal che legge un file CSV di prodotti, calcola il valore totale per categoria e stampa un report ordinato. Il lavoro alterna testo, codice e test: contratto, parsing, ordinamento e verifica con FPCUnit. È un esercizio realistico per un linguaggio compilato, dove la gestione degli errori passa da codici di uscita e messaggi su stderr.

## Obiettivi

- Definire il contratto di una CLI e gli exit code prima del codice.
- Leggere un file di testo riga per riga con gestione degli errori.
- Rappresentare dati con record e calcolare aggregati per categoria.
- Ordinare i risultati e formattare un report tabellare.
- Scrivere test FPCUnit sui casi limite.

## Il contratto dello strumento

Il programma accetta un percorso e una modalità di output. Ogni riga del CSV ha la forma `categoria,prodotto,quantita,prezzo`.

| Condizione | Comportamento | Exit code |
| --- | --- | --- |
| file valido | report tabellare su stdout | 0 |
| argomenti mancanti | uso su stderr | 2 |
| file assente | errore su stderr | 1 |
| riga malformata | errore con numero di riga su stderr | 1 |
| `--csv` | output `categoria,totale` su stdout | 0 |

```pascal
program inventario;
{$mode objfpc}{$H+}
uses SysUtils, InventarioCore;
var
  Riga: TRiga;
  Totale: Double;
  ModoCsv: Boolean;
  i: Integer;
begin
  if ParamCount < 1 then
  begin
    WriteLn(StdErr, 'uso: inventario FILE [--csv]');
    Halt(2);
  end;
  ModoCsv := (ParamCount > 1) and (ParamStr(2) = '--csv');
  if not Carica(ParamStr(1), Riga) then
    Halt(1);
  for i := 0 to Riga.Contatore - 1 do
  begin
    Totale := Riga.TotalePer(i);
    if ModoCsv then
      WriteLn(Riga.Categoria[i], ',', FormatFloat('0.00', Totale))
    else
      WriteLn(Format('%-12s %10.2f', [Riga.Categoria[i], Totale]));
  end;
end.
```

`ParamCount`, `ParamStr` e `Halt` sono le primitive del modello a riga di comando: `Halt(2)` termina subito con l'exit code scelto, e `WriteLn(StdErr, ...)` mantiene pulito stdout. Il programma resta sottile, mentre la logica vive in un'unità testabile.

## Parsing e aggregazione

Il nucleo usa record e array dinamici. Ogni categoria viene accumulata in un record, e il CSV si spezza con `Split` sui campi.

```pascal
unit InventarioCore;
{$mode objfpc}{$H+}
interface
type
  TCategoria = record
    Nome: String;
    Totale: Double;
  end;
  TRiga = record
    Categoria: array of String;
    Importi: array of Double;
    Contatore: Integer;
    function TotalePer(indice: Integer): Double;
    procedure Aggiungi(const cat: String; importo: Double);
  end;
function Carica(const percorso: String; out r: TRiga): Boolean;
implementation
uses SysUtils;

procedure TRiga.Aggiungi(const cat: String; importo: Double);
var
  i: Integer;
begin
  for i := 0 to Contatore - 1 do
    if Categoria[i] = cat then
    begin
      Importi[i] := Importi[i] + importo;
      Exit;
    end;
  SetLength(Categoria, Contatore + 1);
  SetLength(Importi, Contatore + 1);
  Categoria[Contatore] := cat;
  Importi[Contatore] := importo;
  Inc(Contatore);
end;

function TRiga.TotalePer(indice: Integer): Double;
begin
  TotalePer := Importi[indice];
end;

function Campi(const linea: String): TStringArray;
begin
  Result := linea.Split([','], TStringSplitOptions.ExcludeEmpty);
end;

function Carica(const percorso: String; out r: TRiga): Boolean;
var
  f: TextFile;
  linea: String;
  campi: TStringArray;
  qty, prezzo: Double;
  numero: Integer;
begin
  Carica := False;
  r.Contatore := 0;
  if not FileExists(percorso) then
  begin
    WriteLn(StdErr, 'inventario: file assente: ', percorso);
    Exit;
  end;
  AssignFile(f, percorso);
  Reset(f);
  try
    numero := 0;
    while not Eof(f) do
    begin
      ReadLn(f, linea);
      Inc(numero);
      campi := Campi(linea);
      if (Length(campi) <> 4) or (not TryStrToFloat(campi[2], qty))
         or (not TryStrToFloat(campi[3], prezzo)) then
      begin
        WriteLn(StdErr, 'inventario: riga ', numero, ' malformata');
        Exit;
      end;
      r.Aggiungi(campi[0], qty * prezzo);
    end;
    Carica := True;
  finally
    CloseFile(f);
  end;
end;
end.
```

Il costrutto `try..finally` garantisce `CloseFile` anche in caso di uscita anticipata: in Pascal è l'abitudine da acquisire subito per i file. `SetLength` cresce l'array dinamico di un elemento; per volumi grandi conviene raddoppiare la capacità come in qualsiasi linguaggio. Il parsing completo del campo `prodotto`, con eventuali virgolette nel CSV, è la parte da completare nell'esercizio 3.

## Report, ordinamento e test

L'ordinamento si fa con una procedura di confronto semplice, dato che le categorie sono poche; in alternativa si copiano i valori in un `TStringList` con `Sorted` abilitato.

```pascal
procedure OrdinaPerTotale(var r: TRiga);
var
  i, j: Integer;
  tmpS: String;
  tmpD: Double;
begin
  for i := 0 to r.Contatore - 2 do
    for j := 0 to r.Contatore - 2 - i do
      if r.Importi[j] < r.Importi[j + 1] then
      begin
        tmpD := r.Importi[j]; r.Importi[j] := r.Importi[j + 1]; r.Importi[j + 1] := tmpD;
        tmpS := r.Categoria[j]; r.Categoria[j] := r.Categoria[j + 1]; r.Categoria[j + 1] := tmpS;
      end;
end;
```

L'ordinamento decrescente per importo richiede di scambiare i due array in parallelo: è il classico errore da evitare. La formattazione `%-12s %10.2f` allinea a sinistra la categoria e a destra il totale con due decimali.

```bash
fpc -Mobjfpc -Cr -Ct -O2 inventario.pas
printf 'libri,romanzo,2,12.50\ncancelleria,penna,10,1.20\nlibri,saggio,1,20.00\n' > dati.csv
./inventario dati.csv
./inventario dati.csv --csv
./inventario manca.csv; echo "exit=$?"
```

I test FPCUnit coprono il caso reale e i casi limite: file assente, riga con tre campi, categoria ripetuta.

## Esercizi

1. Riscrivi `Campi` con `Pos` e `Copy` invece di `Split`, gestendo correttamente gli offset.
2. Aggiungi la validazione di `quantita` e `prezzo` con `TryStrToFloat` e restituisci errore con il numero di riga.
3. Gestisci il CSV con campi tra virgolette, dove una virgola può comparire dentro il nome del prodotto.
4. Aggiungi l'opzione `--top N` che stampa solo le N categorie con totale maggiore.
5. Scrivi un test FPCUnit che verifica il conteggio delle categorie con una riga ripetuta.
6. Fai in modo che un file vuoto stampi `nessun dato` ed esca con 0.

<details>
<summary>Soluzione</summary>

1. Con `p1 := Pos(',', linea)` il primo campo è `Copy(linea, 1, p1-1)`; il resto è `Copy(linea, p1+1, MaxInt)`, e gli altri `Pos` si calcolano sul resto o su `Copy` con offset cumulativi.

2. Con `TryStrToFloat(campo, valore)` si hanno conversione e verifica in un'unica chiamata; se fallisce si stampa `riga N: valore non numerico` su stderr e si esce con 1.

3. Si scorre la riga con un indice e uno stato `dentroVirgolette: Boolean`, e si spezza solo su virgole esterne; le virgolette doppie dentro le virgolette diventano un carattere.

4. Si ordina con `OrdinaPerTotale`, poi nel ciclo `for i := 0 to Min(N, Riga.Contatore) - 1 do`; `N` va validato come intero positivo, con exit 2 se non lo è.

5. Nel test si dichiara `procedure TestCategoriaRipetuta;` e si scrive: creare il file temporaneo, chiamare `Carica`, verificare `AssertEquals(1, R.Contatore)`.

6. Dopo `Carica` con successo, se `Riga.Contatore = 0` si scrive `WriteLn('nessun dato')` e si esce con 0, perché un file vuoto è un input valido.

</details>

## Errori comuni

- **Aprire il file senza `try..finally`**: un'uscita anticipata lascia il file aperto e sulle piattaforme con lock il programma successivo fallisce.
- **Riordinare solo l'array degli importi**: le categorie non seguono i valori e il report diventa incoerente.
- **Leggere `ParamStr(2)` senza controllare `ParamCount`**: si ottiene una stringa vuota e la logica delle opzioni si comporta in modo imprevisto.
- **Scrivere i messaggi d'errore su stdout**: script e test che leggono l'output non distinguono il report dall'errore.
- **Fidarsi di `StrToFloat` senza verificare la locale**: in alcune configurazioni il separatore decimale è la virgola e i valori valgono zero.

## In sintesi

Il laboratorio mostra un ciclo completo in Pascal: contratto, output testabile, unità separata dal programma e test FPCUnit. `try..finally` e le dichiarazioni tipizzate rendono espliciti i passaggi delicati. L'ordinamento parallelo e il parsing del CSV sono i punti in cui gli errori si nascondono.

## Fonti

- [Free Pascal, funzioni di sistema per I/O e stringhe](https://www.freepascal.org/docs-html/current/rtl/system/index.html)
- [Free Pascal, riferimento del linguaggio: record e procedure](https://www.freepascal.org/docs-html/ref/ref.html)
- [Free Pascal, guida utente e opzioni di compilazione](https://www.freepascal.org/docs-html/current/user/user.html)
- [Lazarus, FAQ sulla toolchain Free Pascal e Lazarus](https://wiki.freepascal.org/Lazarus_Faq)
