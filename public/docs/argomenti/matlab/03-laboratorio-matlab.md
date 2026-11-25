In questo laboratorio costruisci `analizza-segnali`, un piccolo toolkit MATLAB che legge un CSV di campioni, calcola statistiche e spettro e si autoverifica con una suite di test. Il codice gira anche in GNU Octave senza modifiche, perché usa solo funzioni di base. Il risultato è un progetto con cartelle, dati di esempio e test che falliscono quando il calcolo è sbagliato.

## Obiettivi

- Progettare una pipeline di analisi con ingressi, uscite e formato dati dichiarati.
- Estrarre vettori da una tabella e gestire valori mancanti senza propagare `NaN`.
- Calcolare statistiche e spettro con FFT, verificando la dimensione degli array.
- Scrivere test che coprono casi limite e proprietà matematiche.
- Misurare il costo di un calcolo vettorizzato rispetto alla versione con cicli.

## Il contratto di `analizza-segnali`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| input | `csv` con colonne `t` e `v` | tabella leggibile e diffabile |
| campionamento | `fs` passato esplicitamente | nessuna ipotesi nascosta |
| statistiche | media, deviazione, min, max | verifica rapida dell'ingresso |
| spettro | ampiezza FFT a una prova | diagnosi di frequenze |
| uscita | struct con campi fissi | testabile senza stampa |
| errori | `error` con identificatore | catturabile nei test |

La pipeline legge il file in una tabella, verifica che `t` sia crescente, poi calcola e restituisce una struct. Nessuna funzione stampa: i test confrontano valori, non testo.

```bash
matlab -batch "cd('progetto'); setup; test_analizza"             # MATLAB moderno
octave --no-gui --eval "cd('progetto'); setup; test_analizza"    # alternativa libera
```

`-batch` esegue senza interfaccia grafica e restituisce un codice di uscita non zero se lo script lancia un errore non gestito.

## Core: lettura, statistiche e spettro

La lettura concentra i controlli in un punto solo. Un segnale con NaN o tempi non crescenti va rifiutato subito: proseguire produce uno spettro che sembra plausibile e non significa nulla.

```matlab
function dati = leggi_segnale(percorso)
% LEGGI_SEGNALE Carica t e v da un CSV e valida i campioni.
    if ~isfile(percorso)
        error('analizza:file', 'file non trovato: %s', percorso);
    end
    t = readtable(percorso);
    if ~all(ismember({'t','v'}, t.Properties.VariableNames))
        error('analizza:colonne', 'servono le colonne t e v');
    end
    dati.t = t.t(:);   % colonna, qualunque sia l'orientamento
    dati.v = t.v(:);
    if numel(dati.t) < 8
        error('analizza:corti', 'servono almeno 8 campioni');
    end
    if any(isnan(dati.v)) || ~all(diff(dati.t) > 0)
        error('analizza:validita', 'tempi non crescenti o valori mancanti');
    end
end
```

Le statistiche sono una funzione pura, senza I/O, ed è quella che i test colpiscono per prima. La deviazione standard usa `n-1` per coerenza con il campione.

```matlab
function st = statistiche(dati)
% STATISTICHE Media, deviazione campionaria, minimo e massimo.
    x = dati.v(:);
    st.media = mean(x);
    st.deviazione = std(x, 0);   % 0 = normalizzazione per n-1
    st.minimo = min(x);
    st.massimo = max(x);
end

function sp = spettro(dati, fs)
% SPETTRO Ampiezza a una prova della FFT, con frequenze allineate.
    x = dati.v(:) - mean(dati.v(:));      % rimuove la componente continua
    n = numel(x);
    X = fft(x);
    meta = floor(n/2) + 1;                % frequenze non negative
    sp.f = (0:meta-1)' * fs / n;
    sp.amp = abs(X(1:meta)) * 2 / n;      % scala ampiezza di picco
    sp.amp(1) = sp.amp(1) / 2;            % la continua non si raddoppia
end
```

Verifica a mano il caso certo: una sinusoide di ampiezza 1 a `fs/8`, campionata su un numero intero di periodi, deve avere il massimo dello spettro a quella frequenza con ampiezza vicina a 1. Se il picco cade altrove, il difetto è nella scala di `f`; se l'ampiezza è 2, manca la divisione.

## Test e verifica

I test verificano proprietà, non solo numeri: l'identità `std([1 2 3]) == 1`, il picco di una sinusoide pura e i casi che devono fallire con un identificatore preciso.

