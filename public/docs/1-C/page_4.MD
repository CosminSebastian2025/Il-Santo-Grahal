# Operazioni e condizioni

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

- capire come si costruisce una condizione in C
- usare correttamente gli operatori di confronto e logici
- distinguere tra `=` e `==`
- scrivere `if`, `else` e combinare più condizioni in una sola verifica

Un programma può controllare una condizione e scegliere quali istruzioni eseguire. In C si usa `if-else`: il blocco dopo `if` viene eseguito quando la condizione è vera; il blocco dopo `else` viene eseguito quando è falsa.

```c
if (condizione) {
    // Istruzioni eseguite se la condizione è vera
} else {
    // Istruzioni eseguite se la condizione è falsa
}
```

Le parentesi graffe `{}` delimitano i blocchi di istruzioni. La parte `else` è facoltativa: se non serve un'azione alternativa, si può omettere.

## Operatori usati nelle condizioni

Gli operatori di confronto permettono di confrontare due valori:

| Operatore | Significato |
| --- | --- |
| `==` | uguale a |
| `!=` | diverso da |
| `>` | maggiore di |
| `<` | minore di |
| `>=` | maggiore o uguale a |
| `<=` | minore o uguale a |

Attenzione: `=` assegna un valore a una variabile, mentre `==` confronta due valori.

Gli operatori aritmetici eseguono calcoli:

| Operatore | Operazione |
| --- | --- |
| `+` | addizione |
| `-` | sottrazione |
| `*` | moltiplicazione |
| `/` | divisione |
| `%` | resto della divisione tra interi |

Gli operatori logici permettono di combinare o invertire condizioni:

| Operatore | Significato |
| --- | --- |
| `&&` | AND: entrambe le condizioni devono essere vere |
| `||` | OR: almeno una delle condizioni deve essere vera |
| `!` | NOT: inverte il valore di una condizione |

Per esempio, `!(eta >= 18)` è vero quando l'età non è almeno 18, cioè quando `eta` è minore di 18.

## Esempio: verificare l'età

Questo programma chiede l'età all'utente. Se è almeno 18, la condizione `eta >= 18` è vera e viene mostrato il primo messaggio; altrimenti viene eseguito il blocco `else`.

```c
#include <stdio.h>

int main() {
    int eta;

    printf("Inserisci la tua eta: ");
    scanf("%d", &eta);

    if (eta >= 18) {
        printf("Sei maggiorenne!\n");
    } else {
        printf("Sei minorenne!\n");
    }

    return 0;
}
```

Se l'utente inserisce `19`, il confronto `19 >= 18` è vero e il programma stampa:

```text
Sei maggiorenne!
```

Se inserisce `17`, il confronto è falso e viene eseguito il blocco `else`:

```text
Sei minorenne!
```

## Esempio: usare un calcolo aritmetico

In questo esempio il programma calcola la media di due voti e controlla se è almeno 6. L'operatore `+` somma i voti e `/` divide la somma per due. Si usa `2.0` per ottenere una media che può includere i decimali.

```c
#include <stdio.h>

int main() {
    int voto1;
    int voto2;
    float media;

    printf("Inserisci il primo voto: ");
    scanf("%d", &voto1);

    printf("Inserisci il secondo voto: ");
    scanf("%d", &voto2);

    media = (voto1 + voto2) / 2.0;
    printf("La media e': %.2f\n", media);

    if (media >= 6) {
        printf("Hai raggiunto la sufficienza.\n");
    } else {
        printf("Non hai raggiunto la sufficienza.\n");
    }

    return 0;
}
```

Per esempio, con i voti `5` e `7`, il calcolo è `(5 + 7) / 2.0`, quindi la media è `6.00`. La condizione `media >= 6` risulta vera.

## Esempio: combinare condizioni con AND (`&&`)

L'operatore `&&` richiede che entrambe le condizioni siano vere. Qui il programma controlla se la temperatura è compresa tra 18 e 25 gradi, estremi inclusi.

```c
#include <stdio.h>

int main() {
    int temperatura;

    printf("Inserisci la temperatura: ");
    scanf("%d", &temperatura);

    if (temperatura >= 18 && temperatura <= 25) {
        printf("La temperatura e' compresa tra 18 e 25 gradi.\n");
    } else {
        printf("La temperatura e' fuori dall'intervallo.\n");
    }

    return 0;
}
```

Con una temperatura di `20`, sia `temperatura >= 18` sia `temperatura <= 25` sono vere: il risultato complessivo di `&&` è quindi vero. Con `27`, la seconda condizione è falsa e viene eseguito `else`.

## Esempio: combinare condizioni con OR (`||`)

L'operatore `||` dà un risultato vero quando almeno una delle due condizioni è vera. In questo esempio si considera `6` sabato e `7` domenica.

```c
#include <stdio.h>

int main() {
    int giorno;

    printf("Inserisci un numero da 1 a 7 (1 = lunedi', 7 = domenica): ");
    scanf("%d", &giorno);

    if (giorno == 6 || giorno == 7) {
        printf("E' il fine settimana.\n");
    } else {
        printf("E' un giorno feriale.\n");
    }

    return 0;
}
```

Se `giorno` vale `6`, la prima condizione è vera; se vale `7`, è vera la seconda. In entrambi i casi il risultato di `||` è vero e il programma stampa che è il fine settimana.

In sintesi, il programma valuta la condizione nell'`if` e ne esegue un solo ramo: quello di `if` se è vera, oppure quello di `else` se è falsa. I calcoli possono produrre i valori da confrontare e gli operatori logici possono combinare più confronti.

<a href="./page_5.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>