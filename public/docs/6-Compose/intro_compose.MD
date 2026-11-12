# Introduzione a Jetpack Compose

**Jetpack Compose** è il toolkit moderno di Android per costruire interfacce con Kotlin. Non si descrive una schermata con file XML e non si modificano le view a mano: si scrivono **funzioni** che descrivono l'interfaccia in base allo stato, e Compose si occupa di aggiornarla quando lo stato cambia.

```kotlin
@Composable
fun Saluto() {
    Text("Ciao, Compose!")
}
```

`@Composable` è un'annotazione che trasforma la funzione in un elemento dell'interfaccia. La funzione non restituisce una view: **dichiara** che cosa deve apparire.

### Obiettivo del percorso

Il corso è diviso in **6 livelli**:

1. **Fondamenta** — progetto Compose, `Text`, `Button`, `TextField`, layout, `Modifier`, stato e anteprime.
2. **UI reale** — Material 3, Scaffold, liste, card, immagini, dialog e bottom sheet.
3. **Stato serio e architettura** — state hoisting, ViewModel, StateFlow, `UiState`, effetti.
4. **Animazioni, navigazione e componenti avanzati** — Navigation Compose, animazioni, rotazione, deep link, refresh, paginazione.
5. **Livello avanzato** — composable personalizzati, layout e Canvas, gesti, prestazioni, test e accessibilità.
6. **Oltre i limiti** — runtime di Compose, slot table, skippability, benchmark, modularizzazione e design system.

I primi quattro livelli costruiscono schermate vere; gli ultimi due spiegano come funzionano sotto il cofano e come misurare ciò che si fa.

### Il metodo

- Studia **60 minuti al giorno**.
- Scrivi sempre il codice e guarda l'anteprima o l'emulatore.
- Completa gli esercizi di un livello prima di passare al successivo.
- Fai un progetto alla volta, fino a farlo funzionare davvero.
- Leggi gli errori del compilatore e del Logcat con calma.
- Non copiare gli esempi: cambiali, rompili e rimettili insieme.

### Gli strumenti

Serve **Android Studio** recente con l'**Android SDK 35** e un emulatore (o un dispositivo fisico). Android Studio include il JDK necessario; per la riga di comando serve un JDK 21.

Verifica l'ambiente:

```bash
java -version
```

Nel corso useremo:

```text
Kotlin 2.1.20
Compose BOM 2025.01.00
Material 3
minSdk 24, compileSdk 35
```

Quando crei un progetto nuovo scegli **Empty Activity** con il modello **Jetpack Compose** e lascia attive le impostazioni predefinite. Il template genera già `MainActivity`, il tema e le dipendenze.

### Il progetto Gradle

`build.gradle.kts` della radice:

```kotlin
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20" apply false
}
```

