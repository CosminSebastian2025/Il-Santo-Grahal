# Settimana 4: primo modulo KMP

Questa settimana il codice scritto finora smette di essere un esercizio e diventa un **modulo condiviso**: una libreria Kotlin che contiene validazione, calcoli e repository, usata da un'app Android e, se hai un Mac, anche da iOS.

### Cosa significa condividere codice

In un progetto Kotlin Multiplatform la logica vive in un modulo `shared`. Le app sono contenitori che disegnano l'interfaccia e chiamano quella logica.

| Parte | Dove sta | Perché |
| --- | --- | --- |
| Modello, validazione, calcoli, repository | `shared` | uguale su tutte le piattaforme |
| Interfaccia Android | `androidApp` | usa Jetpack Compose |
| Interfaccia iOS | progetto Xcode | usa SwiftUI o UIKit |
| Accesso a risorse e API di sistema | `androidMain` / `iosMain` | dipende dalla piattaforma |

La regola pratica: se una funzione non ha bisogno di `Context`, `View`, `Bundle` o classi di sistema, può stare in `commonMain`.

### Struttura del progetto

```text
PrimaAppKMP/
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  gradlew
  gradlew.bat
  shared/
    build.gradle.kts
    src/
      commonMain/kotlin/com/example/primaapp/shared/
      androidMain/kotlin/com/example/primaapp/shared/
      iosMain/kotlin/com/example/primaapp/shared/
      commonTest/kotlin/com/example/primaapp/shared/
  androidApp/
    build.gradle.kts
    src/main/
      AndroidManifest.xml
      kotlin/com/example/primaapp/MainActivity.kt
      assets/prodotti.json
```

Puoi creare la struttura con il wizard **Kotlin Multiplatform** di Android Studio e poi adattarla, oppure scrivere i file Gradle qui sotto in un progetto vuoto. Il risultato è lo stesso: due moduli, `shared` e `androidApp`.

### settings.gradle.kts

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "PrimaAppKMP"
include(":shared")
include(":androidApp")
```

`pluginManagement` dice a Gradle dove trovare i plugin; `dependencyResolutionManagement` dove trovare le librerie. I due `include` collegano i moduli alla build.

### build.gradle.kts della radice

```kotlin
plugins {
    kotlin("multiplatform") version "2.1.20" apply false
    kotlin("android") version "2.1.20" apply false
    kotlin("plugin.serialization") version "2.1.20" apply false
    id("com.android.application") version "8.7.3" apply false
    id("com.android.library") version "8.7.3" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20" apply false
}
```

`apply false` dichiara le versioni senza applicare i plugin alla radice: ogni modulo sceglie quelli che gli servono. La versione di `plugin.serialization` deve essere la stessa di Kotlin.

`gradle.properties`:

```properties
kotlin.code.style=official
android.useAndroidX=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
```

### shared/build.gradle.kts

```kotlin
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    id("com.android.library")
}

kotlin {
    androidTarget {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_11)
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { target ->
        target.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
            implementation("io.ktor:ktor-client-core:3.1.1")
            implementation("io.ktor:ktor-client-content-negotiation:3.1.1")
            implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.1")
        }

        androidMain.dependencies {
            implementation("io.ktor:ktor-client-okhttp:3.1.1")
        }

        iosMain.dependencies {
            implementation("io.ktor:ktor-client-darwin:3.1.1")
        }

        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
        }
    }
}

android {
    namespace = "com.example.primaapp.shared"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}
```

Punti chiave:

- `androidTarget()` rende il modulo consumabile da Android;
- i tre target iOS coprono simulatore Intel, dispositivo e simulatore Apple Silicon;
- `baseName = "Shared"` è il nome del framework importato da Swift: `import Shared`;
- `isStatic = true` semplifica la distribuzione del framework;
- le dipendenze comuni stanno in `commonMain`, gli engine HTTP specifici in `androidMain` e `iosMain`;
- i test comuni usano `kotlin("test")`, non JUnit.

Se non hai un Mac puoi commentare i target iOS: il progetto Android continua a funzionare. Tienili nel file per quando aprirai il progetto su macOS.

### androidApp/build.gradle.kts

```kotlin
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    kotlin("android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.primaapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.primaapp"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
    }
}

