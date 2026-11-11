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
