Un pacchetto Emacs nasce da un file Lisp singolo e cresce con un sistema di distribuzione, convenzioni di codice e test automatici. L'ecosistema è maturo ma specifico: i pacchetti si pubblicano su GNU ELPA o MELPA, si installano con `package.el`, e il codice deve rispettare regole ferree sui prefissi dei simboli e sul caricamento pigro per non rallentare l'avvio. In questa lezione vedi come scrivere un pacchetto, testarlo e integrarlo con gli strumenti dell'editor.

Il metro di qualità qui è diverso da quello di un'applicazione: un'estensione emacs giudicata buona non rallenta l'avvio, non occupa memoria per funzioni che nessuno usa e non stampa warning in byte compilation. Questi tre obiettivi guidano quasi tutte le scelte che vedi nelle righe seguenti, dalla struttura del file fino ai test.

## Obiettivi

- Organizzare un pacchetto con intestazione standard, prefisso dei simboli e file separati.
- Distribuirlo con `package.el` oppure pubblicarlo su MELPA o GNU ELPA.
- Scrivere test con `ert` e `batch-byte-compile` in batch mode.
- Usare `macroexpand` e il byte compiler per controllo e ottimizzazione.
- Riconoscere le convenzioni di caricamento pigro e di compatibilità.

## Struttura di un pacchetto

Un pacchetto è un file principale `nome.el` con un'intestazione leggibile da `package.el`: `;;; nome.el --- Descrizione breve -*- lexical-binding: t; -*-`, la riga `;; Version:` e `;; Package-Requires:`, seguita dal codice e dal `provide`. La direttiva `lexical-binding: t` è obbligatoria nei pacchetti moderni: attiva lo scoping lessicale delle closure, che senza di essa sono dinamiche e si comportano in modo diverso.

```elisp
;;; mon-cron.el --- Cronometro minimale -*- lexical-binding: t; -*-

;; Version: 0.1.0
;; Package-Requires: ((emacs "27.1"))
;; Keywords: tools

(defvar mon-cron-tempo nil
  "Istante di avvio del cronometro, o nil se fermo.")

(defun mon-cron-avvia ()
  "Avvia o riavvia il cronometro globale."
  (interactive)
  (setq mon-cron-tempo (float-time)))

(provide 'mon-cron)
;;; mon-cron.el ends here
```

Tutti i simboli pubblici portano il prefisso del pacchetto, perché Emacs Lisp non ha moduli e lo spazio dei nomi è uno solo. Le funzioni interne usano due trattini (`mon-cron--elapsed`), convenzione che le segnala come non pubbliche.

| Elemento | Convenzione | Scopo |
| --- | --- | --- |
| file principale | `mon-cron.el` | entry point del pacchetto |
| intestazione | commenti `;;` in testa | parser di `package.el` |
| simboli globali | `mon-cron-` | evitare collisioni |
| funzioni interne | `mon-cron--` | segnalare API non pubblica |
| chiusura | `(provide 'mon-cron)` | registra il feature |
| `local` | `lexical-binding: t` | closure con scoping lessicale |

## Distribuzione e dipendenze

`package.el` gestisce installazione e aggiornamento da `package-archives`, con GNU ELPA attivo in modo predefinito e MELPA aggiunto a mano. Per un pacchetto personale è sufficiente una cartella su `load-path`; per pubblicarlo, MELPA costruisce i pacchetti dai repository dei sorgenti, GNU ELPA richiede il copyright assegnato alla FSF. Il caricamento pigro, con `autoload` o `use-package`, rimanda l'esecuzione del codice al primo uso: è così che un pacchetto grande non pesa sull'avvio dell'editor.

```elisp
;; configurazione di package.el per MELPA e GNU ELPA
(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/") t) ; archivio MELPA
(package-initialize)                 ; attiva i pacchetti installati

(unless package-archive-contents     ; aggiorna gli archivi se servono
  (package-refresh-contents))

(package-install 'use-package)       ; dipendenza esterna
```

