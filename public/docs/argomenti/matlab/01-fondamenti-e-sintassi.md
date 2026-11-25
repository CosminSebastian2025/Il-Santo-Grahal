MATLAB è un ambiente di calcolo numerico e un linguaggio interpretato in cui il dato centrale non è il numero ma la matrice: ogni scalare è una matrice 1×1, e quasi tutte le operazioni lavorano sull'intero array senza cicli espliciti. Nato come interfaccia alle librerie Fortran di algebra lineare, è oggi lo strumento standard in ingegneria, controllo e analisi dati. MATLAB è commerciale, ma GNU Octave è un'alternativa gratuita e compatibile con la sintassi di base.

In questa lezione impari la sintassi e l'indicizzazione, e vedi perché vettorizzare cambia radicalmente le prestazioni.

## Obiettivi

- Creare matrici con i costruttori letterali e le funzioni di base (`zeros`, `ones`, `rand`, `:`).
- Distinguere l'indicizzazione per posizione da quella logica e usare `end` e le slice.
- Capire la differenza tra `*` e `.*`, tra `'` e `.'`, e quando servono.
- Scrivere funzioni in file con nome coerente, argomenti di input e di output.
- Riconoscere il costo dei cicli espliciti e il ruolo della vettorizzazione.

## Matrici, indicizzazione e operazioni elementari

Il costruttore più diretto è il letterale tra parentesi quadre: la virgola (o lo spazio) separa colonne, il punto e virgola separa righe. L'operatore `:` genera un vettore con passo, e `end` indica l'ultimo indice della dimensione.

```matlab
A = [1 2 3; 4 5 6; 7 8 9];   % 3x3, righe separate da ;
v = 0:0.5:2;                 % [0 0.5 1 1.5 2]
b = A(:, 2);                 % seconda colonna: tutte le righe
A(2, :) = [];                % elimina la seconda riga
B = A([1 3], end-1:end);     % righe 1 e 3, ultime due colonne
```

L'indicizzazione lineare coesiste con quella a più dimensioni: `A(5)` è il quinto elemento in ordine di colonna, perché MATLAB è column-major. Le maschere logiche sono più leggibili: `A(A > 4)` estrae gli elementi che soddisfano la condizione.

| Operatore | Significato | Esempio |
| --- | --- | --- |
| `*` | prodotto matriciale | `A * x` |
| `.*` | prodotto elemento per elemento | `v .* v` |
| `^` | potenza matriciale | `A ^ 2` |
| `.^` | potenza elementare | `v .^ 2` |
| `'` | trasposta coniugata | `A'` |
| `.'` | trasposta semplice | `A.'` |
| `.\` | divisione sinistra elementare | `1 ./ v` |

La trasposta coniugata è la fonte di errore classica: su un array reale non cambia nulla, su uno complesso applica il coniugio. Quando vuoi solo permutare le dimensioni usa `.'`.

## Funzioni, script e scope

Uno script è un file di comandi che condivide il workspace della sessione; una funzione ha invece scope locale e va salvata in un file `<nome>.m` con lo stesso nome. Gli argomenti di output si dichiarano nella firma e una funzione può ritornarne più di uno.

```matlab
function [media, dev] = statistiche(x)
% STATISTICHE Media e deviazione standard campionaria.
%   [M, S] = STATISTICHE(X) lavora su qualsiasi orientamento di X.
    x = x(:);                       % forza colonna, indipendente dall'input
    n = numel(x);
    if n == 0
        error('statistiche:vuoto', 'il vettore non può essere vuoto');
    end
    media = sum(x) / n;
    dev = sqrt(sum((x - media).^2) / (n - 1));
end
```

`nargin` e `nargout` permettono argomenti opzionali; senza controlli, una funzione chiamata con troppi argomenti dà errore immediato. Le funzioni anonime, `f = @(x) x.^2 + 1`, sono handle utili per `arrayfun` o `integral`, ma non possono contenere assegnazioni.

## Cicli, controllo di flusso e vettorizzazione

Sintatticamente `if`, `for`, `while` e `switch` sono banali, ma il loro costo non lo è: ogni iterazione passa dall'interprete, mentre un'operazione su array scende in codice C o Fortran ottimizzato.

