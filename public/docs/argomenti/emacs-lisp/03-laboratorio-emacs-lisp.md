In questo laboratorio costruisci `mon-log`, un modo minore di Emacs che registra ogni modifica a un buffer in un file di log con timestamp, e un comando che mostra le voci. È un pacchetto piccolo ma completo: hook, stato buffer-local, I/O su file, comandi interattivi e test con `ert`. Serve a esercitare i punti in cui un'estensione Emacs fallisce: stato che non si resetta e test legati all'ambiente dell'utente.

## Obiettivi

- Definire un modo minore con stato buffer-local e funzioni di attivazione.
- Collegarsi a un hook del testo e registrare i cambiamenti su file.
- Proteggere le operazioni su disco da errori di percorso e permessi.
- Scrivere test con `ert` che isolano buffer, file e variabili.
- Verificare il pacchetto con byte compilation e batch mode.

## Il contratto di `mon-log`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| comando | `mon-log-mode` | attiva e disattiva il logging |
| stato | `mon-log--attivo`, buffer-local | ogni buffer registra a parte |
| file | `mon-log-file`, default in `user-emacs-directory` | percorso configurabile |
| evento | modifica dopo `after-change-functions` | registra il punto e la lunghezza |
| comando | `mon-log-mostra` | voci del log in un buffer nuovo |
| errore su disco | messaggio e stato invariato | nessun arresto dell'editor |

Il log non deve mai interrompere la digitazione: se il file non è scrivibile, l'estensione segnala il problema con `message` e continua. Tutto il codice vive in un file `mon-log.el` con `lexical-binding: t`, e i simboli interni usano il doppio trattino.

```elisp
;;; mon-log.el --- Log delle modifiche per buffer -*- lexical-binding: t; -*-

;; Version: 0.1.0
;; Package-Requires: ((emacs "27.1"))

(defgroup mon-log nil
  "Registrazione delle modifiche ai buffer."
  :group 'tools)

(defcustom mon-log-file
  (expand-file-name "mon-log.log" user-emacs-directory)
  "Percorso del file di log."
  :type 'file)
```

## Core: hook, stato e scrittura

Un modo minore è una variabile di stato più un insieme di hook: `define-minor-mode` genera la variabile, il comando di attivazione e la riga della modalità. Lo stato deve essere buffer-local, altrimenti attivare il modo in un buffer lo attiva ovunque. La funzione chiamata da `after-change-functions` deve essere veloce e non spostare il punto.

```elisp
(defvar-local mon-log--attivo nil
  "Non-nil se il buffer corrente sta registrando.")

(defun mon-log--registra (_inizio _fine _lunghezza)
  "Scrive una riga nel log per la modifica corrente."
  (when mon-log--attivo
    (let ((riga (format-time-string "%Y-%m-%d %H:%M:%S"))
          (nome (buffer-name))
          (pos (point)))
      (with-current-buffer (get-buffer-create " *mon-log*") ; buffer nascosto
        (goto-char (point-max))
        (insert (format "%s %s %d\n" riga nome pos)))
      ;; scrittura append: il file non viene riscritto per intero
      (condition-case err
          (append-to-file (concat riga " " nome "\n") nil mon-log-file)
        (file-error (message "mon-log: scrittura fallita: %s" err))))))

(define-minor-mode mon-log-mode
  "Registra le modifiche del buffer in mon-log-file."
  :lighter " log"
  (setq mon-log--attivo mon-log-mode)
  (if mon-log-mode
      (add-hook 'after-change-functions #'mon-log--registra nil t) ; locale
    (remove-hook 'after-change-functions #'mon-log--registra t))) ; t = locale
```

Le due scritture mostrano la differenza tra stato dell'editor e persistenza: il buffer nascosto serve a `mon-log-mostra`, il file a rileggere le tracce dopo un riavvio. `condition-case` con `file-error` intercetta solo gli errori di I/O, lasciando passare gli altri per il debug.

## Comandi, isolamento e test

Il comando di lettura apre un buffer in `special-mode` copiando il testo dal buffer nascosto, così evita problemi di permessi e resta testabile. I test devono creare un file temporaneo, impostare `mon-log-file` con `let` e disattivare il modo alla fine, senza lasciare stato ai test successivi.