La fase di byte compilation è dove i problemi emergono: `byte-compile-file` segnala funzioni non definite, variabili libere e argomenti non usati, e un pacchetto "pulito" non deve produrre warning. Il test di compilazione è parte della build, non un extra.

```bash
emacs -Q --batch -f batch-byte-compile mon-cron.el   # compila e mostra warning
emacs -Q --batch -L . -l mon-cron-tests.el -f ert-run-tests-batch-and-exit
emacs -Q --batch --eval '(package-install (quote use-package))'
```

## Testing con ERT e macro

`ert` è il framework di test incluso in Emacs: `ert-deftest` dichiara un test, `should` verifica un'asserzione e `ert-run-tests-batch-and-exit` restituisce un codice di uscita utilizzabile in CI. I test girano in batch mode con `emacs -Q`, cioè senza configurazione dell'utente, quindi devono caricare esplicitamente il pacchetto.

```elisp
;;; mon-cron-tests.el --- Test per mon-cron -*- lexical-binding: t; -*-

(require 'ert)
(require 'mon-cron)

(ert-deftest mon-cron-avvia-imposta-tempo ()
  "Avviare il cronometro deve impostare il campo."
  (let ((mon-cron-tempo nil))
    (mon-cron-avvia)
    (should (numberp mon-cron-tempo))))

(ert-deftest mon-cron-prefisso-nel-nome ()
  "I simboli pubblici devono usare il prefisso del pacchetto."
  (should (commandp #'mon-cron-avvia)))
```

Le macro sono il modo naturale per estendere la sintassi: `defmacro` riceve le forme non valutate e restituisce una forma da valutare. L'idioma di debug è `macroexpand-1` nella REPL, che mostra come il codice verrà realmente eseguito e rivela problemi di quoting prima ancora dell'esecuzione. Una macro ben scritta dichiara l'indentazione con `(declare (indent 1))` e produce codice con nomi generati da `gensym`, così il codice espanso non cattura variabili del chiamante.

```elisp
;; macro che genera un comando e ne usa il nome come messaggio
(defmacro mon-def-logger (nome)
  "Definisce un comando che stampa NOME."
  (declare (indent 1))
  `(defun ,nome () (interactive) (message "log: %s" ',nome)))

(mon-def-logger mon-cron-log)   ; espande in un defun con interactive
(macroexpand-1 '(mon-def-logger mon-cron-log)) ; ispezione in REPL
```

## Errori comuni

- **Omettere `lexical-binding: t`**: le closure usano binding dinamico e catturano la variabile sbagliata a runtime.
- **Definire simboli senza prefisso**: due pacchetti finiscono per sovrascriversi, e il conflitto è difficile da diagnosticare.
- **Ignorare i warning del byte compiler**: chiamate a funzioni inesistenti diventano errori solo quando il ramo viene eseguito.
- **Attivare `ert` all'avvio normale dell'editor**: il framework di test rallenta il bootstrap e non deve finire nel pacchetto distribuito.
- **Dipendere da MELPA senza dichiarare `Package-Requires`**: l'installazione su un utente senza quell'archivio configurato fallisce.

## In sintesi

Un pacchetto Emacs è un file con intestazione, prefisso dei simboli e `provide`, distribuito tramite `package.el` e i repository ELPA. La compilazione in batch è il primo controllo di qualità, ed `ert` fornisce test ripetibili in CI. Le macro estendono la sintassi e si ispezionano con `macroexpand`, mentre `lexical-binding` è la scelta obbligata per codice moderno.

## Fonti

- [Emacs Lisp Reference Manual sources – doc/lispref](https://github.com/emacs-mirror/emacs/tree/master/doc/lispref)
- [Emacs Mirror – doc/lispref/elisp.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/lispref/elisp.texi)
- [MELPA - MELPA.org](https://melpa.org/)
- [GNU ELPA - Pacchetti disponibili](https://elpa.gnu.org/packages/)
- [Emacs Mirror – doc/emacs/emacs.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/emacs/emacs.texi)
