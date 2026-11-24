Testare la cross-site scripting non significa cercare stringhe sospette: significa verificare che ogni punto in cui un dato entra nella pagina lo tratti come testo, qualunque cosa contenga. I test che restano nel tempo sono automatici: descrivono un comportamento atteso e falliscono quando qualcuno reintroduce un'assegnazione pericolosa. Qui costruisci una strategia di verifica e la applichi con sei esercizi su un ambiente tuo.

## Obiettivi

- Scrivere test che mappano ingressi e contesti di output invece di payload.
- Verificare lato server la codifica e le intestazioni delle risposte HTML.
- Verificare lato client che i dati non fidati restino testo.
- Usare un laboratorio locale per osservare il browser in sicurezza.

## Testare per contesti, non per payload

Il difetto più comune dei test di XSS è copiare una lista di stringhe offensive sperando che rappresenti la realtà: cambia di continuo e non descrive nulla del sistema. Un test difensivo parte dalla mappa dei punti di output e per ciascuno verifica una proprietà: il valore non deve modificare la struttura del documento.

Si testano i caratteri significativi per il contesto, come virgolette e parentesi angolari in un corpo HTML, e si verifica che restino codificati nella risposta oppure, lato client, che il nodo di testo contenga il valore originale. Si verificano anche i casi che generano errori: un banner di messaggio è un contesto di output.

Test di riflessione: ogni parametro che compare nella risposta ha un test che conferma la presenza codificata del valore. L'input non deve mai arrivare grezzo in una posizione strutturale.

| Livello | Che cosa verificare | Strumento |
| --- | --- | --- |
| Risposta server | caratteri codificati, intestazioni presenti | test HTTP, curl |
| Intestazioni | CSP effettiva, `nosniff`, `HttpOnly` | assert sulla risposta |
| DOM | valore di `textContent` dopo l'inserimento | test browser o jsdom |
| Configurazione | CSP senza `'unsafe-inline'` in produzione | test di configurazione |

## Il laboratorio locale

Un esercizio realistico richiede un bersaglio tuo: un'applicazione minima su `localhost` con un endpoint che pagina e uno che mostra un valore preso dalla URL basta per osservare la differenza tra output codificato e non codificato. Non serve un dominio esterno. L'esempio è didattico: serve a osservare la propria applicazione, non a costruire materiale da riusare altrove.

```js
import { createServer } from "node:http";

const codifica = (valore) =>
  String(valore).replace(/[&<>"']/g, (carattere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[carattere]);

createServer((richiesta, risposta) => {
  const nome = new URL(richiesta.url, "http://localhost").searchParams.get("nome") ?? "";
  risposta.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  risposta.end(`<!doctype html><p>Ciao ${codifica(nome)}</p>`);
}).listen(3000);
```

Avviando il server e richiedendo `/?nome=%3Cb%3Etest%3C/b%3E` la risposta deve contenere il valore codificato: il browser mostra il testo e non un elemento in grassetto. Sostituendo la codifica con una concatenazione diretta ottieni l'esempio del problema da correggere; il test automatico può verificare che la prima forma resti tale.

## Verifiche sul cliente

Sul lato client la verifica più efficace è comportamentale: si prepara un elemento, si chiama la funzione che deve mostrare il dato e si controlla che il DOM non contenga elementi aggiunti. Un test che confronta il numero di figli prima e dopo l'inserimento intercetta la maggior parte delle regressioni tra `textContent` e `innerHTML`.

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

