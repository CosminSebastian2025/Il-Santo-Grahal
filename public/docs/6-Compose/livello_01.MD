# Livello 1: fondamenta

In questo livello impari a costruire schermate semplici: testo, pulsanti, campi di input, disposizione degli elementi e stato che cambia l'interfaccia.

### Creare il progetto

Apri Android Studio, scegli **New Project**, quindi **Empty Activity** con il template Compose. Imposta:

- nome: `ComposeCorso`;
- package: `com.example.composecorso`;
- lingua: Kotlin;
- minimum SDK: API 24.

Il template crea `MainActivity`, il tema Material 3 e le dipendenze. Compila con la configurazione della sezione introduttiva. Avvia l'app sull'emulatore: dovresti vedere una schermata con un saluto.

### Il primo composable

```kotlin
package com.example.composecorso

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun Saluto() {
    Text("Ciao, Compose!")
}
```

- `@Composable` indica che la funzione descrive interfaccia.
- I composable non restituiscono view: dichiarano ciò che deve apparire.
- Il nome va in `PascalCase`, come una classe.
- Un composable può chiamare altri composable.

Per mostrarlo:

```kotlin
setContent {
    MaterialTheme {
        Saluto()
    }
}
```

`MaterialTheme` fornisce colori, tipografia e forme coerenti a tutta l'app.

### Text

```kotlin
Text(text = "Titolo", style = MaterialTheme.typography.headlineMedium)
Text(text = "Sottotitolo", style = MaterialTheme.typography.bodyMedium)
Text(text = "Rosso", color = MaterialTheme.colorScheme.error)
```

La tipografia del tema evita di scegliere dimensioni a caso. Per casi particolari puoi usare `fontSize = 20.sp`, `fontWeight = FontWeight.Bold` e `textAlign = TextAlign.Center`.

```kotlin
Text(
    text = "Testo lungo che va a capo",
    modifier = Modifier.fillMaxWidth(),
    textAlign = TextAlign.Center,
    maxLines = 2
)
```

`sp` si usa per il testo, `dp` per dimensioni e spaziature.

### Button e click listener

```kotlin
Button(onClick = { println("Premuto") }) {
    Text("Premi")
}
```

Il contenuto del pulsante è un altro composable, di solito un `Text` o un'icona. Le varianti Material 3:

| Composable | Uso |
| --- | --- |
| `Button` | azione principale |
| `OutlinedButton` | azione secondaria |
| `TextButton` | azione leggera, dentro card o dialog |
| `IconButton` | icona cliccabile |
| `FilledTonalButton` | azione intermedia |

Il click listener è una lambda: non deve essere pesante, e non deve chiamare funzioni `@Composable`.

### TextField

```kotlin
var nome by remember { mutableStateOf("") }

OutlinedTextField(
    value = nome,
    onValueChange = { nome = it },
    label = { Text("Nome") },
    singleLine = true,
    modifier = Modifier.fillMaxWidth()
)
```

- `value` è lo stato corrente.
- `onValueChange` riceve il nuovo testo e aggiorna lo stato.
- `label` descrive il campo.
- `singleLine = true` impedisce gli a capo.

Per `by` servono:

```kotlin
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
```

Senza `by` si usa `nome.value` e `nome.value = it`.

Un `TextField` senza `onValueChange` che aggiorna lo stato resta bloccato: l'utente scrive e non vede nulla.

### Column, Row, Box

| Composable | Disposizione |
| --- | --- |
| `Column` | elementi uno sotto l'altro |
| `Row` | elementi uno accanto all'altro |
| `Box` | elementi sovrapposti, con allineamento |

```kotlin
Column(
    modifier = Modifier.fillMaxSize().padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(12.dp)
) {
    Text("Titolo")

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = {}) { Text("Uno") }
        Button(onClick = {}) { Text("Due") }
    }

    Box(
        modifier = Modifier.size(80.dp).background(Color.LightGray),
        contentAlignment = Alignment.Center
    ) {
        Text("Box")
    }
}
```

- `horizontalAlignment` allinea i figli sull'asse orizzontale di una `Column`.
- `verticalArrangement` distribuisce i figli sull'asse verticale.
- In una `Row` valgono `verticalAlignment` e `horizontalArrangement`.
- `Arrangement.spacedBy` mette uno spazio uniforme tra i figli.

### Modifier

`Modifier` è una catena di istruzioni applicate a un elemento. L'ordine conta.

```kotlin
Text(
    "Ordine",
    modifier = Modifier
        .padding(16.dp)
        .background(Color.Yellow)
        .padding(8.dp)
)
```

