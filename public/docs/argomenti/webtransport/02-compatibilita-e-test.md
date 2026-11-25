WebTransport è implementato nei browser come libreria sperimentale e in draft: il codice si può già scrivere, ma prima di metterlo in produzione servono un feature check, un fallback WebSocket e un modo per misurare se la rete di destinazione lascia passare QUIC su UDP. Questa lezione mette le difese in fila: capability detection, negoziazione del subprotocollo, timeout e retry con jitter, metriche e degradazione controllata.

## Obiettivi

- Rilevare il supporto con `"WebTransport" in window` e con un tentativo di sessione breve.
- Progettare un fallback trasparente su WebSocket senza duplicare la logica applicativa.
- Gestire `WebTransportError`, i timeout e la riconnessione con backoff esponenziale e jitter.
- Misurare latenza, perdita di pacchetti e stato della sessione con `getStats()`.
- Impostare una policy CSP coerente con le richieste CONNECT di QUIC.

## Supporto e capability detection

La semplice presenza del costruttore non dice che la rete funziona: un proxy aziendale o un firewall che blocca UDP lascia passare il costruttore ma fallisce `ready`. La differenza si vede solo aprendo una sessione reale, quindi la detection deve essere un tentativo con timeout breve, non un controllo statico.

```javascript
async function supportoReale(url) {
  if (!("WebTransport" in window)) return false;
  const wt = new WebTransport(url);
  try {
    await Promise.race([
      wt.ready,
      new Promise((_, ko) => setTimeout(() => ko(new Error("timeout")), 2500)),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    wt.close();
  }
}
```

Per servizi reali conviene pubblicare la decisione dal server: un endpoint JSON che riporta la configurazione `webtransport` abilitata, l'URL dell'endpoint e il nome del subprotocollo, così un cambio di infrastruttura non richiede un deploy del frontend.

| Controllo | Affidabilità | Costo | Segnala |
| --- | --- | --- | --- |
| `"WebTransport" in window` | alta | nullo | costruttore esposto |
| `new WebTransport()` senza `ready` | media | nullo | API presente |
| `ready` con timeout | alta | un handshake | rete che lascia passare QUIC |
| `getStats()` dopo connessione | alta | basso | perdite e RTT reali |

## Fallback trasparente

Il modo più pulito è un'interfaccia comune con due implementazioni. Il codice applicativo vede solo `apriCanale(url)` che restituisce un oggetto con `invia(payload)`, `suMessaggio(cb)` e `chiudi()`. Il trasporto ad alta priorità usa datagram o stream unidirezionali; il fallback WebSocket serializza lo stesso payload in JSON o binario.

```javascript
export async function apriCanale(url, { subprotocollo }) {
  try {
    const wt = new WebTransport(url, { protocol: subprotocollo });
    await conTimeout(wt.ready, 2500);
    return canaleWebTransport(wt);
  } catch (e) {
    log("wt-fallback", { motivo: e.name });
    return canaleWebSocket(url);
  }
}
```

Due regole evitano sorprese. La prima è che il fallback deve essere raro e visibile: senza un contatore esposto, un'azienda può riconnettersi via WebSocket per mesi senza che nessuno intervenga sull'infrastruttura. La seconda è che la negoziazione del subprotocollo deve essere esplicita: se il server non conosce `gioco-v1`, è meglio fallire subito che ricevere dati di un formato diverso.

Il WebSocket fallback non ha datagram: per gli aggiornamenti frequenti bisogna accorpare, per esempio un frame ogni 50 ms con solo l'ultimo stato, e aggiungere un timestamp per scartare stati vecchi. Un'app che manda 60 posizioni al secondo su WebSocket funziona ma consuma banda e genera code che non si vedevano con QUIC, dove i datagram in stallo vengono scartati.

## Riconnessione, errori e metriche

`transport.closed` rigetta con un `WebTransportError` che ha `source`, `streamErrorCode` e un `message`. Distinguere "rete cambiata" da "server ha chiuso" evita di riconnettersi in loop contro un servizio in manutenzione: il codice `0` indica una chiusura senza errore, i codici di stream sopra 0 sono applicativi e vanno mappati nel contratto.

```javascript
wt.closed.catch((e) => {
  const app = e.name === "WebTransportError" && e.source === "stream";
  metrics.increment("wt.chiusa", { source: e.source, code: e.streamErrorCode });
  if (!app) riconnetti({ backoff: true }); // errore di sessione: nuova connessione
});
```

Il retry va fatto con backoff esponenziale e jitter perché una flotta di client che si riconnette simultaneamente dopo un deploy genera un picco di handshake. Un `setTimeout(base * 2 ** n * random(0.5, 1.5), cap)` con tetto di 30 secondi e contatore azzerato solo dopo una `ready` stabile per 30 secondi è un buon default.

```javascript
const stats = await wt.getStats();
// la struttura è un dato dell'esperimento: logga il JSON, non indicizzare chiavi
console.log(JSON.stringify(stats));
```

`getStats()` restituisce le statistiche QUIC della sessione, una struttura che cambia con il draft: leggerle in modo rigido è fragile. Più utili le metriche applicative: tempo da `new WebTransport` a `ready`, percentuale di tentativi falliti, RTT misurato con ping applicativi a 1 Hz e numero di riconnessioni per sessione.

| Sintomo | Causa probabile | Rimedio |
| --- | --- | --- |
| `ready` fallisce sempre in ufficio | UDP 443 bloccato | fallback e segnalazione all'infrastruttura |
| sessione chiusa a 10 minuti | idle timeout del server o proxy | ping applicativi o `keepAlive` |
| datagram ricevuti fuori ordine e vecchi | ritrasmissione applicativa non voluta | timestamp e scarto degli stati vecchi |
| stream fallisce dopo il primo byte | subprotocollo non concordato | negoziazione esplicita e validazione |
| CSP blocca la connessione | `connect-src` senza origine | aggiungere l'origine, non `*` |

## Errori comuni

- **Dichiarare supporto dal costruttore**: il costruttore esiste anche su reti che poi falliscono, quindi la detection deve tentare un handshake con timeout.
- **Fallback silenzioso**: senza metrica, la degradazione non viene mai rilevata.
- **Riconnettersi senza jitter**: dopo un incidente la riconnessione sincrona diventa un secondo incidente.
- **Interpretare `streamErrorCode` come codice HTTP**: lato server il codice di chiusura dello stream è un valore applicativo a 32 bit, lato client l'API espone le violazioni di protocollo con un errore diverso.
- **Ignorare `draining`**: il server che svuota la sessione chiude le connessioni una dopo l'altra, e chi non prevede una nuova sessione vede un drop improvviso.
- **CSP con `connect-src *`**: la richiesta CONNECT parte dall'origine della pagina, quindi va dichiarata solo l'origine dell'endpoint.

## In sintesi

Il supporto a WebTransport è una proprietà della rete oltre che del browser: si verifica con un handshake breve e si monitora con metriche. Un'interfaccia comune con fallback WebSocket tiene l'applicazione indipendente dal trasporto, purché il fallback sia misurato e visibile. La chiusura va distinta per fonte, la riconnessione va ritardata con jitter, e le statistiche vanno loggate piuttosto che interpretate in modo rigido.

## Fonti

- [MDN - WebTransport](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport)
- [MDN - WebTransport: getStats() method](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport/getStats)
- [Can I use - WebTransport](https://caniuse.com/webtransport)
- [W3C - WebTransport specification (Editor's Draft)](https://w3c.github.io/webtransport/)
