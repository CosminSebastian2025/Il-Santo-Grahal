Sapere la sintassi Markdown non basta: una guida utile ha una struttura prevedibile, link che funzionano, blocchi di codice leggibili e un controllo automatico che intercetta gli errori prima dei lettori. In questo laboratorio componi una guida pubblicabile, la passi a lint e link check e la verifichi nel renderer di destinazione, con una soluzione commentata alla fine.

## Obiettivi

- Progettare la struttura di una guida breve prima di scriverla.
- Applicare titoli, tabelle, link e code fence in modo coerente.
- Eseguire un lint Markdown e correggere senza riscrivere il documento.
- Verificare link relativi e anchor con uno script e con `lychee`.
- Pubblicare la guida e controllarla nel renderer che la mostrerà.

## Preparazione

Crea una cartella di lavoro con un file `guida.md` e una sotto-cartella per le immagini:

```bash
mkdir -p md-lab/images && cd md-lab
```

Ti servono: un editor, un runtime Node (`npx markdownlint-cli2`) e, quando lo installerai, `lychee` (binario da GitHub Releases o Homebrew). Su Windows gli stessi comandi funzionano in Git Bash o PowerShell.

## Esercizi

### 1. Struttura prima del testo

Scrivi in `guida.md` una guida di 600 parole sull'argomento che preferisci (per esempio "come validare un file YAML") con questa struttura: introduzione di 2-3 frasi, sezioni `## Obiettivi`, `## Procedura`, `## Verifica`, `## Errori comuni`, `## In sintesi`, `## Fonti`.

Vincoli: nessun H1 se il sito aggiunge già il titolo, nessun salto di livello (H2 → H3 → H4), un blocco `bash` per ogni comando.

### 2. Tabelle e link verificabili

Aggiungi una tabella con allineamento esplicito e almeno un link a una fonte ufficiale. Descrizione obbligatoria del link: niente "clicca qui". Esempio:

```markdown
| Strumento | Controlla | Comando |
|:----------|:----------|:--------|
| yamllint | forma e stile | `yamllint file.yaml` |
| schema | chiavi ammesse | `check-jsonschema --schemafile s.json file.yaml` |
```

### 3. Indice e anchor

Inserisci un indice all'inizio con link alle sezioni (`[Procedura](#procedura)`, `[Errori comuni](#errori-comuni)`). Cerca poi di rompere il documento di proposito: crea un link a `[Sezione inesistente](#non-esiste)` e verifica che il controllo del punto 5 lo segnali.

### 4. Lint

Esegui il lint sulla cartella:

```bash
npx markdownlint-cli2 "**/*.md"
```

Output tipico su un file appena scritto:

```text
guida.md:12:81 MD013/line-length Line length [Expected: 80; Actual: 112]
guida.md:27 MD040/fenced-code-language Fenced code blocks should have a language specified
```

Correggi almeno tre segnalazioni **senza** disattivare le regole. Se una regola non ha senso nel tuo progetto, documenta l'eccezione in `.markdownlint.json`, per esempio alzando il limite delle righe:

```json
{
  "MD013": { "line_length": 120 }
}
```

Rilancia il comando finché non termina con successo.

### 5. Link check degli interni

Scrivi `check-links.sh`, che verifica che ogni link relativo a un file `.md` esista davvero:

```bash
#!/usr/bin/env bash
set -euo pipefail

missing=0
while IFS= read -r link; do
  target="${link%%#*}"
  [[ -z "$target" ]] && continue
  [[ "$target" =~ ^https?:// ]] && continue
  [[ -f "$target" ]] || { echo "MANCANTE: $link"; missing=1; }
done < <(grep -oE '\]\([^)]+\)' guida.md | sed -E 's/^\]\(|\)$//g')

exit "$missing"
```

```bash
chmod +x check-links.sh
./check-links.sh
```

Rimuovi il link rotto solo dopo aver visto lo script segnalarlo con `MANCANTE: ...` ed `exit` diverso da `0`.

### 6. Verifica nel renderer e pubblicazione

Apri `guida.md` nel renderer reale (GitHub, il sito statico, la piattaforma della documentazione) e controlla:

- i titoli compaiono nell'indice con la gerarchia giusta;
- le tabelle non traboccano su schermo stretto;
- i blocchi hanno il linguaggio e non vengono interpretati come HTML;
- i link relativi funzionano dalla posizione reale del file;
- le immagini hanno un alt utile.

Poi copia il file nella posizione definitiva (per esempio `public/docs/argomenti/...`) e rilancia il link check: è il passaggio che scopre i path rotti dopo lo spostamento.

## Soluzione commentata

Una guida minima che passa tutti i controlli:

```markdown
Come verificare un file YAML prima di usarlo in produzione: forma, struttura e
variabili. Tre controlli coprono la maggior parte degli errori.

## Obiettivi

- Eseguire il lint, validare lo schema e interpolare le variabili.

## Procedura

```bash
yamllint compose.yaml
check-jsonschema --schemafile compose-spec.json compose.yaml
docker compose config -q
```

## Errori comuni

- Indentazione con tab: il parser fallisce subito.

## In sintesi

Lint, schema e config scoprono classi di errore diverse.

## Fonti

- [yamllint](https://yamllint.readthedocs.io/en/stable/)
```

Commento ai punti delicati:

- il paragrafo iniziale evita l'H1 perché il titolo è fornito dal catalogo;
- ogni comando ha il fence `bash`, quindi `MD040` non scatta;
- manca l'indice con anchor: aggiungilo con `## Indice` e link `#obiettivi`, `#procedura`, `#errori-comuni`, `#in-sintesi`, `#fonti`;
- il link alla fonte usa testo descrittivo, non "qui".

Per l'alternativa con uno strumento maturo, `lychee --offline --include-fragments guida.md` controlla anche gli anchor; in CI aggiungi entrambi i comandi dopo il lint.

## Errori comuni

- **Doppio H1**: il sito aggiunge il titolo e il file ne contiene un altro. Scegli una sola fonte.
- **Fence annidati chiusi male**: per mostrare un blocco che contiene triple backtick serve un fence esterno di quattro backtick.
- **Link relativi sbagliati**: da `docs/guide/`, `../api.md` non è `api.md`; lo scopre il link check, non il lettore.
- **Tabella senza riga di delimitatori**: la tabella resta un paragrafo.
- **Lint ignorato** "perché tanto è solo documentazione": gli errori di struttura si accumulano fino a rendere la guida inutilizzabile.

## In sintesi

Il laboratorio riduce la pubblicazione a cinque passi: struttura, contenuti con link descrittivi, indice con anchor, lint, link check. La revisione nel renderer reale resta indispensabile, ma il controllo automatico intercetta la maggior parte dei difetti prima che arrivino ai lettori.

## Fonti

- [CommonMark Spec](https://spec.commonmark.org/)
- [GitHub – Writing on GitHub](https://docs.github.com/en/get-started/writing-on-github)
- [markdownlint](https://github.com/DavidAnson/markdownlint)
- [lychee link checker](https://github.com/lycheeverse/lychee)