```matlab
%% deviazione standard campionaria
assert(abs(std([1 2 3]) - 1) < 1e-12);

%% sinusoide pura: picco alla frequenza attesa
fs = 64; t = (0:63)' / fs;
v = sin(2*pi*8*t);
d.t = t; d.v = v;
sp = spettro(d, fs);
[~, idx] = max(sp.amp);
assert(abs(sp.f(idx) - 8) < 1/64);          % risoluzione binaria
assert(abs(sp.amp(idx) - 1) < 0.05);

%% file assente: errore catturabile
try
    leggi_segnale('non_esiste.csv');
    error('test:fallito', 'atteso errore');
catch e
    assert(strcmp(e.identifier, 'analizza:file'));
end
```

Per misurare il costo della vettorizzazione, confronta `sum(x.^2)` con il ciclo equivalente su un vettore da un milione di elementi.

## Esercizi

1. Aggiungi `sottrai_dc(dati)` che rimuove la media e restituisce una nuova struct, senza modificare l'input.
2. Gestisci un file con tempi non uniformi: calcola `fs` come mediana di `1./diff(t)` e segnala la varianza dei passi.
3. Aggiungi una finestra di Hann prima della FFT e confronta la dispersione del picco rispetto all'assenza di finestra.
4. Scrivi `trova_picchi(sp, soglia)` che restituisce frequenze e ampiezze dei massimi locali sopra la soglia.
5. Rendi il toolkit compatibile anche con Octave, sostituendo le chiamate non portabili e documentando quelle che restano.
6. Prealloca la struct dei risultati per dieci file e misura il tempo rispetto alla crescita con `end+1`.

<details>
<summary>Soluzione</summary>

1. `sottrai_dc` restituisce `struct('t', dati.t, 'v', dati.v - mean(dati.v))`; l'input resta intatto perché l'assegnazione crea un nuovo array.

2. `passi = diff(dati.t)`, `fs = 1/median(passi)`; la varianza `var(passi)` distingue un jitter trascurabile da tempi davvero irregolari, e oltre una soglia conviene interpolare con `interp1`.

3. `x = x .* hann(numel(x))` prima di `fft`; la finestra riduce la dispersione ma allarga il lobo principale, quindi l'ampiezza va normalizzata sulla somma della finestra.

4. `[pk, loc] = findpeaks` è specifico di MATLAB; la versione portabile è `d = diff(sign(diff(amp)))`, `loc = find(d < 0) + 1`, con il filtro `amp(loc) > soglia`.

5. Le chiamate non portabili sono `isfile`, `hann` e `findpeaks`; in Octave si usano `exist(p,'file')` e implementazioni locali, documentando l'adattatore.

6. Con una struct preallocata ogni assegnazione non ricopia; il guadagno diventa evidente oltre circa mille elementi, dove la crescita con `end+1` domina i tempi.

</details>

## Errori comuni

- **Calcolare lo spettro senza rimuovere la media**: la componente continua domina il picco e le altre ampiezze scompaiono nel grafico.
- **Usare `n` al posto di `n/2+1` per l'asse delle frequenze**: le ampiezze si allineano a frequenze sbagliate e il picco sembra spostato.
- **Raddoppiare anche il primo bin**: l'ampiezza della continua risulta doppia e i test di scala falliscono su input non centrati.
- **Test che confrontano stringhe di output invece di strutture**: ogni cambio di formattazione rompe i test senza un difetto reale.
- **Lasciare un `catch` vuoto nei test**: un errore inatteso viene inghiottito e il test passa senza aver verificato nulla.

## In sintesi

Hai costruito una pipeline che separa lettura e validazione dal calcolo, restituisce strutture testabili e rifiuta input ambigui. Lo spettro richiede attenzione alla scala delle frequenze e al fattore di ampiezza, e i test coprono valori noti e casi di errore. La stessa suite gira in GNU Octave, purché le funzioni specifiche restino isolate.

## Fonti

- [MathWorks - MATLAB Documentation](https://www.mathworks.com/help/matlab/), riferimento delle funzioni `fft`, `readtable`, `std` e `findpeaks`.
- [MATLAB - Array Indexing](https://www.mathworks.com/help/matlab/matlab_prog/array-indexing.html), regole di indicizzazione usate per estrarre colonne e maschere.
- [MATLAB - Vectorization](https://www.mathworks.com/help/matlab/matlab_prog/vectorization.html), confronto tra cicli e operazioni su array.
- [GNU Octave Manual - Index Expressions](https://docs.octave.org/latest/Index-Expressions.html), equivalenza dell'indicizzazione per eseguire gli stessi test.
- [GNU Octave Manual](https://octave.org/doc/latest/), manuale di riferimento per la versione libera del toolkit.