Il primo padding sta **fuori** dallo sfondo, il secondo **dentro**: cambia lo spazio colorato.

Alcuni modifier fondamentali:

| Modifier | Effetto |
| --- | --- |
| `padding(dp)` | spazio esterno (o interno, secondo l'ordine) |
| `fillMaxWidth()` | occupa tutta la larghezza disponibile |
| `fillMaxSize()` | occupa tutto lo spazio disponibile |
| `size(dp)` / `height(dp)` / `width(dp)` | dimensione fissa |
| `weight(f)` | distribuisce lo spazio in Row/Column |
| `background(color)` | colore di sfondo |
| `clip(shape)` | taglia secondo una forma |
| `clickable { }` | rende cliccabile |
| `align(Alignment)` | allinea dentro un Box |

`fillMaxSize` va usato con criterio: dentro una `LazyColumn` non ha senso, perché l'altezza è già determinata dal contenuto.

### padding, fillMaxWidth, fillMaxSize

```kotlin
Column(
    modifier = Modifier
        .fillMaxSize()
        .padding(16.dp)
) {
    Text(
        "Riga completa",
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFE0F2F1))
            .padding(12.dp)
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("Sinistra", modifier = Modifier.weight(1f))
        Text("Destra")
    }
}
```

`weight(1f)` fa occupare alla prima colonna tutto lo spazio rimasto. In una `Row` i pesi dividono la larghezza; in una `Column` dividono l'altezza.

### Spacer

```kotlin
Spacer(modifier = Modifier.height(16.dp))
Spacer(modifier = Modifier.width(8.dp))
Spacer(modifier = Modifier.weight(1f))
```

`Spacer` è un elemento vuoto che crea spazio. È utile quando `Arrangement.spacedBy` non basta, per esempio per spingere un elemento in fondo.

### remember e mutableStateOf

Compose ridisegna l'interfaccia quando lo stato cambia. Lo stato osservabile si crea così:

```kotlin
var contatore by remember { mutableStateOf(0) }

Button(onClick = { contatore++ }) {
    Text("Hai premuto $contatore volte")
}
```

- `mutableStateOf` crea un valore osservabile.
- `remember` conserva il valore tra una ricomposizione e l'altra.
- `by` permette di leggerlo e scriverlo come una normale variabile.

Senza `remember`, ogni ricomposizione ricrea il valore e il contatore torna a zero:

```kotlin
var sbagliato = 0          // non osservabile: la UI non si aggiorna
var ancheSbagliato by mutableStateOf(0) // osservabile ma ricreato a ogni ricomposizione
```

Per i valori primitivi esiste `mutableIntStateOf`, che evita il boxing:

```kotlin
var conteggio by remember { mutableIntStateOf(0) }
```

`remember` **non** sopravvive alla rotazione dello schermo: per quello serve `rememberSaveable`, che arriva nel livello 4.

### Anteprima con @Preview

```kotlin
@Preview(showBackground = true, widthDp = 360)
@Composable
private fun ContatorePreview() {
    MaterialTheme {
        Contatore()
    }
}
```

| Parametro | Uso |
| --- | --- |
| `showBackground` | mostra lo sfondo |
| `widthDp` / `heightDp` | dimensione dell'anteprima |
| `name` | nome visualizzato |
| `uiMode` | tema chiaro o scuro |
| `locale` | lingua |

L'anteprima non esegue l'app e non ha input reale: serve per controllare layout e stili. Per i test interattivi serve l'emulatore.

### Esempio completo: contatore

```kotlin
@Composable
fun Contatore() {
    var conteggio by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Conteggio: $conteggio",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(modifier = Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { conteggio-- }) { Text("-") }
            Button(onClick = { conteggio++ }) { Text("+") }
            TextButton(onClick = { conteggio = 0 }) { Text("Reset") }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun ContatorePreview() {
    MaterialTheme { Contatore() }
}
```

### Errori comuni

- **Dimenticare `remember`.** Lo stato si azzera a ogni ricomposizione.
- **Usare una variabile normale.** La UI non si aggiorna perché non è osservabile.
- **TextField senza aggiornamento dello stato.** Il campo resta vuoto o bloccato.
- **Modifier nell'ordine sbagliato.** `background` prima di `padding` colora anche lo spazio esterno.
- **Usare `fillMaxSize` dentro una lista.** Crea vincoli infiniti o layout inattesi.
- **Chiamare un composable dentro `onClick`.** I composable non si chiamano dagli eventi: cambia lo stato.
- **Testo con `dp`.** Per il testo si usa `sp`.
- **Anteprima senza `MaterialTheme`.** Colori e tipografia non corrispondono all'app.
- **Composable troppo lunghi.** Estrai parti con un nome chiaro.
- **Ignorare il tema.** Colori hardcoded rendono difficile il tema scuro e i cambiamenti globali.

## Esercizi progressivi

**Esercizio 1.** Crea un composable `Saluto` che mostra il tuo nome con uno stile del tema.

**Esercizio 2.** Crea un contatore con un solo pulsante che incrementa e mostra il valore.

**Esercizio 3.** Aggiungi al contatore i pulsanti `-` e `Reset`; impedisci ai valori negativi di scendere sotto zero.

**Esercizio 4.** Crea un form con un campo nome e un pulsante: al click mostra `Ciao, <nome>!`.

**Esercizio 5.** Aggiungi al form un campo età; se nome o età sono vuoti, mostra un messaggio invece del saluto.

**Esercizio 6.** Crea una lista statica della spesa con almeno cinque elementi in una `Column`, separati da `HorizontalDivider`.

**Esercizio 7.** Disponi tre box in una `Row` con `weight(1f)`, `weight(2f)` e `weight(1f)`; assegna colori diversi.

**Esercizio 8.** Crea un `Box` quadrato centrato con uno sfondo colorato e un testo al centro.

**Esercizio 9.** Dimostra la differenza tra `padding` prima e dopo `background` con due testi affiancati.

**Esercizio 10.** Usa due `Spacer` per spingere un pulsante in fondo a una `Column`.

**Esercizio 11.** Crea un pulsante che mostra e nasconde una frase, usando uno stato booleano.

**Esercizio 12.** Aggiungi a un `OutlinedTextField` un contatore che mostra quanti caratteri sono stati scritti.

**Esercizio 13.** Crea una scheda profilo statica con un avatar (un `Box` colorato con l'iniziale), nome e descrizione.

**Esercizio 14.** Crea un mini form con nome ed età, un pulsante `Salva` e uno `Azzera` che riportano i campi allo stato iniziale.

### Varianti

- Nel contatore, aggiungi pulsanti `+5` e `-5`.
- Nel form, mostra il saluto solo dopo che l'utente ha scritto almeno tre caratteri.
- Nella lista della spesa, aggiungi le quantità e calcola il totale degli articoli.
- Nella scheda profilo, cambia il colore dell'avatar in base a uno stato selezionato con un pulsante.

## Progetti del livello 1

### Progetto 1: Counter

Requisiti:

- mostra il conteggio corrente in grande;
- pulsanti `+`, `-`, `Reset`;
- un pulsante `+5` per incrementi rapidi;
- impedisce valori negativi;
- layout centrato, con spaziatura coerente;
- anteprima `@Preview`.

### Progetto 2: Form semplice con nome ed età

Requisiti:

- due `OutlinedTextField`, uno per il nome e uno per l'età;
- validazione: nome non vuoto, età numerica e maggiore di zero;
- messaggio di errore sotto il campo interessato;
- al click su `Salva` mostra una card con il riepilogo;
- pulsante `Azzera` che riporta tutto allo stato iniziale;
- nessun crash con input non numerico.

### Progetto 3: Lista della spesa statica

Requisiti:

- lista hardcoded di almeno sei articoli con nome e quantità;
- colonna con intestazione e righe separate da divider;
- ogni riga mostra nome a sinistra e quantità a destra;
- totale degli articoli calcolato e mostrato in fondo;
- layout leggibile anche su schermi stretti;
- anteprima con almeno due dimensioni diverse.

### Progetto 4: Scheda profilo con immagine, nome e descrizione

Requisiti:

- immagine del profilo caricata da `res/drawable` con `painterResource`;
- nome in evidenza e descrizione su più righe;
- pulsante `Segui` che cambia testo in `Seguito` e colore quando premuto;
- layout in card con padding e spaziatura coerenti;
- immagine ritagliata in forma circolare;
- `contentDescription` sull'immagine.

### Criteri di verifica

- [ ] I composable sono piccoli e con nomi chiari.
- [ ] Lo stato è dichiarato con `remember` e `mutableStateOf`.
- [ ] I `TextField` aggiornano lo stato e non restano bloccati.
- [ ] I modifier sono nell'ordine corretto e non ci sono spaziature casuali.
- [ ] Le anteprime mostrano la schermata senza errori.
- [ ] Non ci sono colori hardcoded nelle schermate, salvo motivazione.
- [ ] L'app non va in crash con input vuoti o non numerici.

Nel livello 2 le schermate diventano complete: barra superiore, liste scorrevoli, card, immagini da rete, dialog e bottom sheet.
