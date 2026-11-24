Markdown è un formato di testo pensato per essere leggibile sia come sorgente sia come pagina resa: si usa per README, documentazione, issue e commenti. Il suo comportamento è definito da una specifica aperta, CommonMark, che elimina le ambiguità storiche; GitHub ci aggiunge alcune estensioni (GFM) che sono ormai di uso quotidiano. In questa lezione parti dalla sintassi di base e arriviamo al punto in cui il testo che scrivi è esattamente quello che intendi.

## Obiettivi

- Scrivere titoli, paragrafi, enfasi, elenchi e citazioni secondo CommonMark.
- Capire le regole sui ritorni a capo e sui paragrafi.
- Distinguere CommonMark da GitHub Flavored Markdown.
- Riconoscere il punto in cui servono le virgolette di escape.
- Anticipare come un renderer diverso dal tuo mostrerà il testo.

## La specifica di riferimento

CommonMark è una specifica versionata (la 0.31.2 è la stabile più recente) con esempi normativi. Non esiste "il Markdown" univoco: esistono dialetti (CommonMark, GFM, Pandoc, kramdown) che condividono una base; quando un comportamento non è previsto da CommonMark, decide il renderer. GitHub ha poi pubblicato GFM, un **superset** di CommonMark con tabelle, barrato, task list e link automatici.

## Titoli

```markdown
# Titolo di pagina
## Sezione
### Sottosezione
```

Il livello va da 1 (H1) a 6 (H6). Il `#` deve essere seguito da uno spazio (o essere da solo). Un `#` attaccato al testo (`#hashtag`) non è un titolo in CommonMark.

In un documento, usa **un solo H1** e poi scendi in ordine: è la struttura che usano gli indici laterali e i lettori schermo. Il sito che stai leggendo ricava la navigazione dalle intestazioni, quindi saltare da H2 a H4 crea un indice confuso.

Esiste anche la forma Setext:

```markdown
Titolo di primo livello
=======================

Sottotitolo
-----------
```

Funziona, ma è meno diffusa e meno prevedibile nei renderer: evitala, a meno che il tuo tool la richieda.

## Paragrafi e ritorni a capo

Un paragrafo è un blocco di righe separate da una o più righe vuote. Per andare a capo dentro il paragrafo:

- lasci una riga vuota: nuovo paragrafo;
- metti **due spazi** alla fine della riga: `<br>` (hard line break);
- in GFM puoi anche usare un `\` finale, ma è un'eccezione rispetto a CommonMark base.

```markdown
Prima riga con due spazi finali  
seconda riga dello stesso paragrafo.

Nuovo paragrafo.
```

Due spazi finali sono invisibili nel sorgente: sono una delle cause più comuni di "perché non va a capo". Se il tuo editor li rimuove automaticamente (molti lo fanno), non contare su di loro: usa un nuovo paragrafo o un `<br>` esplicito.

## Enfasi

```markdown
*corsivo*, **grassetto**, ***corsivo e grassetto***
_corsivo con underscore_, __grassetto con underscore__
```

Regola di base: `*` e `_` funzionano ma devono delimitare con un confine riconoscibile. `snake_case_nome` non diventa corsivo per metà, ma `a_b_c` sì; quando hai identificatori con underscore, usa i backtick: `snake_case_nome`. Perfino `*` a metà elenco (per esempio in `2*3*4`) può essere interpretato come enfasi: se il testo è tecnico, i backtick sono la soluzione più affidabile.

In GFM `~~testo~~` è barrato. In CommonMark non esiste, ma la maggior parte dei renderer lo accetta.

## Elenchi

```markdown
- primo
- secondo
  - annidato (due spazi di indentazione)

1. primo
2. secondo
```

- Il trattino `-`, l'asterisco `*` e il più `+` sono equivalenti per le liste non ordinate;
- una riga vuota tra gli item rende la lista "spaziata", cambia solo l'aspetto;
- per un elenco numerato non hai bisogno di numerare in modo continuativo: `1.` su tutte le righe va bene, il renderer numera;
- La lista annidata deve essere indentata abbastanza da rientrare nel contenuto dell'item (due o più spazi, coerenti nella stessa lista). Un errore classico è indentare con un solo spazio una lista dentro l'item: può diventare una continuazione del paragrafo invece di una sottolista.

## Citazioni

```markdown
> Una citazione.
>
> Secondo paragrafo della citazione.
```

Si annidano con `>` ripetuto. Dentro una citazione puoi mettere liste, titoli e codice, ma serve il `>` anche su quelle righe. Le citazioni di più righe consecutive con un solo `>` diventano un unico paragrafo.

## Codice inline e blocchi

Con i backtick singoli il codice inline:

```markdown
Usa `npm install` e non `npm  install`.
```

Per contenuto che contiene un backtick, usa due o più backtick come delimitatori:

```markdown
Puoi scrivere `` ` `` così.
```

I blocchi di codice con tre backtick e linguaggio sono trattati nella lezione su code fence e GFM.

## Link

```markdown
[Documentazione CommonMark](https://spec.commonmark.org/)
```

`[testo](url)` con la URL tra parentesi. Se il testo contiene parentesi quadre annidate, le quadre vanno bilanciate; in caso di dubbio, quota con `\[`.

I link relativi sono supportati: `[Sicurezza](sicurezza.md)` punta al file accanto. Nella documentazione del repository sono la scelta giusta, perché il link funziona anche quando il portale è clonato in locale.

## HTML inline

CommonMark permette HTML inline:

```markdown
Testo con <kbd>Ctrl</kbd>+<kbd>S</kbd>.
```

Attenzione: la maggior parte dei siti disinfetta l'HTML (per sicurezza) e tag come `<details>` o gli script possono essere rimossi. In un portale di documentazione, non dare per scontato che l'HTML interno sia permesso: verifica sul renderer che usi.

## Errori comuni

- **Mancare lo spazio dopo `#`**: `#Titolo` non è un titolo.
- **Riga vuota mancante prima di una lista**: la lista viene incorporata nel paragrafo precedente.
- **Contare su due spazi finali** che l'editor rimuove.
- **Usare `_` intorno a identificatori**: `.env_file_name` diventa corsivo.
- **Mescolare dialetti** senza saperlo (`~~`, tabelle, footnotes non sono in CommonMark).
- **Indentazione della lista annidata incoerente**.

## In sintesi

CommonMark definisce titoli, paragrafi, enfasi, liste, citazioni e link in modo preciso. Le regole che contano davvero sono tre: spazio dopo il marcatore, riga vuota prima di un blocco, delimitatori coerenti. GFM aggiunge tabelle, barrato e task list, ma nulla di ciò che impari qui cambia. Se il rendering non è quello che ti aspetti, quasi sempre è un problema di riga vuota o di spazio mancante.

## Fonti

- [CommonMark Spec](https://spec.commonmark.org/0.31.2/)
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/)
