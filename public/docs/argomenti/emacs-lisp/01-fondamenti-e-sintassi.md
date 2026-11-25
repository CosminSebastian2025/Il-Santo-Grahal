Emacs Lisp è il linguaggio in cui è scritta la maggior parte di GNU Emacs, editor estensibile che funziona anche come interprete Lisp completo. Non è un linguaggio generalista pensato per applicazioni esterne: il suo scopo è descrivere comportamenti dell'editor e integrare pacchetti, comandi e funzioni di personalizzazione. In questa lezione impari la sintassi di base, i valori fondamentali e il modello di valutazione di Emacs Lisp.

Una comprensione utile fin da subito riguarda l'ambiente: ogni forma viene valutata in un buffer corrente, con un punto e un buffer di destinazione, e molte funzioni restituiscono valori che sembrano privi di effetto perché scrivono solo sul buffer. Chi conosce altri Lisp deve quindi adattare l'idea di "programma": qui il programma è un insieme di comandi che modificano uno stato vivo.

## Obiettivi

- Leggere e scrivere forme Lisp sapendo cosa restituisce la valutazione.
- Distinguere valori da simboli, variabili speciali e binding dinamici o lessicali.
- Usare liste, vettori, hash table e stringhe secondo la convenzione dei file Emacs.
- Modificare buffer e finestre con comandi interattivi e funzioni `interactive`.
- Configurare un file `init.el` senza eseguire effetti collaterali indesiderati.

## Sintassi, forme e valutazione

Emacs Lisp è un Lisp della famiglia di Common Lisp ma semplificato: tutto è una lista tra parentesi, il primo elemento decide cosa fare e gli argomenti non sono necessariamente valutati. Un numero, una stringa o un simbolo quotato sono auto-valutanti o valori; una forma tra parentesi è una chiamata, salvo forme speciali come `if`, `lambda` o `quote`.

```lisp
;; la valutazione restituisce il valore dell'ultima forma
(+ 1 2 3)                     ; => 6
(concat "ciao " "Ada")         ; => "ciao Ada"
'(a b c)                       ; => (a b c), lista letterale
(list 1 2 (+ 1 2))             ; => (1 2 3), argomenti valutati

(defun saluta (chi)
  "Restituisce un saluto per CHI."
  (concat "ciao " chi))

(saluta "Ada")                 ; => "ciao Ada"
```

La documentazione fa parte del codice: una stringa subito dopo gli argomenti di `defun` è il docstring, consultabile con `C-h f`. Le forme speciali non valutano tutti gli argomenti: `quote` restituisce la forma senza eseguirla, `if` valuta una sola delle due ramificazioni e `and`/`or` si fermano al primo valore decisivo. Le funzioni invece valutano tutti gli argomenti prima di eseguire il corpo, e questa differenza spiega perché le macro sono così potenti: ricevono forme e possono decidere cosa valutare.

| Forma | Significato | Esempio |
| --- | --- | --- |
| `defun` | definisce una funzione | `(defun f (x) x)` |
| `defvar` | variabile speciale, senza sovrascrivere | `(defvar *limite* 10)` |
| `setq` | assegna una variabile | `(setq x 20)` |
| `if` | due ramificazioni, nessun `else` obbligatorio | `(if (> x 0) "si" "no")` |
| `let` | binding locali | `(let ((y 1)) (+ y 1))` |
| `quote` o `'` | valore letterale | `'(1 2 3)` |

Nomi con asterischi ai lati (`*limite*`) sono per convenzione variabili globali di configurazione, mentre il prefisso del pacchetto (`mon-timer--worker`) evita collisioni nello spazio dei nomi globale.

## Tipi, buffer e comandi

I tipi principali sono numeri, stringhe, simboli, liste, vettori, hash table e buffer. Un buffer è il testo in memoria di un file o di un output; un punto delimita la posizione del cursore e un marker indica una posizione che si sposta con le modifiche. Le funzioni che modificano il testo lavorano quasi sempre tra due posizioni, quindi leggere `(point-min)` e `(point-max)` è il primo passo.