test("il saluto resta testo", () => {
  const { document } = new JSDOM("<div id='saluto'></div>").window;
  const destinazione = document.querySelector("#saluto");
  const valore = "<img src=x onerror=alert(1)>";

  destinazione.textContent = valore;

  assert.equal(destinazione.children.length, 0);
  assert.equal(destinazione.textContent, valore);
});
```

Lo stesso principio vale per gli URL: un test che assegna uno schema diverso da `https:` deve verificare che venga rifiutato. Per i messaggi tra finestre il test deve verificare che il listener ignori dati da un'origine non prevista.

## Verifiche sulle intestazioni

Le intestazioni sono configurazione, quindi si testano come configurazione. Un test che interroga la home e le pagine secondarie, verificando `Content-Security-Policy` senza `'unsafe-inline'` e `X-Content-Type-Options: nosniff`, intercetta regressioni introdotte da un proxy o da un cambio di framework. Va ripetuto sugli endpoint che restituiscono HTML: è facile proteggere solo la pagina principale.

Una piccola scansione manuale durante i test integrati aiuta a vedere l'insieme:

```bash
curl -s -D - -o /dev/null http://localhost:3000/ | grep -Ei 'content-security|nosniff|set-cookie'
```

## Quando il test fallisce

Un test rosso è un regalo: indica un percorso che esiste ma non era mappato. Prima di correggere l'asserzione, capisci quale componente ha inserito il valore e in quale contesto. Spesso basta spostare il dato da un'API che interpreta a una che non interpreta.

## Esercizi

1. **Mappatura.** Prendi una tua applicazione locale e compila una tabella con ogni parametro o campo che compare in una pagina, il contesto e l'API usata per inserirlo. Evidenzia i punti non coperti da test.
2. **Server di prova.** Avvia un server locale come quello dell'esempio, con due rotte: una con codifica, una senza. Richiedile con un valore contenente parentesi angolari e osserva le risposte con `curl`.
3. **Test automatico server.** Scrivi un test che richieda la rotta codificata e verifichi la presenza delle entità al posto dei caratteri grezzi e la presenza della CSP.
4. **Test automatico DOM.** Scrivi un test con jsdom che inserisca un valore con parentesi angolari tramite la funzione dell'applicazione e verifichi che il numero di figli dell'elemento resti zero.
5. **URL.** Aggiungi una funzione che valida URL di destinazione accettando solo schemi `http` e `https`, e scrivi test per un valore accettato e per due rifiutati.
6. **Policy e report.** Aggiungi la policy in `Content-Security-Policy-Report-Only` con un endpoint di raccolta locale, carica la pagina e verifica che eventuali violazioni arrivino al tuo endpoint.

<details><summary>Soluzione</summary>

**Esercizio 1.** La mappa è il test più importante: per ogni riga, la codifica prevista deriva dal contesto. Se un campo finisce nel titolo di una pagina e nel corpo di un messaggio, servono due voci, non una.

**Esercizio 2.** Con un valore come `%3Cb%3E` la rotta codificata restituisce entità e la rotta non codificata restituisce i tag. Confronta con `curl http://localhost:3000/?nome=%3Cb%3Eprova%3C/b%3E`.

**Esercizio 3.** L'asserzione utile è duplice: il corpo non deve contenere la sequenza grezza e deve contenere l'entità corrispondente. Aggiungi il controllo dell'intestazione: una codifica corretta senza CSP lascia comunque un livello scoperto.

**Esercizio 4.** Il test deve chiamare la funzione reale dell'applicazione, non replicare la logica: la invoca e controlla `children.length` e `textContent`.

```js
const consentito = (valore) => {
  const url = new URL(valore, "https://esempio.test");
  return url.protocol === "http:" || url.protocol === "https:";
};
```

**Esercizio 5.** I test devono includere un valore relativo accettato, uno con schema diverso rifiutato e un valore malformato. `new URL` normalizza i valori relativi rispetto a una base: la base è parte della regola.

**Esercizio 6.** La modalità report-only non blocca, ma segnala. Verifica che il report arrivi e annota il tipo di violazione: un report vuoto con la pagina caricata correttamente è un buon segnale per passare al blocco.

</details>

## Errori comuni

- **Testare payload invece di contesti**: una lista di stringhe non dice se un nuovo punto di output è coperto, e cambia a ogni nuova tecnica.
- **Verificare solo la pagina principale**: pannelli amministrativi, pagine di errore e endpoint che restituiscono frammenti HTML hanno gli stessi rischi.
- **Asserzioni troppo tolleranti**: un test che cerca solo l'assenza di una stringa può passare con una codifica diversa ma comunque insicura nel contesto testato.
- **Testare su ambienti di terzi**: un test di sicurezza riutilizzabile su siti di altri non è un esercizio; usa localhost o un ambiente che controlli.

## In sintesi

Il test di XSS si organizza per contesti di output, non per payload. Lato server si verificano codifica e intestazioni, lato client che i dati restino testo. Un laboratorio su `localhost` basta per osservare e correggere. I test più preziosi falliscono alla ricomparsa di un'assegnazione pericolosa.

## Fonti

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger Web Security Academy – Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting)
- [MDN – Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
- [MDN – Content-Security-Policy: trusted-types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types)
