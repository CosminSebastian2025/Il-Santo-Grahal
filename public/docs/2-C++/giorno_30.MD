# Giorno 30: Revisione e prossimi passi

**Obiettivo:** ripassare il percorso, migliorare il codice e scegliere cosa fare dopo.

### Il ripasso del mese

In 30 giorni avete imparato:

| Area | Argomenti |
| --- | --- |
| Fondamenti | compilazione, variabili, tipi, input/output, operatori, condizioni, cicli |
| Funzioni e dati | funzioni, scope, vector, stringhe, struct, vector di struct |
| Classi e memoria | classi, costruttori, incapsulamento, riferimenti, puntatori, RAII, smart pointer |
| Strumenti | mappe, algoritmi STL, lambda, eccezioni, file, warning e debug |

Il progetto della rubrica li usa quasi tutti: struct, vector, funzioni, menu, algoritmi, file e gestione degli errori.

### Refactoring

**Refactoring** significa migliorare la struttura del codice senza cambiarne il comportamento. Alcune domande da farsi:

- Il `main` è troppo lungo? Spostate i blocchi in funzioni.
- Ci sono nomi poco chiari? Rinominateli: `c`, `x`, `temp` non spiegano nulla.
- Ci sono pezzi di codice ripetuti? Estraeteli in una funzione.
- Ci sono variabili dichiarate ma non usate? Eliminatele.
- Le funzioni fanno più di una cosa? Dividetele.
- Ci sono numeri "magici" (per esempio `8` nel menu)? Usate costanti con un nome.

Un esempio di costante utile:

```cpp
const int SCELTA_ESCI = 8;

while (scelta != SCELTA_ESCI) {
    // ...
}
```

### Codice pulito

Alcune abitudini che fanno la differenza:

- Indentate sempre il codice in modo uniforme.
- Lasciate una riga vuota tra funzioni diverse.
- Scrivete nomi in italiano o in inglese, ma siate coerenti.
- Evitate commenti che ripetono il codice; spiegate il **perché**, non il **cosa**.
- Compilate con `-Wall -Wextra` e correggete tutti i warning.
- Fate commit frequenti se usate git.

### Test manuale

Prima di considerare finito un programma provate:

- il caso normale (aggiungere, cercare, salvare);
- i casi limite (rubrica vuota, file mancante, ricerca senza risultati);
- input sbagliati (lettere al posto dei numeri, scelte fuori menu);
- più esecuzioni consecutive (salvataggio e caricamento).

Scrivete su un foglio i passi da provare. Un programma che funziona solo con l'input perfetto non è finito.

### Il prossimo passo

Scegliete **un** progetto e portatelo a termine:

1. **Rubrica evoluta**: aggiungete email, categoria, modifica di un contatto.
2. **Gestione voti**: materie, voti, media, massimo e minimo, salvataggio su file.
3. **TO-DO list**: attività con stato completato, ricerca e ordinamento.
4. **Quiz**: domande a risposta multipla, punteggio e file dei risultati.
5. **Magazzino**: prodotti con quantità e prezzo, totale e riordino.

Per ognuno partite da una lista di funzionalità scritte, poi implementate una funzione alla volta.

### Verso il livello intermedio

I prossimi argomenti da studiare, in ordine ragionevole:

- ereditarietà e polimorfismo;
- `std::optional`, `std::variant`, `std::string_view` (C++17);
- template e programmazione generica;
- gestione delle eccezioni più avanzata;
- test automatici;
- CMake e organizzazione in più file;
- debugger e strumenti di analisi.

Non serve correre: un progetto piccolo portato a termine insegna più di dieci tutorial letti di fretta.

## Micro-esercizio

Scegliete uno dei due percorsi:

1. Migliorate la rubrica: aggiungete la modifica di un contatto, la conferma prima della cancellazione e il caricamento automatico del file all'avvio.
2. Iniziate un nuovo progetto personale dalla lista, partendo da struct, vector e menu.

In entrambi i casi scrivete prima le funzionalità, poi compilate con `-Wall -Wextra` e provate tutti i casi limite.

### Checklist finale

- [ ] Il programma compila senza warning.
- [ ] Il menu gestisce le scelte non valide.
- [ ] I dati si salvano e si ricaricano correttamente.
- [ ] I casi limite non fanno crashare il programma.
- [ ] I nomi delle funzioni spiegano cosa fanno.
- [ ] Il `main` è corto e leggibile.
