La codifica degli output elimina la causa di una cross-site scripting; la Content Security Policy e la sanificazione ne riducono l'impatto quando la causa sfugge. La prima limita ciò che il browser esegue, la seconda conserva una parte di markup eliminando ciò che può diventare codice. Impara a configurarle insieme, senza rompere l'applicazione e senza illusioni.

## Obiettivi

- Scrivere una policy adatta a un'applicazione reale, partendo da report-only.
- Capire nonce, hash, `strict-dynamic` e limiti di `'unsafe-inline'`.
- Scegliere e configurare un sanitizzatore per contenuti HTML ammessi.
- Valutare Trusted Types come difesa contro assegnazioni pericolose.

## La Content Security Policy

La Content Security Policy è un'intestazione HTTP che elenca da quali origini il browser può caricare risorse e in quali modi. Una policy di partenza blocca tutto per default e abilita solo ciò che serve:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
```

Il vantaggio è la semplicità: gli script del proprio dominio funzionano, quelli inline no. Gli script inline sono il bersaglio principale perché è così che si materializza un'iniezione. `object-src 'none'` chiude un canale storico di esecuzione, `base-uri 'none'` evita che un elemento base alteri la risoluzione degli URL relativi, `frame-ancestors` e `form-action` limitano altri abusi della pagina.

Per le applicazioni che dipendono da script inline serve un'autorizzazione esplicita: un **nonce** generato a ogni risposta nei tag fidati, oppure un **hash** del contenuto se lo script è statico. Il nonce va bene con HTML dinamico, purché non sia prevedibile e cambi a ogni risposta.

```http
Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'
```

Con `'strict-dynamic'` i browser moderni si fidano degli script con nonce, che possono crearne altri, ignorando gli host elencati; questi restano solo fallback per browser vecchi.

## Adozione senza rottura

Mai introdurre una policy rigida in produzione con un interruttore. Si parte in modalità di sola segnalazione con `Content-Security-Policy-Report-Only`, si raccolgono le violazioni e si corregge ciò che viene bloccato, indirizzando i report a un endpoint che li registra. Una policy va inoltre applicata a tutte le risposte HTML, non solo alla pagina principale: un pannello amministrativo senza intestazione è una superficie con le stesse debolezze.

| Fase | Intestazione | Obiettivo |
| --- | --- | --- |
| Osservazione | `Content-Security-Policy-Report-Only` | raccogliere violazioni reali |
| Restringimento | policy con nonce o hash | eliminare `'unsafe-inline'` |
| Applicazione | `Content-Security-Policy` | bloccare in produzione |
| Manutenzione | revisione dei report | controllare nuove dipendenze |

Le violazioni ripetute spesso indicano estensioni dei browser o codice di marketing di terzi, non un attacco. Distinguere queste categorie è parte del lavoro: un endpoint non triagiato diventa rumore, e il rumore porta a disattivare la policy. La fase di osservazione serve anche a stabilire con quali risultati si considera completata: nessuna violazione sul percorso principale e un numero accettabile altrove.

## Sanificare contenuti HTML

Quando l'applicazione deve conservare una parte di markup, per esempio nei commenti, la sanificazione è la scelta adatta. Un sanitizzatore analizza l'HTML e produce una versione con soli elementi e attributi ammessi, rimuovendo gestori di eventi, URL pericolosi e costrutti che porterebbero a esecuzione. Non è un filtro con espressioni regolari: deve comprendere la struttura del documento, perché le stesse sequenze cambiano significato in contesti diversi.

```js
// Esempio concettuale: la libreria deve essere aggiornata e configurata
// con una lista esplicita di elementi e attributi consentiti.
import DOMPurify from "dompurify";

const contenutoAmmesso = DOMPurify.sanitize(testoUtente, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "ul", "li", "a"],
  ALLOWED_ATTR: ["href", "title"],
});

destinazione.innerHTML = contenutoAmmesso;
```

La configurazione in lista bianca è il criterio centrale. Le stringhe costruite con sostituzioni manuali falliscono su casi di bordo, come virgolette non chiuse o attributi con nomi inattesi. Anche la sanificazione convive con la CSP: non la sostituisce, la completa.

Un'alternativa più solida è un formato intermedio: il client raccoglie testo puro o una struttura limitata, il server la serializza in HTML già controllato. Così il markup non arriva mai come stringa arbitraria.

## Trusted Types e rigore degli strumenti

Il controllo più diretto sulle API pericolose è Trusted Types: con `require-trusted-types-for 'script'` il browser rifiuta stringhe passate a `innerHTML` e API simili, accettando solo oggetti creati da una policy registrata. Un errore di revisione diventa così visibile nei test, ma serve migrare assegnazioni e librerie.

```js
// Registrazione di una policy: le stringhe non possono entrare direttamente
trustedTypes.createPolicy("sanitizza", {
  createHTML: (testo) => DOMPurify.sanitize(testo),
});
```

Gli strumenti di analisi statica trovano i punti da migrare, ma non conoscono il contesto: vanno letti con giudizio. La difesa in profondità funziona solo con un livello che misura: senza test, la CSP è un'intenzione.

## Errori comuni

- **Aggiungere `'unsafe-inline'` per far tornare il sito online**: annulla la protezione contro l'iniezione di script, che è esattamente la minaccia da affrontare.
- **Mettere la CSP solo sulle pagine principali**: una pagina amministrativa o un endpoint che restituisce HTML sono superfici uguali; l'intestazione va applicata a tutte le risposte HTML.
- **Sanificare con filtri manuali**: concatenare sostituzioni non è sanificazione; senza analisi della struttura del documento i casi di bordo sfuggono.
- **Dimenticare i report**: una policy in `report-only` senza endpoint o senza revisione dei report non protegge e non avvisa.

## In sintesi

CSP e sanificazione hanno ruoli distinti: la prima limita ciò che il browser esegue, la seconda ripulisce markup che deve sopravvivere. Una policy si adotta con nonce, hash e `strict-dynamic`, partendo da report-only e triagiando i report. I sanitizzatori vanno scelti con liste bianche e mantenuti aggiornati. Trusted Types aggiunge un controllo strutturale sulle API pericolose e rende gli errori visibili nei test.

## Fonti

- [MDN – Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [MDN – CSP: script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)
- [MDN – Content Security Policy (guida)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