```lisp
(defun mon-conta-righe ()
  "Conta le righe del buffer corrente."
  (interactive)
  (save-excursion ; ripristina il punto alla fine della funzione
    (goto-char (point-min))
    (let ((n 0))
      (while (not (eobp))
        (forward-line 1)
        (setq n (1+ n)))
      (message "Righe: %d" n))))

;; hash table con creazione e inserimento tipici
(let ((tab (make-hash-table :test #'equal)))
  (puthash "pippo" 1 tab)       ; chiavi per stringa, confronto con equal
  (gethash "pippo" tab))        ; => 1
```

Una funzione `interactive` diventa un comando, cioè uno che si può invocare con `M-x` o associare a un tasto; senza la forma `interactive` resta solo una funzione chiamabile da altro codice. `save-excursion` e `save-restriction` proteggono lo stato dell'editor, e i file Emacs li usano in ogni funzione che sposta il cursore.

## `init.el`, variabili e caricamento

La configurazione di Emacs vive in `~/.emacs.d/init.el` oppure in `~/.emacs`, ed è codice Lisp eseguito all'avvio. `add-to-list` modifica al sicuro una variabile di elenco, `setq` assegna, `require` carica un modulo già installato, `setq-default` imposta il valore globale di una variabile buffer-local. Il primo file deve restare breve: ogni `require` di un pacchetto esterno si deve poter isolare in caso di errori.

```lisp
;; init.el: impostazioni minime e ordine esplicito
(setq inhibit-startup-screen t)   ; salta la schermata di avvio
(tool-bar-mode -1)                ; rimuove la barra degli strumenti

(add-to-list 'load-path "~/.emacs.d/lisp/") ; cartella con codice locale
(require 'mon-comandi nil t)      ; carica se presente, senza arresti

(setq-default indent-tabs-mode nil) ; niente tab nel codice
(global-set-key (kbd "C-c a") #'list-processes) ; binding esplicito
```

Il caricamento dei pacchetti passa da `package.el` con i repository GNU ELPA e MELPA, oppure dai gestori esterni come `use-package`. Indipendentemente dallo strumento, l'avvio deve essere deterministico: un `error` non catturato in `init.el` interrompe il resto del file. Per questo è comune avvolgere le configurazioni sperimentali in `condition-case` o `ignore-errors`, e tenere le impostazioni stabili prima di quelle facoltative, in modo che un problema di un pacchetto non blocchi l'editor intero.

## Errori comuni

- **Dimenticare `interactive`**: una funzione senza quella forma non compare tra i comandi e non si invoca con `M-x`.
- **Usare `setq` su variabili mai dichiarate**: senza `defvar` o `defcustom` il valore diventa globale senza documentazione né valore predefinito.
- **Modificare il punto senza `save-excursion`**: il cursore salta altrove e il comportamento del comando sembra casuale.
- **Caricare pacchetti senza protezione in `init.el`**: un `require` fallito blocca l'avvio del resto della configurazione.
- **Confrontare stringhe in una hash table con `eq`**: `eq` confronta identità, per le stringhe va usato `equal`.

## In sintesi

Emacs Lisp è un Lisp dinamico pensato per estendere l'editor: forme, simboli e valutazione determinano tutto, e i buffer sono valori di prima classe. I comandi si definiscono con `defun` più `interactive`, le funzioni che spostano il punto proteggono lo stato con `save-excursion`. La configurazione è codice in `init.el`, e la sua qualità dipende dall'ordine e dalla protezione di ogni `require`.

## Fonti

- [Emacs Lisp Reference Manual sources – doc/lispref](https://github.com/emacs-mirror/emacs/tree/master/doc/lispref)
- [Emacs Mirror – doc/lispref/elisp.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/lispref/elisp.texi)
- [Emacs Mirror – doc/emacs/emacs.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/emacs/emacs.texi)
- [MELPA - MELPA.org](https://melpa.org/)
- [GNU ELPA](https://elpa.gnu.org/)
