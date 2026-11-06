# Progetto Finale

<div class="not-prose">
  <aside style="position: sticky; top: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; max-width: 260px;">
    <p style="margin: 0 0 0.75rem; font-weight: 700; color: #0f172a;">Menu del corso C</p>
    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.92rem;">
      <li><a href="./intro_c.MD">Introduzione</a></li>
      <li><a href="./page_1.MD">1. Variabili e tipi</a></li>
      <li><a href="./page_2.MD">2. Librerie</a></li>
      <li><a href="./page_3.MD">3. Input/Output</a></li>
      <li><a href="./page_4.MD">4. Operazioni e condizioni</a></li>
      <li><a href="./page_5.MD">5. Cicli</a></li>
      <li><a href="./page_6.MD">6. Funzioni</a></li>
      <li><a href="./page_7.MD">7. Array</a></li>
      <li><a href="./page_8.MD">8. Stringhe</a></li>
      <li><a href="./page_9.MD">9. Puntatori</a></li>
      <li><a href="./page_10.MD">10. Memoria dinamica</a></li>
      <li><a href="./page_11.MD">11. File</a></li>
      <li><a href="./page_12.MD">12. Progetto finale</a></li>
      <li><a href="./page_13.MD">13. Indice conclusivo</a></li>
    </ul>
  </aside>
</div>

## Obiettivi di apprendimento

- mettere insieme tutte le competenze del percorso
- progettare un programma completo e organizzato
- usare funzioni, array, stringhe e file in un unico progetto
- sviluppare una soluzione semplice ma professionale e leggibile

### Idee di progetto

#### 1. Rubrica telefonica

L'utente può:

- aggiungere un contatto
- visualizzare i contatti
- cercare un contatto
- eliminare un contatto

#### 2. Registro voti

L'utente può:

- inserire i voti degli studenti
- calcolare la media
- vedere chi ha superato il test

#### 3. Gestione di una biblioteca

L'utente può:

- aggiungere libri
- cercare un libro
- mostrare tutti i libri
- salvare i dati su file

### Struttura consigliata del progetto

- menu iniziale
- funzioni per inserire, visualizzare e cercare dati
- array o strutture dati
- file per salvare i dati
- controllo dell'input utente

### Esempio di menu

```c
#include <stdio.h>

int main() {
    int scelta;

    printf("1. Inserisci dato\n");
    printf("2. Visualizza dati\n");
    printf("3. Esci\n");
    printf("Scegli: ");
    scanf("%d", &scelta);

    switch (scelta) {
        case 1:
            printf("Hai scelto l'inserimento\n");
            break;
        case 2:
            printf("Hai scelto la visualizzazione\n");
            break;
        case 3:
            printf("Uscita\n");
            break;
        default:
            printf("Scelta non valida\n");
    }

    return 0;
}
```

### Cosa valutare nel progetto

- leggibilità del codice
- uso corretto delle funzioni
- gestione dei dati
- uso di array e stringhe
- gestione dei file
- corretto uso della memoria

### Esercizi preparatori per il progetto finale

1. Creare un menu con 3 opzioni.
2. Aggiungere un array di 5 nomi.
3. Salvare i dati in un file `.txt`.
4. Leggere i dati dal file e stamparli.
5. Creare un piccolo programma per la gestione di una lista.

<a href="/esercizi/1-C/es_12.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi del progetto finale</a>

---

### Conclusione

Il progetto finale rappresenta il momento in cui tutte le competenze si uniscono. È il primo grande passo verso la realizzazione di programmi più complessi e professionali.

Se riuscirai a creare un progetto ben organizzato, avrai capito davvero i fondamenti del linguaggio C.

<a href="./page_13.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai all'indice del percorso</a>

<a href="./intro_c.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Torna all'introduzione</a>