`app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.composecorso"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.composecorso"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.01.00")
    implementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.10.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

Con Kotlin 2.x il compilatore di Compose è un plugin separato: `org.jetbrains.kotlin.plugin.compose`. La BOM allinea le versioni di tutte le librerie Compose.

### Il primo programma

`MainActivity.kt`:

```kotlin
package com.example.composecorso

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Text("Ciao, mondo!")
            }
        }
    }
}
```

`setContent` è il ponte tra Android e Compose: tutto ciò che scrivi dentro è interfaccia dichiarativa.

L'anteprima evita di avviare l'emulatore a ogni modifica:

```kotlin
@Preview(showBackground = true)
@Composable
private fun SalutoPreview() {
    MaterialTheme {
        Text("Ciao, mondo!")
    }
}
```

### Come ragionare (e come si applica)

#### Dove si applica

- **App Android moderne**: ogni schermata è una funzione dello stato; chi sa quale stato produce quale interfaccia sa progettarla.
- **Schermate dichiarative**: descrivi il risultato, non le istruzioni; il pensiero passa da "che cosa eseguo" a "quale dato descrive la schermata".
- **Design system**: un componente stateless con parametri e callback si riusa ovunque e resta coerente con il tema.
- **Animazioni**: si animano i cambi di stato, non le view; con lo stato chiaro l'animazione è una conseguenza.
- **UI testabile**: separare interfaccia e logica permette anteprime con dati finti e test senza emulatore.

In tutti i casi contano le stesse tre cose: **stato** (unica fonte di verità), **ricomposizione** (Compose ridisegna solo le parti che leggono lo stato cambiato) e **separazione tra UI e logica** (il composable mostra, qualcun altro decide).

#### La logica in sei passi

1. **Leggi il problema**: una frase su che cosa fa l'utente e quali dati servono.
2. **Disegna la schermata a blocchi**: testata, contenuto, azioni; ogni blocco diventa un composable con un nome.
3. **Definisci stato ed eventi**: quali valori cambiano, chi li possiede, quali callback li modificano.
4. **Scegli layout e componenti**: `Column`/`Row`/`LazyColumn`, `Text`, `Button`, `TextField`, `Card`.
5. **Scrivi la versione minima**: stato e UI, senza dettagli estetici.
6. **Prova gli stati limite** (caricamento, vuoto, errore, testo lungo) e **generalizza**: estrai parametri e callback.

#### Esempio guidato 1: contatore con stato

**Problema**: un numero parte da zero, un pulsante lo incrementa, un altro lo azzera. **Ragionamento**: il numero è lo stato, i pulsanti sono gli eventi. Lo stato vive nel composable che li contiene entrambi, così tutti lo vedono; quando cambia, Compose ricompone solo il `Text` che lo legge.

```kotlin
@Composable
fun Contatore(modifier: Modifier = Modifier) {
    var count by remember { mutableIntStateOf(0) }
    Column(modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Valore: $count", style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { count++ }) { Text("+1") }
            OutlinedButton(onClick = { count = 0 }) { Text("Azzera") }
        }
    }
}
```

**Output atteso**: all'avvio `Valore: 0`; un tocco su `+1` porta a `Valore: 1`; `Azzera` torna a `0`.

#### Esempio guidato 2: form con validazione

**Problema**: chiedere un nome e mostrare un saluto solo se il campo non è vuoto. **Ragionamento**: due stati (`nome`, `errore`) e due eventi (digitazione, conferma). Con lo state hoisting lo stato resta in `FormNome`, mentre `CampoNome` è stateless: riceve valore ed errore ed emette la modifica con un callback, così la validazione resta in un solo punto.

```kotlin
@Composable
fun FormNome(modifier: Modifier = Modifier) {
    var nome by rememberSaveable { mutableStateOf("") }
    var errore by rememberSaveable { mutableStateOf<String?>(null) }
    var confermato by rememberSaveable { mutableStateOf(false) }
    Column(modifier = modifier.padding(16.dp)) {
        CampoNome(nome, errore) {
            nome = it
            errore = null
            confermato = false
        }
        Button(onClick = {
            errore = if (nome.isBlank()) "Il nome non può essere vuoto" else null
            confermato = errore == null
        }) { Text("Conferma") }
        if (confermato) Text("Ciao, ${nome.trim()}")
    }
}