dependencies {
    implementation(project(":shared"))

    implementation(platform("androidx.compose:compose-bom:2025.02.00"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
```

`implementation(project(":shared"))` è il ponte: da qui l'app vede tutte le classi pubbliche del modulo condiviso. Il `jvmTarget` deve essere lo stesso nei due moduli, altrimenti la build fallisce con un errore di compatibilità.

### Codice condiviso: validazione

In `shared/src/commonMain/kotlin/com/example/primaapp/shared/Validatore.kt`:

```kotlin
package com.example.primaapp.shared

object Validatore {

    fun email(valore: String): String? {
        val pulita = valore.trim()
        return when {
            pulita.isEmpty() -> "Email obbligatoria"
            !pulita.contains("@") -> "Email senza @"
            !pulita.substringAfter("@").contains(".") -> "Dominio non valido"
            else -> null
        }
    }

    fun password(valore: String): String? = when {
        valore.length < 8 -> "La password deve avere almeno 8 caratteri"
        valore.none { it.isDigit() } -> "Serve almeno un numero"
        else -> null
    }

    fun importo(testo: String): String? {
        val numero = testo.trim().replace(',', '.').toDoubleOrNull()
        return when {
            numero == null -> "Inserisci un numero valido"
            numero <= 0 -> "L'importo deve essere positivo"
            else -> null
        }
    }
}
```

Nessuna classe Android, nessun `Context`: questo file compila per Android, iOS e per i test. Il risultato `null` significa "valido"; una stringa significa "errore da mostrare".

### Codice condiviso: sconto

In `shared/src/commonMain/kotlin/com/example/primaapp/shared/Sconto.kt`:

```kotlin
package com.example.primaapp.shared

import kotlin.math.round

data class Sconto(
    val percentuale: Int,
    val importoMinimo: Double,
    val descrizione: String
)

object CalcolatoreSconto {

    fun prezzoFinale(prezzo: Double, sconto: Sconto): Double {
        require(prezzo >= 0) { "Il prezzo non può essere negativo" }
        require(sconto.percentuale in 0..100) {
            "La percentuale deve essere tra 0 e 100"
        }

        if (prezzo < sconto.importoMinimo) return prezzo

        val scontato = prezzo * (100 - sconto.percentuale) / 100.0
        return round(scontato * 100) / 100
    }
}
```

`require` lancia `IllegalArgumentException` se il chiamante passa dati impossibili: è un errore di programmazione, non un errore da mostrare all'utente. La soglia minima rende la regola esplicita e testabile.

### Codice condiviso: conversione valute

In `shared/src/commonMain/kotlin/com/example/primaapp/shared/ConvertitoreValute.kt`:

```kotlin
package com.example.primaapp.shared

import kotlinx.serialization.Serializable

@Serializable
data class TabellaTassi(
    val base: String,
    val tassi: Map<String, Double>
)

class ConvertitoreValute(private val tabella: TabellaTassi) {

    fun converti(importo: Double, da: String, a: String): Double {
        require(importo >= 0) { "L'importo non può essere negativo" }

        val partenza = tasso(da)
        val arrivo = tasso(a)
        val risultato = importo / partenza * arrivo

        return kotlin.math.round(risultato * 100) / 100
    }

    private fun tasso(valuta: String): Double {
        val codice = valuta.trim().uppercase()
        if (codice == tabella.base.trim().uppercase()) return 1.0

        return tabella.tassi[codice]
            ?: throw IllegalArgumentException("Valuta sconosciuta: $valuta")
    }
}
```

La tabella dichiara quanti dollari vale **una** unità della valuta base:

```json
{
  "base": "EUR",
  "tassi": {
    "USD": 1.08,
    "GBP": 0.85,
    "CHF": 0.94
  }
}
```

Con base EUR, `USD -> EUR` divide per `1.08`; `EUR -> USD` moltiplica per `1.08`. La formula `importo / tassoPartenza * tassoSarrivo` funziona per qualunque coppia senza casi speciali.

### Codice condiviso: prodotti e repository JSON

In `shared/src/commonMain/kotlin/com/example/primaapp/shared/Prodotti.kt`:

```kotlin
package com.example.primaapp.shared

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

data class Prodotto(
    val id: Int,
    val nome: String,
    val prezzo: Double,
    val categoria: String
)

@Serializable
private data class ProdottoDto(
    val id: Int,
    val nome: String,
    @SerialName("prezzo_unitario") val prezzo: Double,
    val categoria: String? = null
)

private fun ProdottoDto.aProdotto(): Prodotto = Prodotto(
    id = id,
    nome = nome,
    prezzo = prezzo,
    categoria = categoria ?: "senza categoria"
)

class RepositoryProdottiJson(private val contenuto: String) {

    private val json = Json { ignoreUnknownKeys = true }

    fun carica(): List<Prodotto> =
        json.decodeFromString<List<ProdottoDto>>(contenuto)
            .map { it.aProdotto() }
}
```

Il repository riceve il **testo** JSON, non il percorso del file. Leggere un file è un compito della piattaforma: Android legge dagli asset, iOS dal bundle. In questo modo `commonMain` resta libero da `Context` e `Bundle`.

Il file `androidApp/src/main/assets/prodotti.json`:

```json
[
  {
    "id": 1,
    "nome": "Penna",
    "prezzo_unitario": 1.2,
    "categoria": "cancelleria"
  },
  {
    "id": 2,
    "nome": "Mouse",
    "prezzo_unitario": 15.0,
    "categoria": "informatica",
    "disponibile": true
  }
]
```

Il campo `disponibile` non esiste nel DTO: grazie a `ignoreUnknownKeys` viene ignorato. Il nome `prezzo_unitario` viene mappato su `prezzo` da `@SerialName`.

### expect e actual

Quando una funzione deve esistere in comune ma comportarsi diversamente, si dichiara `expect` in `commonMain` e `actual` su ogni piattaforma.

`shared/src/commonMain/kotlin/com/example/primaapp/shared/Piattaforma.kt`:

```kotlin
package com.example.primaapp.shared

expect fun nomePiattaforma(): String
```

`shared/src/androidMain/kotlin/com/example/primaapp/shared/Piattaforma.android.kt`:

```kotlin
package com.example.primaapp.shared

actual fun nomePiattaforma(): String = "Android"
```

`shared/src/iosMain/kotlin/com/example/primaapp/shared/Piattaforma.ios.kt`:

```kotlin
package com.example.primaapp.shared

actual fun nomePiattaforma(): String = "iOS"
```

Le regole:

- ogni `expect` deve avere un `actual` per **ogni** target, altrimenti la build si ferma;
- la firma deve essere identica, compresi tipi e parametri;
- `expect`/`actual` serve per poche funzioni di confine, non per duplicare l'architettura;
- le classi Android non possono apparire in `commonMain`, nemmeno nei commenti di import.

### Risorse lette dalla piattaforma

Android, dentro `MainActivity` o in un file di supporto:

```kotlin
import android.content.Context

fun leggiAsset(context: Context, nome: String): String =
    context.assets.open(nome).bufferedReader().use { it.readText() }
```

Uso:

```kotlin
val repository = RepositoryProdottiJson(leggiAsset(this, "prodotti.json"))
val prodotti = repository.carica()
```

iOS, in Swift:

```swift
func leggiJson() -> String {
    guard let url = Bundle.main.url(forResource: "prodotti", withExtension: "json"),
          let testo = try? String(contentsOf: url, encoding: .utf8) else {
        return "[]"
    }
    return testo
}
```

La stessa classe `RepositoryProdottiJson` riceve il testo da entrambe le piattaforme. La logica di parsing e mappatura è scritta una volta sola.

### Usare il modulo da Android

`androidApp/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:label="Prima App KMP"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

`androidApp/src/main/kotlin/com/example/primaapp/MainActivity.kt`:

```kotlin
package com.example.primaapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.primaapp.shared.CalcolatoreSconto
import com.example.primaapp.shared.Sconto
import com.example.primaapp.shared.Validatore
import com.example.primaapp.shared.nomePiattaforma

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SchermataSconto()
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun SchermataSconto() {
    var prezzo by remember { mutableStateOf("") }
    var errore by remember { mutableStateOf<String?>(null) }
    var finale by remember { mutableStateOf<Double?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Logica condivisa da ${nomePiattaforma()}")

        OutlinedTextField(
            value = prezzo,
            onValueChange = {
                prezzo = it
                errore = null
                finale = null
            },
            label = { Text("Prezzo") },
            modifier = Modifier.fillMaxWidth(),
            isError = errore != null,
            singleLine = true
        )

        errore?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Button(onClick = {
            val messaggio = Validatore.importo(prezzo)
            errore = messaggio

            if (messaggio == null) {
                val valore = prezzo.replace(',', '.').toDouble()
                finale = CalcolatoreSconto.prezzoFinale(
                    prezzo = valore,
                    sconto = Sconto(
                        percentuale = 20,
                        importoMinimo = 50.0,
                        descrizione = "Sconto fedeltà"
                    )
                )
            }
        }) {
            Text("Calcola")
        }

        finale?.let {
            Text("Prezzo finale: ${"%.2f".format(it)} €")
        }
    }
}
```

Qui l'app non contiene né la validazione né il calcolo: chiama `Validatore` e `CalcolatoreSconto`. Se domani la regola cambia, si modifica il modulo condiviso e tutte le piattaforme la ricevono.

Per mostrare anche la lista prodotti, aggiungi una schermata con `LazyColumn`:

```kotlin
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import com.example.primaapp.shared.Prodotto

@androidx.compose.runtime.Composable
private fun ListaProdotti(prodotti: List<Prodotto>) {
    LazyColumn {
        items(prodotti, key = { it.id }) { prodotto ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
            ) {
                Text(prodotto.nome)
                Text("${"%.2f".format(prodotto.prezzo)} € · ${prodotto.categoria}")
            }
        }
    }
}
```

I prodotti arrivano dal repository condiviso: l'app non conosce né il JSON né il DTO.

### Test nel codice comune

I test vivono in `shared/src/commonTest/kotlin/com/example/primaapp/shared/` e usano `kotlin.test`.

`ScontoTest.kt`:

```kotlin
package com.example.primaapp.shared

import kotlin.test.Test
import kotlin.test.assertEquals

class ScontoTest {

    @Test
    fun scontoApplicatoSopraLaSoglia() {
        val finale = CalcolatoreSconto.prezzoFinale(
            prezzo = 100.0,
            sconto = Sconto(20, 50.0, "test")
        )

        assertEquals(80.0, finale, 0.001)
    }

    @Test
    fun scontoNonApplicatoSottoLaSoglia() {
        val finale = CalcolatoreSconto.prezzoFinale(
            prezzo = 40.0,
            sconto = Sconto(20, 50.0, "test")
        )

        assertEquals(40.0, finale, 0.001)
    }
}
```

`RepositoryProdottiTest.kt`:

```kotlin
package com.example.primaapp.shared

import kotlin.test.Test
import kotlin.test.assertEquals

class RepositoryProdottiTest {

    private val json = """
        [
          {"id": 1, "nome": "Penna", "prezzo_unitario": 1.2, "categoria": "cancelleria"},
          {"id": 2, "nome": "Mouse", "prezzo_unitario": 15.0, "extra": true}
        ]
    """.trimIndent()

    @Test
    fun caricaProdottiIgnorandoCampiSconosciuti() {
        val prodotti = RepositoryProdottiJson(json).carica()

        assertEquals(2, prodotti.size)
        assertEquals("Penna", prodotti[0].nome)
        assertEquals("senza categoria", prodotti[1].categoria)
    }
}
```

`ConvertitoreValuteTest.kt`:

```kotlin
package com.example.primaapp.shared

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ConvertitoreValuteTest {

    private val convertitore = ConvertitoreValute(
        TabellaTassi(
            base = "EUR",
            tassi = mapOf("USD" to 1.08, "GBP" to 0.85)
        )
    )

    @Test
    fun euroVersoDollari() {
        assertEquals(108.0, convertitore.converti(100.0, "EUR", "USD"), 0.001)
    }

    @Test
    fun dollariVersoEuro() {
        assertEquals(100.0, convertitore.converti(108.0, "USD", "EUR"), 0.001)
    }

    @Test
    fun valutaSconosciutaLanciaErrore() {
        assertFailsWith<IllegalArgumentException> {
            convertitore.converti(10.0, "EUR", "XYZ")
        }
    }
}
```

Comandi:

```bash
./gradlew :shared:testDebugUnitTest
./gradlew :shared:allTests
./gradlew :androidApp:assembleDebug
```

Su Windows usa `gradlew.bat`. `testDebugUnitTest` esegue i test comuni sul target Android e funziona su qualsiasi sistema; `allTests` include anche i target iOS e richiede macOS. Una suite di test comune che gira su più piattaforme è il vantaggio più concreto di KMP.

### Il framework per iOS

Su macOS:

```bash
./gradlew :shared:linkDebugFrameworkIosSimulatorArm64
```

Il framework viene generato in `shared/build/bin/iosSimulatorArm64/debugFramework/Shared.framework`. In Xcode:

1. crea un progetto iOS nella cartella `iosApp`;
2. aggiungi il framework con **Add Files to "iosApp"**;
3. in **General > Frameworks, Libraries, and Embedded Content** scegli **Embed & Sign**;
4. importa il modulo in Swift con `import Shared`.

`ContentView.swift`:

```swift
import SwiftUI
import Shared

struct ContentView: View {
    private let repository = RepositoryProdottiJson(
        contenuto: leggiJson()
    )

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Logica condivisa da \(PiattaformaKt.nomePiattaforma())")
                .font(.headline)

            List(repository.carica(), id: \.id) { prodotto in
                VStack(alignment: .leading) {
                    Text(prodotto.nome)
                    Text("\(prodotto.prezzo, specifier: "%.2f") €")
                        .font(.caption)
                }
            }
        }
        .padding()
    }
}

private func leggiJson() -> String {
    guard let url = Bundle.main.url(forResource: "prodotti", withExtension: "json"),
          let testo = try? String(contentsOf: url, encoding: .utf8) else {
        return "[]"
    }
    return testo
}
```

Il modulo Kotlin si chiama `PiattaformaKt` perché il file è `Piattaforma.kt`: i file Kotlin senza classe generano un oggetto con il nome del file e il suffisso `Kt`. I tipi Kotlin arrivano in Swift con i nomi delle classi: `Prodotto` resta `Prodotto`, `List<Prodotto>` diventa `[Prodotto]`.

Non serve completare iOS per considerare la settimana riuscita: l'obiettivo minimo è Android che usa il modulo condiviso. iOS è il passaggio successivo, quando hai un Mac e Xcode.

### Engine HTTP per piattaforma

Se nel modulo condiviso vuoi usare Ktor, l'engine resta specifico. In `commonMain`:

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

expect fun creaHttpClient(): HttpClient

fun HttpClientConfig<*>.configurazioneComune() {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        requestTimeoutMillis = 10_000
        connectTimeoutMillis = 5_000
    }
    expectSuccess = true
}
```

In `androidMain`:

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp

actual fun creaHttpClient(): HttpClient = HttpClient(OkHttp) {
    configurazioneComune()
}
```

In `iosMain`:

```kotlin
import io.ktor.client.HttpClient
import io.ktor.client.engine.darwin.Darwin

actual fun creaHttpClient(): HttpClient = HttpClient(Darwin) {
    configurazioneComune()
}
```

La configurazione (JSON, timeout, gestione errori) è scritta una volta sola; cambia solo il motore che esegue le richieste.

### Errori comuni

- **Classe Android in `commonMain`.** `Context`, `Log`, `Uri` non esistono su iOS: sposta il codice in `androidMain` o passa dal chiamante.
- **Engine HTTP mancante.** Ktor lancia "No engine found" se manca `ktor-client-okhttp` o `ktor-client-darwin` nel source set giusto.
- **`expect` senza `actual`.** La build si ferma sul target scoperto; aggiungi l'`actual` per ogni piattaforma.
- **`actual` con firma diversa.** Tipi, parametri e valore di ritorno devono coincidere con l'`expect`.
- **`baseName` diverso da quello importato.** Se scrivi `baseName = "Shared"`, in Swift l'import è `import Shared`, non `import shared`.
- **`jvmTarget` diverso tra i moduli.** Android e `shared` devono usare la stessa versione Java, per esempio 11.
- **Versione del plugin serialization diversa da Kotlin.** I due plugin devono avere la stessa versione.
- **Framework iOS non aggiornato.** Dopo una modifica a `shared`, rigenera il framework e fai clean build in Xcode.
- **Architettura sbagliata del simulatore.** Su Apple Silicon serve `iosSimulatorArm64`; su Intel `iosX64`.
- **Risorsa letta dal modulo sbagliato.** Il JSON sta negli asset dell'app, non in `shared`; il modulo riceve il testo.
- **Test con JUnit in `commonTest`.** Usa `kotlin.test`: è l'unica API disponibile su tutti i target.
- **Gradle non sincronizzato.** Dopo aver aggiunto un modulo o un target, esegui **Sync Project with Gradle Files**.

## Esercizi progressivi

**Esercizio 1.** Crea un progetto con due moduli, `shared` e `androidApp`, e fai comparire a schermo una stringa letta da `shared`. All'avvio l'app deve mostrare `Messaggio dal modulo condiviso`.

**Esercizio 2.** Aggiungi `nomePiattaforma()` con `expect`/`actual` e mostrala nell'app Android. Su Android l'output deve essere `Piattaforma: Android`.

**Esercizio 3.** Implementa `Validatore.email` e verificala con tre indirizzi validi e tre non validi. L'output dei test deve essere `Validi: 3, Non validi: 3`.

**Esercizio 4.** Implementa `Validatore.password` con almeno tre regole e altrettanti test. Ogni regola deve avere un messaggio distinto, non un generico `Password non valida`.

**Esercizio 5.** Aggiungi `Validatore.importo` e usala in un campo numerico Android. Con `-5` deve comparire `L'importo deve essere positivo`; con `12,50` deve essere accettato.

**Esercizio 6.** Crea `Sconto` e `CalcolatoreSconto` con soglia minima e arrotondamento a due decimali. Con soglia 50 e sconto 10%, `80` deve diventare `72.00`; `40` deve restare `40.00`.

**Esercizio 7.** Scrivi due test per lo sconto: sopra e sotto la soglia. Aggiungi il caso esattamente uguale alla soglia e decidi nel test se lo sconto si applica.

**Esercizio 8.** Crea `TabellaTassi` e converti 100 EUR in USD e in GBP. Con tassi 1.08 e 0.85 l'output deve essere `108.00 USD` e `85.00 GBP`.

**Esercizio 9.** Gestisci la valuta sconosciuta con un'eccezione e verificala con `assertFailsWith`. Il messaggio deve contenere il codice della valuta non supportata.

**Esercizio 10.** Definisci `Prodotto`, il DTO e la funzione di mappatura; carica una lista da una stringa JSON. Con due prodotti l'output deve essere `Prodotti: 2` e il nome del primo.

**Esercizio 11.** Aggiungi al JSON un campo che il DTO non conosce e verifica che il parsing funzioni. La configurazione deve usare `ignoreUnknownKeys = true`; senza di essa il test deve fallire.

**Esercizio 12.** Crea `RepositoryProdottiJson` e mostrala in una `LazyColumn` Android. Ogni riga deve mostrare nome, prezzo e categoria; con lista vuota deve comparire `Nessun prodotto`.

**Esercizio 13.** Sposta un controllo di business dalla schermata Android al modulo `shared` e aggiorna i test. Dopo lo spostamento la schermata non deve contenere condizioni su prezzi, sconti o validazione.

**Esercizio 14.** Esegui `:shared:testDebugUnitTest` e `:androidApp:assembleDebug`; se hai un Mac, genera anche il framework iOS. L'esito atteso è `BUILD SUCCESSFUL` per entrambi i comandi.

### Consolidamento (livello avanzato)

**Esercizio 15.** Crea `ValidatoreForm` in `commonMain` che riceve email, password e importo e restituisce una `List<String>` di errori. Con tutti i campi vuoti deve restituire tre errori distinti; con dati validi una lista vuota. Scrivi test comuni per entrambi i casi.

**Esercizio 16.** Aggiungi una cache al convertitore valute: la seconda conversione della stessa coppia non deve rileggere la tabella. Con un contatore nella tabella finta l'output dopo due conversioni EUR→USD deve essere `Letture tabella: 1`.

**Esercizio 17.** Crea uno sconto per categoria e scegli il migliore tra due sconti applicabili. Con `Elettronica` 15% e `Buono` 10% su un prodotto da 200 deve vincere lo sconto di categoria; il risultato deve essere `170.00` e il test deve dire quale sconto ha vinto.

**Esercizio 18.** Aggiungi al modulo condiviso uno `ProdottiStore` con `StateFlow` e usalo da Android. Con repository finto lo store deve passare da `Caricamento` a `Successo`; con repository che lancia un errore deve passare a `Errore`, senza crash dell'app.

**Esercizio 19.** Aggiungi al repository JSON un metodo `cerca(testo)` e gestisci lo stato vuoto. Con `"xyz"` la UI deve mostrare `Nessun prodotto trovato`; con `"pen"` solo i prodotti corrispondenti. Il filtro deve stare in `commonMain` e avere un test.

**Esercizio 20.** Costruisci una demo Android con due schermate che usano lo stesso modulo: una per la validazione del form e una per il catalogo prodotti. Esegui i test comuni, genera l'APK e scrivi nel README quali classi vivono in `shared`, quali in `androidApp` e perché. Criterio: una persona esterna riesce a eseguire la demo seguendo il README.

### Varianti

- Aggiungi un `Sconto` per categoria e scegli il migliore tra due sconti.
- Aggiungi al convertitore una cache delle conversioni già calcolate.
- Aggiungi al repository un filtro per categoria e un metodo `cerca(testo)`.
- Aggiungi al modulo condiviso uno `ProdottiStore` con `StateFlow` e usalo da Android.
- Aggiungi un test che verifichi che un importo negativo fallisca con `require`.
- Sposta la validazione del form in un unico `ValidatoreForm` che restituisce una lista di errori.

## Progetti della settimana 4

### Progetto 1: Modulo condiviso per validazione e sconto

Requisiti:

- progetto con `shared` e `androidApp`;
- `Validatore` con email, password e importo;
- `Sconto` e `CalcolatoreSconto` con soglia minima;
- schermata Android con campi, messaggi di errore e risultato;
- nessuna regola di validazione o calcolo dentro il composable;
- test comuni per validazione e sconto;
- `nomePiattaforma()` mostrato a schermo;
- build `assembleDebug` funzionante.

### Progetto 2: Convertitore valute con tassi JSON

Requisiti:

- `TabellaTassi` deserializzata da un JSON locale;
- `ConvertitoreValute` con formula unica per tutte le coppie;
- elenco valute letto dalla tabella, senza valori hardcoded nella UI;
- schermata Android con importo, valuta di partenza, valuta di arrivo e risultato;
- gestione di importo non valido e valuta sconosciuta;
- test per EUR→USD, USD→EUR e valuta sconosciuta;
- nessun accesso a file dentro `commonMain`.

### Progetto 3: Repository prodotti con JSON locale

Requisiti:

- `Prodotto`, DTO e mappatura;
- `RepositoryProdottiJson` che riceve il testo e restituisce una lista immutabile;
- JSON negli asset Android con almeno sei prodotti e un campo sconosciuto;
- lista Android con nome, prezzo e categoria;
- ricerca per nome nel repository condiviso;
- test comuni su parsing, campi sconosciuti e ricerca;
- messaggio di stato vuoto quando il filtro non trova nulla.

### Progetto 4: Versione iOS del progetto 2 (facoltativo)

Requisiti:

- progetto Xcode collegato al framework `Shared`;
- conversione eseguita dalla stessa classe Kotlin;
- tabella tassi letta dal bundle iOS;
- interfaccia SwiftUI con campi e risultato;
- framework rigenerato dopo ogni modifica a `shared`;
- nessuna logica di conversione riscritta in Swift.

### Criteri di verifica

- [ ] Il modulo `shared` non importa classi Android o iOS.
- [ ] `commonMain` contiene validazione, calcoli, modelli e repository.
- [ ] Ogni `expect` ha un `actual` per tutti i target dichiarati.
- [ ] L'app Android usa le classi condivise senza duplicare regole.
- [ ] Le risorse vengono lette dalla piattaforma e passate come dati.
- [ ] I test comuni girano con `:shared:testDebugUnitTest`.
- [ ] La build `:androidApp:assembleDebug` produce un APK.
- [ ] Il framework iOS si genera su macOS, se i target sono attivi.
- [ ] Gli errori di validazione sono testi chiari, non eccezioni.
- [ ] La struttura del progetto è spiegabile in due minuti.

Hai chiuso il primo ciclo KMP: logica scritta una volta, testata una volta, usata da Android e, se vuoi, da iOS. Nel **piano di 90 giorni** questo modulo diventa la base di un progetto vero, con API, stato, test e una demo da mostrare.
