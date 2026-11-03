#  Variabili e tipi

### Cosa sono le variabili?

Le variabili sono delle parole che vengono create all'interno del programma per memorizzare e restituire dati che sono stati elaborati dalla macchina all'utente

> **Inizializzare**: vuol dire nel termine informatico creare una parola che conterrà un certo tipo di informazioni all'interno di una variabile

### Architettura
```mermaid
flowchart LR
A[informazioni] --> B[Variabile]

C[Variabile] --> D[Informazioni]
```
Questo schema dimostra il flusso che deve fare il programma o la macchina per fare inserire e stampare e le informazioni da terminale all'utente.

### Cosa sono tipi? Quanti c'è ne sono?

Peer rispondere alla domanda vi verrà visualizzato il seguente schema 

```mermaid
flowchart TB

A[Tipi] --> B[Int]
A --> C[float]
A --> D[Doule]
A --> E[Char]
```

Vediamo uno per uno:
- **Int**: numeri interi senza virgola
- **float**: numeri con la virgola o chiamati anche numeri decimali
- **double**: numeri con 2 numeri dopo la virgola
- **char**: considera solo i caratteri come A, B, C, D, ecc...

### Esempi chiari di come inizializzare i tipi e le variabili

```file.c
int miaVariabile;
```

>[!NOTE]
> Quando si inizia a programmare in un file C bisogna sempre mettere un punto e virgola alla fine di ogni riga perchè altrimenti il compilatore vi dà errore di battitura del file.

Ecco come si dichiara una variabile e immaganizzare informazioni non solo in C ma anche negli altri linguaggi di programmazione.

- la prima cosa da fare e dichiarare il tipo di variabile che si vuole acquisire da terminale
- dare un nome a vostra scelta alla variabileche verrà inserito dall'utente.

Altri esempi di inizializzazione delle variabili:

```c
int intero  //Questa variabile acquisisce solo numeri interi
float decimale //Questa variabile acquisisce solo numeri decimali
double decimale2 //Questa variabile acquisisce numeri decimali con 2 cifre dopo la virgola
char carattere //Questa variabile acquisisce solo caratteri
```

### Come si posso commentare del codice all'interno di un qualsiasi file senza che il compilatore lo prenda lo considera codice da eseguire?

Se si vuole commentare del codice che magari per scrivere la logica di funzionamento o come si comporta quel pezzo di codice allora si utilizza i due slash **/ /** per commentare in una sola riga, ma se volete commentare su più righe se volete spiegare e dovete fare uno spiegone alle si utilizza <strong>/* */</strong>. Vi do altro esempio che si usa per scrivere più righe:

```c
/**
 * Questo è un commento su più righe
 * che serve per spiegare il funzionamento del codice
 * e come si comporta il programma
*/  
```

> [!TIP]
> Se volete essere dei bravi programmatori non serve solo scrivere codice ma anche sapere spiegare anche agli per quale motivo funziona in questo modo e questo permette a voi di semplificarvi molto nella vita e trovare altri modi che possono funzionare allo stesso modo per arrivare allo stesso risultato.


Ora si prosegue per il prossimo passo verso l'**Era della programmazione**!