```matlab
% versione lenta: un ciclo esplicito
tic
s = 0;
for k = 1:numel(x)
    s = s + x(k)^2;
end
t_ciclo = toc;

% versione vettorizzata: una sola operazione su array
tic
s = sum(x.^2);
t_vett = toc;

fprintf('ciclo %.5f s, vettorizzato %.5f s\n', t_ciclo, t_vett);
```

Per memoria che cresce iterativamente usa `zeros(n,1)` come preallocazione, non `x(end+1) = ...`: l'append ricopia l'intero array a ogni iterazione. Il JIT accelera i cicli solo su codice semplice e con tipi stabili.

| Costrutto | Uso | Nota |
| --- | --- | --- |
| `if`/`elseif`/`end` | rami condizionali | nessuna parentesi obbligatoria |
| `for k = v` | itera sulle colonne di `v` | `v` è una matrice, non solo un vettore |
| `while` | ciclo con condizione | aggiorna la variabile a mano |
| `switch` | selezione su valori | `otherwise` è il default |
| `break`/`continue` | controllo interno | solo dentro i cicli |

Attenzione a `for k = v`: se `v` è una matrice, `k` è una colonna per volta. `for k = 1:numel(v)` è quasi sempre ciò che si intende.

## Tipi numerici e precisione

Il tipo predefinito è `double` a 64 bit; esistono `single`, gli interi (`int8`…`uint64`) e `logical`. Le conversioni sugli interi avvengono per saturazione, senza avvisi: `uint8(300)` vale 255. Le stringhe sono array di `char` oppure scalari `string`.

```matlab
x = 1/3;                    % double, circa 0.3333
y = single(1/3);            % metà precisione, utile per memoria
z = uint8(250 + 10);        % satura a 255, nessun errore
s = "riga" + " unita";      % string, concatenazione con +
nome = ['a' 'b'];           % char array, lunghezza fissa
```

Nel codice numerico reale la scelta del tipo è una decisione di dominio: `single` dimezza la memoria degli array grandi e gli interi sono adatti a immagini quantizzate, ma i confronti con valori double generano promozioni silenziose.

## Errori comuni

- **Scrivere `*` al posto di `.*` tra vettori**: dà errore di dimensioni incompatibili oppure calcola un prodotto scalare quando volevi un prodotto elementare.
- **Usare `'` su dati complessi**: la trasposta coniugata cambia il segno della parte immaginaria; se vuoi solo permutare righe e colonne usa `.'`.
- **Crescere un array in un ciclo con `x(end+1) = v`**: ogni assegnazione ricopia l'intero array, il costo diventa quadratico.
- **Dare alla funzione un nome diverso dal file**: a parte la prima funzione visibile, le altre restano private; se il file non si chiama come la funzione, una chiamata in un'altra cartella fallisce.
- **Comparare direttamente con un valore dopo la saturazione intera**: `uint8(250)+10` diventa 255 e il confronto con 260 è sempre falso.

## In sintesi

MATLAB ragiona per matrici: indicizzazione posizionale e logica convivono, `end` semplifica le slice, e gli operatori puntati distinguono calcolo elemento per elemento da algebra lineare. Le funzioni vivono in file omonimi con scope locale, mentre gli script condividono il workspace. La vettorizzazione è una scelta di progetto, non un'ottimizzazione cosmetica: sposta il lavoro dall'interprete a codice nativo. Per chi non può avere una licenza, GNU Octave copre la sintassi di base.

## Fonti

- [MathWorks - MATLAB Documentation](https://www.mathworks.com/help/matlab/), indice della documentazione ufficiale su linguaggio, funzioni e toolbox.
- [Getting Started with MATLAB](https://www.mathworks.com/help/matlab/getting-started-with-matlab.html), introduzione ufficiale con matrici, manipolazione e grafici.
- [MATLAB - Vectorization](https://www.mathworks.com/help/matlab/matlab_prog/vectorization.html), guida ufficiale su come sostituire i cicli con operazioni su array.
- [GNU Octave Manual](https://octave.org/doc/latest/), manuale dell'alternativa libera, con capitoli su matrici e funzioni.
- [Octave - Basic Vectorization](https://docs.octave.org/latest/Basic-Vectorization.html), capitolo sullo stile vettorizzato e sul costo dei cicli in Octave.