```elisp
(defun mon-log-mostra ()
  "Mostra le ultime voci del log in un buffer nuovo."
  (interactive)
  (let ((sorgente (get-buffer " *mon-log*")))
    (with-current-buffer (get-buffer-create "*mon-log*")
      (let ((inhibit-read-only t)) ; il buffer e in sola lettura
        (erase-buffer)
        (when sorgente
          (insert-buffer-substring-no-properties sorgente))) ; copia senza stato
      (goto-char (point-max))
      (special-mode))))

;;; mon-log-tests.el --- Test per mon-log -*- lexical-binding: t; -*-

(require 'ert)
(require 'mon-log)

(ert-deftest mon-log-mode-imposta-stato-local ()
  "Attivare il modo deve segnare solo il buffer corrente."
  (with-temp-buffer
    (let ((mon-log--attivo nil))
      (mon-log-mode 1)
      (should mon-log--attivo)
      (mon-log-mode -1)
      (should-not mon-log--attivo))))

(ert-deftest mon-log-scrive-su-file-temporaneo ()
  "Una modifica deve produrre almeno una riga nel file."
  (let ((mon-log-file (make-temp-file "mon-log")))
    (unwind-protect
        (progn
          (with-temp-buffer
            (mon-log-mode 1)
            (insert "ciao")
            (mon-log-mode -1))
          (should (> (file-attribute-size (file-attributes mon-log-file)) 0)))
      (delete-file mon-log-file))))
```

`make-temp-file` e `unwind-protect` garantiscono che anche un test fallito ripulisca il disco. L'esecuzione in batch è la stessa degli altri pacchetti, con `-l` esplicito.

```bash
emacs -Q --batch --eval '(byte-compile-file "mon-log.el")'
emacs -Q --batch -L . -l mon-log.el -l mon-log-tests.el -f ert-run-tests-batch-and-exit
emacs -Q --batch --eval '(with-temp-buffer (insert "x") (mon-log-mode 1))'
```

## Esercizi

1. Aggiungi `mon-log-elenco` che chiama `mon-log--registra` manualmente, utile per non attendere la digitazione.
2. Limita il file a N righe con una variabile `mon-log-maxi-righe` e una rotazione semplice.
3. Salva nel log anche il nome del file visitato, non solo il nome del buffer.
4. Disattiva il modo quando il buffer viene ucciso, con `kill-buffer-hook` e una funzione di pulizia.
5. Scrivi un test che verifica il caso di percorso non scrivibile e che l'attivazione non lanci un errore.
6. Sostituisci `append-to-file` con un buffer visitato dal log e confronta i tempi su 1000 modifiche.

<details>
<summary>Soluzione</summary>

1. `mon-log-elenco` è una funzione `interactive` che chiama `(mon-log--registra nil nil nil)`: funziona senza una modifica reale e serve a verificare il percorso di scrittura.

2. Prima di scrivere, la funzione conta le righe nel buffer nascosto e, oltre la soglia, riscrive il file con la sola parte finale.

3. `(buffer-file-name)` restituisce il percorso o `nil`: la riga del log usa il percorso quando presente e il nome del buffer altrimenti.

4. `kill-buffer-hook` chiama una funzione che fa `(setq mon-log--attivo nil)` e rimuove l'hook locale con `remove-hook` e argomento `t`: il buffer muore con lo stato coerente e senza hook residui.

5. Con `let` si imposta `mon-log-file` su un percorso inesistente e si esegue una modifica dentro `with-temp-buffer`: il test passa se non viene sollevato un errore e se il messaggio atteso viene emesso.

6. `append-to-file` apre e chiude il file a ogni evento, mentre un buffer visitato accumula in memoria: su 1000 modifiche il secondo è molto più rapido, ma perde le righe se Emacs termina in modo brusco.

</details>

## Errori comuni

- **Definire lo stato con `defvar` invece di `defvar-local`**: attivare il modo in un buffer lo attiva di fatto in tutti, perché la variabile è globale.
- **Spostare il punto nella funzione di hook**: `after-change-functions` viene chiamato durante la digitazione, e un movimento del cursore rompe l'editing.
- **Scrivere sul file a ogni carattere**: il disco diventa il collo di bottiglia e l'editor lagga; serve accumulo nel buffer.
- **Test che modificano `mon-log-file` senza `let`**: il valore resta cambiato e i test successivi usano un percorso inesistente.
- **Lasciare eccezioni non gestite in `condition-case`**: un errore di percorso nell'hook interrompe la digitazione.

## In sintesi

Un modo minore si costruisce con stato buffer-local, un comando generato da `define-minor-mode` e hook locali. Le funzioni chiamate durante l'editing devono essere brevi e mai spostare il punto, e ogni I/O va protetto con `condition-case`. I test con `ert` isolano buffer e file, e la byte compilation in batch è il primo controllo di qualità.

## Fonti

- [Emacs Lisp Reference Manual sources – doc/lispref](https://github.com/emacs-mirror/emacs/tree/master/doc/lispref)
- [Emacs Mirror – doc/lispref/elisp.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/lispref/elisp.texi)
- [Emacs Mirror – doc/emacs/emacs.texi](https://github.com/emacs-mirror/emacs/blob/master/doc/emacs/emacs.texi)
- [MELPA - MELPA.org](https://melpa.org/)