@Composable
private fun CampoNome(valore: String, errore: String?, onValoreChange: (String) -> Unit) {
    Column {
        OutlinedTextField(
            value = valore,
            onValueChange = onValoreChange,
            label = { Text("Nome") },
            isError = errore != null,
            singleLine = true
        )
        if (errore != null) Text(errore, color = MaterialTheme.colorScheme.error)
    }
}
```

**Output atteso**: con `Ada` e `Conferma` compare `Ciao, Ada` senza errori; con il campo vuoto compare il messaggio rosso e nessun saluto; appena digiti, l'errore sparisce.

#### Debug: ragionare su un errore

**Sintomo**: incrementi una riga della lista, scorri, torni indietro e il valore è di nuovo zero; oppure i valori sembrano passare da una riga all'altra.

```kotlin
@Composable
fun ListaContatori(nomi: List<String>) {
    LazyColumn {
        items(nomi) { nome ->
            // errore: lo stato vive nel figlio, che può essere ricreato
            var conteggio by remember { mutableStateOf(0) }
            Text("$nome: $conteggio")
            Button(onClick = { conteggio++ }) { Text("+1") }
        }
    }
}
```

**Come individuarlo**: osserva il comportamento e chiediti **chi possiede il dato** e **quale composable viene ricreato o riusato**. Uno stato dentro un figlio che può sparire va spostato più in alto, e le righe hanno bisogno di un'identità stabile con `key`.

```kotlin
@Composable
fun ListaContatori(nomi: List<String>) {
    val conteggi = remember { mutableStateMapOf<String, Int>() } // stato nel contenitore
    LazyColumn {
        items(nomi, key = { it }) { nome ->
            Text("$nome: ${conteggi[nome] ?: 0}")
            Button(onClick = { conteggi[nome] = (conteggi[nome] ?: 0) + 1 }) { Text("+1") }
        }
    }
}
```

Ora i conteggi sopravvivono allo scorrimento e ogni riga ha la sua identità.

#### Obiettivo, ragionamento, strumento

| Obiettivo | Come ragionare | Strumento Compose |
| --- | --- | --- |
| Stato | Quale valore cambia e chi lo possiede; parti dal più piccolo insieme necessario | `remember`, `mutableStateOf`, `rememberSaveable` |
| Eventi | Che cosa l'utente fa e quale callback lo descrive | parametri `(T) -> Unit`, `onClick`, `onValueChange` |
| Layout | Dividi in blocchi e stabili chi sta sopra, sotto o accanto a chi | `Column`, `Row`, `Box`, `Modifier`, `Arrangement` |
| Lista | Ogni riga ha un'identità e uno stato che non deve perdersi | `LazyColumn`, `items(key = ...)`, `mutableStateMapOf` |
| Anteprima | Quali dati finti mostrano i casi principali della schermata | `@Preview` su composable stateless |

#### Esercizi di ragionamento

Per ognuno scrivi su carta, prima del codice: descrizione della schermata, stato, eventi, casi limite e output atteso.

1. **Campo di ricerca con risultati filtrati**: elenca i blocchi della schermata, decidi se il filtro è stato o derivato, poi prevedi che cosa succede con query vuota, nessun risultato e query molto lunga.
2. **Lista della spesa**: descrivi stato ed eventi per aggiungere, spuntare ed eliminare una voce e indica dove devono vivere per sopravvivere allo scorrimento e alla rotazione.
3. **Scheda meteo con caricamento**: definisci gli stati possibili (caricamento, dati, vuoto, errore), che cosa mostra ciascuno e quale evento fa passare da uno all'altro, prima di scrivere qualsiasi composable.

### Come è organizzato il corso

| Livello | Argomenti | Progetti |
| --- | --- | --- |
| 1 | Compose di base, layout, Modifier, stato, anteprime | Contatore, form, lista statica, scheda profilo |
| 2 | Material 3, Scaffold, liste, card, immagini, dialog | To-do, film, profilo a schede, meteo finta |
| 3 | ViewModel, StateFlow, UiState, effetti | To-do con architettura |
| 4 | Navigazione, animazioni, rotazione, refresh, paginazione | Più schermate, lista/dettaglio, animazioni, dati da rete |
| 5 | Composable custom, Layout, Canvas, gesti, test | Libreria di componenti e dashboard |
| 6 | Runtime, skippability, benchmark, modularizzazione | Audit e ottimizzazione di una schermata |

Ogni livello contiene argomenti con esempi, **errori comuni**, **esercizi progressivi** e **varianti**. I progetti hanno requisiti e criteri di verifica.

### Convenzioni del corso

- Composable in `PascalCase`: `SchedaProfilo`, `ListaFilm`.
- Funzioni normali e proprietà in `camelCase`: `calcolaTotale`, `isLoading`.
- Un file per schermata o per gruppo di componenti affini.
- I composable che ricevono stato e callback sono **stateless**; lo stato vive più in alto possibile.
- Le anteprime sono `private` e non contengono logica.
- Le stringhe visibili all'utente stanno in `strings.xml` quando il progetto cresce.
- Niente colori hardcoded nelle schermate: usa il tema.

### Come usare esercizi e progetti

Gli esercizi sono progressivi: i primi verificano la sintassi, gli ultimi richiedono di combinare più concetti. Le varianti servono per chi vuole andare oltre senza aspettare il livello successivo.

I progetti sono la parte più importante: scegli un progetto del livello, portalo a termine e solo dopo passa avanti. Un progetto finito e spiegabile vale più di tre iniziati.

Nel livello 1 si crea il progetto e si scrive il primo composable con stato.
