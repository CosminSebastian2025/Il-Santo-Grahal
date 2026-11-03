# Librerie

### Cosa sono le librerie?

Le librerie sono dei file che contengono delle funzioni già scritte da altri programmatori e che possono essere utilizzate all'interno del nostro programma per evitare di riscrivere codice già esistente. In C, le librerie vengono incluse nel programma tramite la direttiva `#include`.
Per farla breve le librerie sono una raccolta di funzioni che stanno all'interno per un uso specifico che si vuole fare al nostro programma.
Per fare un esempio che poi si andrà a fare:

```c
#include <stdio.h> // Questa libreria contiene funzioni per l'input e l'output standard
```

Ma c'è ne sono altri tipi di librerie che si possono utilizzare

|#|Header|Uso Principale|
|---|---|---|
|1|<assert.>|Verifiche e asserzioni durante l’esecuzione.|
|2|<complex.h>|Numeri complessi|
|3|<ctype.h>|Classificazione e conversione dei caratteri|
|4|<errno.h>|Codici d'errore|
|5|<fenv.h>|Ambiente delle operazioni in virgola mobile|
|6|<float.h>|Limiti e proprietà dei tipi floating-point|
|7|<inttype.h>|Formati e conversioni per interi a larghezza specifica|
|8|<iso646.h>|Nomi alternativi per alcuni operatori; oggi è soprattutto per compatibilità|
|9|<limits.h>|Limiti dei tipi interi, per esempi **INT_MAX**|
|10|<locale.h>|impostazioni locali per formati e convezioni linguistiche|
|11|<math.h>|Funzioni matematiche, come **sqrt**, **sin**, **pow**|
|12|<setjmp.h>|Salti non locali con **setjmp** e **longjmp**|
|13|<signal.h>|Gestione dei segnali|
|14|<stdalign.h>|Compatibilità per le funzionalità di allineamento|
|15|<stdarg.h>|Funzioni con un numero variabile di argomenti|
|16|<stdatomic.h>|Operatzioni atomiche, utili nella programmazione concorrente|
|17|<stdbit.h>|Operazioni e controlli sui bit, introdotti in C23|
|18|<stdbool.h>|Compatibilità per i valori booleani|
|19|<stdckdint.>|Operazioni aritmetiche intere con contrllo dell'overflow, introdotte in C23|
|20|<stddef.h>|Tipi e macro comuni, come **size_t** e **NULL**|
|21|<stdint.h>|Tipi e larghezza specifica, come **int32_t**|
|22|<stdio.h>|imput/output|e gestionedei file, per esempio **printf** e **fopen**|
|23|<stdlib.h>|utility generali, allocazione della memoria e conversioni|
|24|<stdnoreturn.h>|Compatibilità per le funzioni che non restituiscono il controllo|
|25|<string.h>|Operazioni su stringhe e blocchi di memoria|
|26|<tgmath.h>|macro generiche per funzioni aritmetiche|
|27|<threads.h>|Thread e sincronizzazione; Il supporto può dipendere dall'implementazione|
|28|<time.h>|Date, orari e misurazione del tempo|
|29|<uchar.h>|Tipi e conversioni per caratteri Unicode|
|30|<wchar.h>|Caratteri larghi e relative stringhe e funzioni|
|31|<wctype.h>|Classificazione e conversione dei caratteri larghi|


> Ogni libreria ha una sua classificazione e funzioni specifiche per raggiungere un certo obiettio a seconda del caso che si vuole avere.

Per il prossimo passo si una volta terminato di leggere, ora si andrà a fare la pratica e diverte!