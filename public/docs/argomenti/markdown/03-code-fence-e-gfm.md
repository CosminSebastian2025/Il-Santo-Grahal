I blocchi di codice sono la parte più visibile di una documentazione tecnica: se il linguaggio non è dichiarato, l'evidenziazione sparisce; se il contenuto contiene backtick, il blocco può spezzarsi; se il file è reso senza GFM, task list e tabelle non esistono. In questa lezione lavori sui dettagli che distinguono una guida curata da una che "più o meno si legge": fence, linguaggio, escaping, HTML inline e buone pratiche di scrittura.

## Obiettivi

- Scrivere code fence con linguaggio e capire cosa cambia nel rendering.
- Gestire codice che contiene backtick, `~~~` o indentazione.
- Usare correttamente l'HTML inline senza rompere la sicurezza del sito.
- Riconoscere le estensioni GFM usate nella documentazione.
- Applicare un linter e regole editoriali coerenti.

## Code fence: la regola di base

Un blocco di codice inizia con tre backtick, la parola del linguaggio e un ritorno a capo, e finisce con tre backtick su una riga a sé:

````markdown
```bash
curl -sS https://example.com
```
````

Il nome del linguaggio è un **hint** per l'evidenziazione: la maggior parte dei renderer (highlight.js, Shiki, Prism) mappa nomi comuni. Resta su nomi diffusi:

| Linguaggio | Nome nel fence |
|:-----------|:---------------|
| Bash/Shell | `bash`, `sh`, `console` |
| YAML       | `yaml` |
| JSON       | `json` |
| JavaScript | `js` |
| Python     | `python` |
| Diff       | `diff` |
| Output senza linguaggio | `text` |

`console` è utile per sessioni con prompt e output insieme; `text` per output puri.

## Codice che contiene backtick

Se il contenuto contiene a sua volta un fence (tre backtick), il fence esterno deve usare più backtick:

````markdown
````markdown
```bash
echo "ciao"
```
````
````

Lo stesso vale per `~~~`, che è un delimitatore alternativo:

````markdown
~~~python
print("test")
~~~
````

Puoi usare `~~~` quando il contenuto è fatto di backtick, invece di "aumentare" il fence. Non mescolare i due delimitatori dentro lo stesso blocco.

## Escaping

- **Backslash** davanti a un carattere Markdown lo rende letterale: `\* non è corsivo`, `\# non è un titolo`, `\|` dentro una tabella.
- **Backtick inline** sono più affidabili per i caratteri Markdown che non sono codice: `` `*` ``.
- **HTML entities** (`&lt;`, `&gt;`, `&amp;`) sono la rete di sicurezza per `<` e `&`: un `<tag>` sconosciuto può sparire o essere sanificato.

## HTML inline: cosa apre e cosa chiude

CommonMark permette HTML inline, ma ogni piattaforma lo sanifica. `<details><summary>...</summary></details>` viene spesso permesso; `<script>`, `<iframe>` e gestori `onclick` no. Regola pratica:

- non usare HTML per la formattazione che Markdown copre già;
- `<kbd>` e `<sub>`/`<sup>` solo se il renderer li accetta;
- il testo dentro un blocco HTML su più righe può non essere più interpretato come Markdown: controlla sul renderer.

## Estensioni GFM utili nella documentazione

- **tabelle** (lezione precedente);
- **task list**:

  ```markdown
  - [x] handshake osservato
  - [ ] certificato rinnovato
  ```

- **barrato** `~~deprecato~~`;
- **link automatici** per URL e email;
- **menzione e issue**: solo sulle piattaforme che le interpretano, non in un sito generico;
- **footnote**: GFM non le include, e renderer come Markdown-it richiedono un plugin. Se le usi, verifica.

Il punto è che ogni estensione è un vincolo sul renderer: scrivi il documento sapendo dove verrà pubblicato, oppure usa solo un sottoinsieme comune per massima portabilità.

## Blocchi e indentazione

CommonMark accetta anche blocchi di codice indentati con quattro spazi, ma la forma è fragile: se un editor "aggiusta" l'indentazione o il blocco sta dentro una lista, il risultato cambia. Nella documentazione moderna usa sempre i fence, indentati come l'item quando sono dentro un elenco:

````markdown
- Fai questo:
  ```bash
  make deploy
  ```
````

## Buone pratiche editoriali

- Un concetto per blocco: comandi correlati insieme, lingue diverse separate.
- Includi l'**output** come blocco `text` solo se è breve e significativo; non incollare 100 righe di log.
- Ogni comando va spiegato prima o dopo, non solo incollato.
- Distingui esplicitamente Linux/macOS da Windows quando cambia il comando.
- Non mettere segreti nei blocchi: anche gli esempi "finti" vengono copiati e incollati.
- La barra dei percorsi: `/etc/nginx/nginx.conf` su Linux, `C:\nginx\nginx.conf` su Windows; evita di mescolarli nello stesso esempio senza dirlo.

## Lint e coerenza

Per controllare il Markdown in un repository usa `markdownlint` (CLI `markdownlint-cli2`, oppure l'estensione dell'editor). Segnala, tra le altre cose:

- titoli non incrementali (H1 → H3);
- spazi finali;
- righe troppo lunghe (configurabile);
- liste con indentazione incoerente;
- link o immagini senza descrizione (a seconda delle regole abilitate);
- fence senza linguaggio.

Configurazione minima `.markdownlint.json`:

```json
{
  "MD013": { "line_length": 120 },
  "MD033": false,
  "MD041": false
}
```

Qui `MD013` regola la lunghezza delle righe, `MD033` disattiva il divieto di HTML inline, `MD041` consente di non iniziare il file con un H1 (utile quando l'H1 lo fornisce il sito).

## Errori comuni

- **Fence senza linguaggio**: niente evidenziazione e nessun hint per chi legge.
- **Fence chiuso con un numero diverso di backtick**: il blocco "mangia" il testo successivo.
- **Codice dentro un fence con indentazione uguale all'elenco esterno**: il blocco si interrompe.
- **`<` e `>` non escaped fuori dal codice**: il testo può sparire come tag HTML.
- **Contare su `<details>` o sui task list** in un renderer che non li supporta.
- **Mescolare output e comandi nello stesso blocco senza distinguerli**.

## In sintesi

Un buon code fence ha tre caratteristiche: linguaggio dichiarato, delimitatori coerenti, contenuto che non si spezza. HTML inline ed estensioni GFM vanno usati solo se il renderer li accetta davvero. Il linter non sostituisce la revisione umana, ma blocca in CI gli errori più banali: titoli, spazi, link e blocchi.

## Fonti

- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
- [CommonMark Spec – Fenced code blocks](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)
