# Introduzione al C#

Il C# (si legge "C sharp") è un linguaggio di programmazione moderno creato da Microsoft e basato sulla piattaforma **.NET**. È compilato, fortemente tipizzato e gestisce la memoria automaticamente: non dovrai preoccuparti di `malloc` e `free` come in C, ma solo di scrivere codice chiaro.

Con il C# si costruiscono applicazioni desktop, servizi web, giochi con Unity, app mobile e strumenti da riga di comando. È un ottimo linguaggio per imparare la programmazione a oggetti, perché è stato progettato proprio per questo.

### Obiettivo del percorso

In 12 settimane imparerai a scrivere programmi completi:

- variabili, input/output, operatori, condizioni e cicli;
- metodi, collezioni e manipolazione di testo;
- classi, oggetti, proprietà, eredità, interfacce e polimorfismo;
- eccezioni, file, CSV, JSON, `Dictionary` e LINQ;
- generics, delegates, eventi, lambda, `async`/`await` e chiamate HTTP;
- test, debug, refactoring e organizzazione del codice.

Alla fine costruirai una **rubrica contatti** completa, con salvataggio su file JSON e test automatici.

### Il metodo

- Studia **30-60 minuti al giorno**.
- Scrivi sempre il codice: leggere non basta.
- Fai gli esercizi in ordine: ogni settimana parte da quelli appena spiegati.
- Se un esercizio ti blocca, riducilo: prima fai funzionare un caso semplice, poi aggiungi i dettagli.
- Leggi i messaggi di errore con calma: indicano sempre file e riga.

### Come è organizzato il corso

| Settimane | Argomenti |
| --- | --- |
| 1-2 | Basi assolute: variabili, input/output, operatori, condizioni, cicli |
| 3-4 | Metodi, array, liste, stringhe, ricerca e manipolazione dei dati |
| 5-6 | Programmazione orientata agli oggetti: classi, proprietà, costruttori, eredità, interfacce, polimorfismo |
| 7-8 | Dati e file: eccezioni, file, CSV, JSON, `Dictionary`, LINQ |
| 9-10 | C# moderno: generics, delegates, eventi, lambda, `async`/`await`, HTTP |
| 11-12 | Qualità e progetto finale: testing, debugging, refactoring, organizzazione |

Ogni settimana trovi una lezione con esempi, errori comuni ed **esercizi progressivi**. Gli esercizi sono cumulativi: quelli delle settimane precedenti tornano come ripasso.

### Gli strumenti

Serve il **.NET SDK** (versione 8 o superiore), disponibile per Windows, macOS e Linux su [dotnet.microsoft.com](https://dotnet.microsoft.com/download).

Controlla l'installazione:

```bash
dotnet --version
```

Crea un progetto console ed eseguilo:

```bash
dotnet new console -o CorsoCSharp
cd CorsoCSharp
dotnet run
```

Come editor puoi usare **Visual Studio Code** con l'estensione C# Dev Kit, oppure **Visual Studio** / **Rider**.

### Due convenzioni del corso

1. Useremo i **top-level statements**: il codice di `Program.cs` viene eseguito direttamente, senza scrivere a mano `class Program` e `Main`. Dalla settimana 3 vedrai come si definiscono i metodi `static` e dalla settimana 5 le classi complete.
2. I nomi di classi e metodi seguiranno la convenzione C#: `PascalCase` per classi, metodi e proprietà, `camelCase` per variabili e parametri (es. `CalcolaMedia`, `numeroStudenti`).

### Come usare gli esercizi

Gli esercizi sono divisi per argomento e diventano via via più completi. Non copiare la soluzione: prova, sbaglia, correggi. Se un programma non compila, il messaggio di errore è la prima cosa da leggere.

Nella prima settimana scriverai i primi programmi: variabili, stampa a schermo e calcoli.
