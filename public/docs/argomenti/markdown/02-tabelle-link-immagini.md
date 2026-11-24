Tabelle, link e immagini sono l'ossatura di una documentazione tecnica: una tabella confronta versioni, un link porta alla fonte, un'immagine mostra un diagramma. In Markdown la sintassi per farlo è minimale, ma ha regole precise (allineamenti, riferimenti, URL con parentesi) che determinano se il contenuto reso sarà corretto. In questa lezione scrivi tabelle e link che funzionano anche quando il file viene spostato o il titolo cambia.

## Obiettivi

- Scrivere tabelle GFM con allineamento corretto.
- Distinguere link inline, link di riferimento e link automatici.
- Usare immagini con testo alternativo, inclusi i path relativi.
- Evitare rotture di link quando si sposta un file.
- Capire come gestire anchor e URL con caratteri speciali.

## Tabelle

Le tabelle sono un'estensione GFM, non CommonMark: in un parser CommonMark puro il testo resta un paragrafo. La forma:

```markdown
| Servizio | Versione | Porta |
|----------|----------|-------|
| API      | 1.4.2    | 8080  |
| Web      | 2.1.0    | 3000  |
```

Regole:

- la seconda riga deve essere il **delimitatore** (trattini, eventualmente due punti per l'allineamento);
- le colonne sono separate da `|`, e una colonna in meno nella riga di intestazione o nei dati produce una tabella mal allineata;
- tutti i `|` dentro le celle sono interpretati come separatori: se il contenuto deve contenerne uno, vai a capo con gli escape `\|` o scrivilo come codice (in GFM i `|` dentro backtick funzionano).

Allineamento:

```markdown
| Sinistra | Centro | Destra |
|:---------|:------:|-------:|
| a        | b      | c      |
```

`:---` allinea a sinistra (predefinito), `:---:` al centro, `---:` a destra. L'allineamento è solo visivo: non ha effetto sul contenuto.

## Link inline

```markdown
[Specifica TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
```

La sintassi è `[testo](url "titolo opzionale")`. Se la URL contiene parentesi chiuse (comuni negli articoli di Wikipedia), le devi scrivere nel formato `<...>`:

```markdown
[Diagramma](<https://example.org/wiki/Funzione_(matematica)>)
```

Se la URL contiene spazi, il formato `<...>` è obbligatorio. Per gli indirizzi email si usa la forma `<autore@example.org>` oppure `[scrivi](mailto:autore@example.org)`.

## Link di riferimento

Quando la stessa URL viene ripetuta, o quando vuoi tenere il testo più pulito, usa i riferimenti:

```markdown
Leggi la [documentazione OpenSSL][openssl] e il [comando s_client][sclient].

[openssl]: https://docs.openssl.org/
[sclient]: https://docs.openssl.org/master/man1/openssl-s_client/
```

Le definizioni possono stare in fondo al documento o in un blocco separato. I nomi dei riferimenti sono case-insensitive e anche la forma più breve `[testo][]` o `[testo]` funziona quando il testo visibile coincide con il nome del riferimento.

## Link automatici e URL nude

In GFM (e in CommonMark 0.30+) un URL scritto nudo viene reso come link:

```markdown
Vedi https://spec.commonmark.org/
```

Per indirizzi che non sono URL (o per essere espliciti) usa il formato angolare:

```markdown
<https://spec.commonmark.org/0.31.2/>
```

In CommonMark base solo il formato angolare è un link automatico; gli URL nudi sono un'estensione GFM. Se il tuo renderer non è GitHub-like, non contare sugli URL nudi.

## Immagini

```markdown
![Diagramma del flusso di autenticazione](images/auth-flow.png "Flusso OAuth")
```

La sintassi è quella dei link con un `!` davanti; il testo tra parentesi quadre è l'**alt**, il testo alternativo mostrato se l'immagine non carica e letto dai lettori schermo. Il testo tra virgolette dopo la URL è il `title` (tooltip opzionale).

Buone pratiche:

- alt descrittivo, non "immagine" o "screenshot";
- preferisci formati che stanno nei repository (PNG, WebP) e dimensioni ragionevoli;
- metti le immagini in una cartella `images/` accanto al documento, così il path relativo resta chiaro;
- se l'immagine contiene testo, riporta l'informazione anche nel testo: chi usa uno screen reader non la vede.

HTML `<img>` funziona in molti renderer ma non ha la stessa semantica né la stessa portabilità: usa la sintassi Markdown quando puoi.

I path relativi sono la scelta giusta per la documentazione nel repository:

```markdown
- [Lezione successiva](02-tabelle-link-immagini.md)
- [Torna al catalogo](../../README.md)
- [Sezione](#tabelle)
```

Se sposti il file, ogni path va aggiornato: è la ragione per cui un link checker in CI non è un lusso. Gli anchor (`#sezione`) sono generati dai titoli: minuscole, spazi in trattini, punteggiatura rimossa, quindi "Errori comuni" diventa `#errori-comuni`. La trasformazione esatta dipende dal renderer: verificala sul sito.

## Path relativi e anchor

I link relativi sono la scelta giusta per la documentazione nel repository:

```markdown
- [Lezione successiva](02-tabelle-link-immagini.md)
- [Torna al catalogo](../../README.md)
- [Sezione](#tabelle)
```

- Un path come `02-....md` è relativo alla posizione del file: se sposti il file, il link si rompe salvo aggiornare il percorso;
- un link a un'altra pagina con anchor `[sezione](altra-pagina.md#nome-sezione)` funziona se il renderer genera gli id dai titoli;
- se un titolo ha caratteri speciali, rinominallo: gli id con punti esclamativi, apostrofi o emoji sono fragili da scrivere a mano.

## Esempio completo

```markdown
| Comando | Effetto | Piattaforma |
|:--------|:--------|:-------------|
| `curl -v` | mostra handshake e header | Linux, macOS, Windows |
| `openssl s_client` | ispeziona TLS | Linux, macOS, Windows |

Per i dettagli vedi la [documentazione di curl](https://curl.se/docs/) e il
[manuale di OpenSSL][openssl-client].

![Logo del progetto](images/logo.png "Logo")

[openssl-client]: https://docs.openssl.org/master/man1/openssl-s_client/
```

Nota i `curl` e `openssl s_client` tra backtick dentro la tabella: i comandi non diventano link né subiscono enfasi.

## Errori comuni

- **Colonne disallineate** che rendono la tabella illeggibile: allinea le `|` a mano.
- **Dimenticare la riga di delimitatori**: una tabella senza `|---|` non è una tabella.
- **`|` dentro una cella senza escape**: viene letta come separatore.
- **Link relativi usati in un sito** dopo uno spostamento dei file: il link non si aggiorna da solo.
- **Alt vuoto o generico**: peggiora accessibilità e SEO.
- **Contare sui URL nudi** in un renderer che non è GFM.
- **URL con parentesi senza `<...>`**: vengono troncati.

## In sintesi

Tabelle e link sono estensioni con sintassi precisa: la tabella vuole i delimitatori, i link vogliono parentesi bilanciate o `<...>`, le immagini vogliono un alt utile. In un repository i link relativi sono la norma, ma vanno verificati con un link checker quando i file si spostano (la lezione di laboratorio ti mostra come). Un alt ben scritto e un link alla fonte ufficiale sono la differenza tra una guida e un elenco di appunti.

## Fonti

- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [CommonMark Spec](https://spec.commonmark.org/)
