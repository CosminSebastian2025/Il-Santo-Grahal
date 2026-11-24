# Duplicati, sovrapposizioni e ambiguità

**Rapporto:** `audit/DUPLICATES_AND_AMBIGUITIES.md`
**Data:** 24 novembre 2026

---

## 1. Duplicati documentali veri e propri

**Non esistono documenti duplicati.** I 137 file Markdown hanno percorsi e titoli distinti; nessuna pagina ripete integralmente un'altra. La verifica è stata fatta su nomi file, titoli e prime sezioni.

Esistono però **sovrapposizioni tematiche**: lo stesso argomento è spiegato in più corsi. In alcuni casi è fisiologico (un ripasso serve), in altri è un rischio: la stessa nozione può divergere tra corsi senza che nessuno se ne accorga.

Nessuna voce dell'inventario è stata classificata `DUPLICATO`: le 218 voci hanno nomi normalizzati tutti distinti (verifica automatica: 0 collisioni).

---

## 2. Sovrapposizioni tra corsi

| Argomento | Dove appare | Evidenza | Valutazione | Azione proposta |
|---|---|---|---|---|
| **JSON** | C#, Java, Kotlin, KMP, JavaScript, React, React Native | 418 occorrenze in 43 documenti | Rischio alto: stesso formato spiegato con esempi diversi in sette corsi | Una pagina di riferimento unica; i corsi la richiamano |
| **API** | Java, React, JavaScript, React Native | 222 occorrenze in 39 documenti | Rischio alto: il concetto resta applicativo e frammentato | Percorso "API" autonomo + richiami |
| **HTML** | React settimana 1; JavaScript settimane 4 e 9; React Native | 87 occorrenze in 17 documenti | Rischio medio: le basi sono date per scontate | Percorso HTML autonomo; i corsi lo presuppongono |
| **CSS** | React settimana 1; JavaScript; React Native | 40 occorrenze in 10 documenti | Rischio medio: manca una progressione | Percorso CSS + SCSS; i corsi lo presuppongono |
| **TypeScript** | React settimana 4; React Native fase 7 | 56 occorrenze in 7 documenti | Rischio alto: due introduzioni parziali e non allineate | Percorso TypeScript unico |
| **HTTP/HTTPS** | C#, Java, Kotlin, KMP, React, JavaScript, React Native | 37 occorrenze in 16 documenti | Rischio alto: insegnato solo come "uso di API" | Percorso HTTP con header, status, caching, TLS |
| **REST/SOAP** | Java, React | 17 occorrenze in 8 documenti | SOAP è assente; REST è applicativo | Percorso REST; SOAP come confronto storico |
| **SQL** | Java lezioni 21–23 | 57 occorrenze in 7 documenti; 3 lezioni | Argomento dichiarato ma incapsulato in Java | Estrarre in percorso Database; Java lo richiama |
| **Git/GitHub** | Java lezione 16; JavaScript settimana 9; workflow CI | 33 occorrenze in 9 documenti + 3 workflow | Git non è dichiarato; GitHub sì | Introdurre "Git" come argomento, "GitHub" come piattaforma |
| **Docker** | Java lezione 30 | 37 occorrenze in 6 documenti | Una sola sezione per un argomento dichiarato | Percorso Container autonomo |
| **Docker Compose** | Java lezione 30 | 11 occorrenze in 1 documento | Solo esempio | Trattamento autonomo dentro il percorso Container |
| **Redis** | Java lezione 30; README; cache Rust | 17 occorrenze in 1 documento + README | Doppio ruolo: lezione e infrastruttura del progetto | Separare "Redis come argomento" da "cache dell'app" |
| **CI/CD** | Java lezione 30; 3 workflow GitHub | 5 occorrenze in 3 documenti + 3 workflow | Solo un esempio | Percorso CI/CD con pipeline reali |
| **YAML** | Java lezione 30 (esempi Compose) | 6 occorrenze in 1 documento | Usato ma non spiegato | Pagina formato YAML |
| **Next.js** | React settimane 5–6; il progetto stesso | 13 occorrenze in 3 documenti + 9 nel codice | Didattica minima rispetto all'uso reale | Percorso Next.js |
| **Tailwind CSS** | React settimana 4 | 16 occorrenze in 2 documenti | Una sezione | Percorso CSS moderno |
| **Ktor** | Kotlin settimana 7; KMP settimana 4 | 65 occorrenze in 7 documenti | Due contesti, nessun percorso backend | Percorso Ktor |
| **Spring Boot** | Java lezioni 24–25 | 70 occorrenze in 12 documenti; 2 lezioni | Backend Java concentrato in due lezioni | Percorso backend Spring |
| **XSS** | React settimana 5; Java lezione 28 | 3 occorrenze in 2 documenti | Frammentario | Percorso sicurezza web (XSS, CSRF, CSP) |
| **Algoritmi** | C++ giorno 23 (STL); Java lezione 29 | 14 occorrenze in 6 documenti | Solo STL e menzioni | Percorso fondamenti (complessità, strutture dati) |
| **Ottimizzazione** | React, React Native, Compose | 19 occorrenze in 8 documenti | Consigli sparsi, nessun metodo | Pagina trasversale su profiling e misure |
| **Kotlin** | Kotlin, Compose, KMP | Tre corsi che ripartono dalle basi Kotlin | Rischio di ripetizione | Dichiarare Kotlin come prerequisito; Compose/KMP fanno solo richiami |
| **Compose** | Compose (Android) e KMP (multipiattaforma) | Contenuti affini in due percorsi | Confusione tra Jetpack Compose e Compose Multiplatform | Chiarire nel catalogo con due schede distinte |
| **React/React Native** | React (web) e React Native (mobile) | Basi React ripetute | Fisiologico, ma senza richiami espliciti | Prerequisito React dichiarato per React Native |

### 2.1 Perché non vanno eliminati

Queste sovrapposizioni **non sono duplicati da cancellare**. Ogni corso ha bisogno di un minimo di ripasso per essere autonomo. Il problema è editoriale, non di pulizia: manca un livello di riferimento unico a cui i corsi rimandino. La soluzione proposta è un catalogo con pagine "canoniche" e corsi che le richiamano, non la rimozione di contenuti.

---

## 3. Argomenti presenti nel repository ma assenti dall'inventario — risolto

Questo è il disallineamento più importante emerso dal censimento. **È stato risolto** con la decisione dell'autore di aggiungere React e React Native come voci esplicite e di interpretare `js` come JavaScript.

| Corso nel repository | Documenti | Righe | Presenza nell'inventario |
|---|---:|---:|---|
| **JavaScript** (`8-JS`) | 11 | 2.890 | Voce esplicita `JavaScript` (sostituisce la voce ambigua `js`) |
| **React** (`9-React`) | 8 | 2.691 | Voce esplicita 217, `PRESENTE` |
| **React Native** (`10-ReactNative`) | 9 | 3.290 | Voce esplicita 218, `PRESENTE` |

**Totale già dichiarato: 28 documenti e 8.871 righe**, pari al 20,4% dei documenti e al 23,9% delle righe del repository.

Conseguenze:

1. Il conteggio "209 argomenti" non descriveva il repository: descriveva un elenco che ignorava tre corsi completi.
2. L'inventario ufficiale passa da 216 a **218 voci**: React e React Native sono aggiunte; `js` è sostituita da JavaScript, non duplicata.
3. Restano non dichiarati Git ed Expo/EAS, documentati nella sezione 3.1: sono dettagli operativi o contenuti interni ai corsi, non corsi autonomi.

**Decisione D1 (risolta):** React e React Native sono voci esplicite dell'inventario; JavaScript è riconosciuto come corso primario. Il catalogo li tratta come percorsi, non come tecnologie secondarie.

### 3.1 Altri contenuti reali non dichiarati

| Contenuto | Evidenza | Nota |
|---|---|---|
| **Git** | Java lezione 16; JavaScript settimana 9; workflow | Dichiarato solo "GitHub"; Git come strumento è assente dall'inventario |
| **Cache applicativa (Rust/Redis)** | `src-tauri/src/cache.rs`, README | È infrastruttura del prodotto, non argomento didattico |
| **Tauri** | `src-tauri/` | Usato dal progetto; dichiarato ma `ASSENTE` come contenuto |
| **Next.js** | 3 documenti + codice | Dichiarato `PARZIALE`, ma è la piattaforma del sito |
| **Expo / EAS** | React Native fasi 1–8 | Non dichiarati; probabilmente voluti come dettagli del corso RN |
| **Markdown** | Formato di tutti i 137 documenti | Dichiarato `ASSENTE` come argomento didattico |
| **GitHub Actions** | 3 workflow reali | Voce `Workflow` confermata come GitHub Actions; il contenuto esiste come configurazione e ora è classificato `PARZIALE` |

---

## 4. Nomi ambigui: le dieci ambiguità, tutte confermate

Queste voci sono state sottoposte all'autore, che ne ha confermato l'interpretazione. Il CSV riporta ora il nome normalizzato definitivo; nessuna resta `DA VERIFICARE`.

| # | Nome originale | Ipotesi | Evidenza nel repository | Esito confermato |
|---|---|---|---|---|
| 1 | `Apache` | Apache HTTP Server | 5 occorrenze, tutte "Apache Maven" (Java lezione 17) | Apache HTTP Server (server web) |
| 2 | `Workflow` | GitHub Actions workflow | 4 occorrenze in Java lezione 30 | GitHub Actions; classificato `PARZIALE` |
| 3 | `DSN` | DNS oppure Data Source Name | 0 occorrenze; DNS non era in inventario | Refuso per DNS |
| 4 | `IOS Cisco` | Cisco IOS | 0 occorrenze | Cisco IOS (sistema operativo di rete, non iOS) |
| 5 | `js` | JavaScript oppure Vue.js | 186 occorrenze come "JavaScript"/"Next.js"; nessun Vue.js | JavaScript, non Vue.js |
| 6 | `Autolt` | AutoIt | 0 occorrenze | Refuso per AutoIt (automazione Windows) |
| 7 | `Trunk(informatica)` | Trunk build tool (Rust/WASM) | 0 occorrenze | Trunk build tool |
| 8 | `VTL` | Velocity Template Language | 0 occorrenze; "Velocity" è in inventario | Velocity Template Language, distinto dal motore Velocity |
| 9 | `Linkered` | Linkerd | 0 occorrenze | Refuso per Linkerd (service mesh) |
| 10 | `Consult(informatica)` | Consul | "consul" compare solo dentro parole italiane | Refuso per Consul (HashiCorp) |

### 4.1 Ambiguità aggiuntive segnalate e confermate

| Nome | Problema | Evidenza | Ipotesi |
|---|---|---|---|
| `ToIP` | Acronimo raro | 0 occorrenze | "Telephony over IP", distinto da VoIP: confermato dall'autore |
| `Pascal(informatica)` | Il qualificatore è stato aggiunto per distinguerlo da "PascalCase" | 8 falsi positivi | Linguaggio Pascal |
| `ATM(informatica)` | Il qualificatore evita l'omonimia con ATM (bancomat) | 0 occorrenze | Asynchronous Transfer Mode |
| `Qwik(informatica)` | Il qualificatore evita l'omonimia con parole inglesi | 0 occorrenze | Framework Qwik |
| `Quic(informatica)` | Il qualificatore evita falsi positivi | 0 occorrenze | Protocollo QUIC |
| `NetBird`, `Pangolin`, `Frigate`, `Dozzle` | Nomi comuni usati come prodotti: il qualificatore è una precauzione | 0 occorrenze | Prodotti software omonimi |

**Regola applicata:** nessuna di queste voci è stata trasformata in un argomento diverso. Le ipotesi sono state dichiarate all'autore e confermate; ToIP resta distinto da VoIP nel catalogo.

---

## 5. Normalizzazioni applicate (34)

Le normalizzazioni sono di tre tipi. Il terzo gruppo è stato confermato dall'autore.

### 5.1 Ortografia e maiuscole (17) — rischio basso

| Originale | Normalizzato |
|---|---|
| Typescript | TypeScript |
| Tailwindcss | Tailwind CSS |
| Powershell | PowerShell |
| QT | Qt |
| Github | GitHub |
| FFMPEG | FFmpeg |
| Emacs-Lisp | Emacs Lisp |
| Meteorjs | Meteor.js |
| Apisix | APISIX |
| Bunkerweb | BunkerWeb |
| Fluentbit | Fluent Bit |
| Yubikey | YubiKey |
| X509 | X.509 |
| ED25519 | Ed25519 |
| RedPanda | Redpanda |
| Quic(informatica) | QUIC |
| JakartaEE | Jakarta EE |

### 5.2 Disambiguatori (7) — rischio basso

`Pascal(informatica)` → Pascal; `ATM(informatica)` → ATM; `Qwik(informatica)` → Qwik; `NetBird(informatica)` → NetBird; `Pangolin(informatica)` → Pangolin; `Frigate(informatica)` → Frigate; `Dozzle(informatica)` → Dozzle.

Il qualificatore è stato rimosso perché non fa parte del nome dell'argomento; la disambiguazione resta nel campo `problemi_rilevati`.

### 5.3 Ipotesi confermate (10) — rischio risolto

Sono le stesse dieci voci della sezione 4: `Apache` → Apache HTTP Server, `Workflow` → GitHub Actions, `DSN` → DNS, `IOS Cisco` → Cisco IOS, `js` → JavaScript, `Autolt` → AutoIt, `Trunk(informatica)` → Trunk (build tool), `VTL` → Velocity Template Language, `Linkered` → Linkerd, `Consult(informatica)` → Consul.

Il CSV applica ora la normalizzazione definitiva nel campo `nome_normalizzato`, senza annotazioni "(da confermare)". Il catalogo può essere generato; la forma originale resta nel campo `nome_originale`, quindi ogni normalizzazione è reversibile.

---

## 6. Argomenti simili che NON vanno fusi

La somiglianza lessicale non implica equivalenza. Queste coppie/gruppi devono restare distinti nel catalogo.

| Gruppo | Perché restano distinti |
|---|---|
| **SSL / TLS** | Protocolli diversi; TLS è il successore. Vanno insegnati insieme ma con due schede distinte (SSL storica, TLS attuale). |
| **Proxy / Reverse proxy** | Direzioni e casi d'uso diversi; il primo è lato client, il secondo lato server. |
| **VPN / Tailscale / Headscale / NetBird** | VPN è la categoria; gli altri sono prodotti/implementazioni. |
| **VoIP / ToIP / PSTN / SIP / RTP / H.323** | VoIP è la categoria; ToIP è un sinonimo discusso; PSTN è la rete telefonica tradizionale; SIP, RTP e H.323 sono protocolli. |
| **Cloud / Cloudflare / Bunny.net** | Cloud è il modello; Cloudflare e Bunny.net sono fornitori con funzioni diverse (CDN, DNS, WAF, edge). |
| **Docker / Podman** | Docker è lo standard di fatto; Podman è l'alternativa rootless. Confronto utile, non fusione. |
| **Kubernetes / Helm / Istio** | Orchestratore vs package manager vs service mesh. |
| **ModSecurity / WASP CRS / Coraza / BunkerWeb** | Motore WAF vs set di regole vs motore alternativo vs appliance che li integra. |
| **Kong / APISIX / Envoy** | API gateway concorrenti con modelli diversi. |
| **React / React Native** | Web vs mobile; condividono il modello a componenti, non la piattaforma. |
| **Kotlin / KMP / Compose** | Linguaggio vs piattaforma multipla vs toolkit UI. |
| **Jetpack Compose / Compose Multiplatform** | UI Android vs UI multipiattaforma; il repository ha un corso Compose e uno KMP. |
| **CQL / SQL** | Linguaggi diversi per database diversi. |
| **C / C++ / C# / Objective-C** | Linguaggi distinti, non varianti. |
| **Batchfile / PowerShell** | Entrambi Windows, ma sintassi, modello e casi d'uso diversi. |
| **YAML / HCL** | Formati di configurazione con scopi diversi. |
| **REST / SOAP** | Stili di API diversi; SOAP non è una versione di REST. |
| **Pascal (linguaggio) / PascalCase** | Omonimia solo grafica. |
| **R (linguaggio) / `R.drawable`** | Falso positivo ricorrente nel codice Android. |
| **Go / Expo Go** | "Go" compare solo in "Expo Go": falso positivo. |
| **OS / `Platform.OS` / Wear OS** | Falsi positivi; il sistema operativo come argomento è assente. |
| **Scala (linguaggio) / "scala" italiana** | Falso positivo: la parola italiana "scala" compare nei testi. |
| **Vue / "vue"** | Nessuna occorrenza del framework; `js` è stato confermato come JavaScript, quindi Vue resta un argomento mancante. |

---

## 7. Discrepanza 209 vs 216 vs 218

L'elenco dichiarato, separato sulle virgole, produce **216 voci**, non 209. Le 7 voci in più non sono ricostruibili con certezza: il conteggio manuale può aver trattato come una sola voce alcune espressioni composte. Possibili candidati alla differenza:

- `Flutter & Dart` (due tecnologie in una voce)
- `RTP e RTCP` (due protocolli in una voce)
- `Client/Server` (due ruoli)
- `REST/SOAP` (due stili)
- `HTTP/HTTPS` (due protocolli)
- `NAT/PAT` (due tecniche)
- `1C:Enterprise`, `X.509`, `H.323` (nomi composti)

**Il CSV usa 218 righe**: 216 voci effettive, più React e React Native aggiunte come voci esplicite su decisione dell'autore. JavaScript sostituisce `js` e non aggiunge una riga. La differenza 209 → 216 resta documentata, non nascosta; il numero ufficiale è 218.

---

## 8. Decisioni dell'autore

| ID | Decisione | Risposta | Effetto |
|---|---|---|---|
| **D1** | Aggiungere JavaScript, React e React Native all'inventario? | Sì: React e React Native come voci esplicite; JavaScript sostituisce `js`. | Inventario ufficiale **218**; React e React Native `PRESENTE`. |
| **D2** | `js` è JavaScript o Vue.js? | JavaScript. | Nessun duplicato; Vue resta mancante. |
| **D3** | `DSN` è DNS o Data Source Name? | DNS. | Networking; diventa la decima P0. |
| **D4** | `Apache` è HTTP Server o Maven? | Apache HTTP Server. | Area 13; classificato `ASSENTE`. |
| **D5** | `Workflow` è GitHub Actions o un motore generico? | GitHub Actions. | Area 17; classificato `PARZIALE` (3 workflow reali). |
| **D6** | `Trunk` è build tool, trunk-based development o SVN? | Trunk build tool. | Area 17; `ASSENTE`. |
| **D7** | `VTL` è Velocity Template Language? | Sì, distinto dal motore Velocity. | Area 18; `ASSENTE`; nessuna fusione con Velocity. |
| **D8** | Confermare i refusi `Autolt` → AutoIt, `Linkered` → Linkerd, `Consult` → Consul, `IOS Cisco` → Cisco IOS. | Confermati. | Nomi normalizzati definitivi. |
| **D9** | `ToIP` è sinonimo di VoIP o un argomento distinto? | Distinto. | Due schede separate, come da sezione 6. |
| **D10** | `Git` va aggiunto come argomento distinto da GitHub? | Non aggiunto: l'autore ha chiesto solo React e React Native. | Git resta contenuto reale non dichiarato (sezione 3.1); non blocca il catalogo. |
| **D11** | L'inventario ufficiale è 209 o 216? | 216 dichiarate, **218 ufficiali** dopo le aggiunte. | Conteggio di riferimento: 218; copertura 34/218. |
| **D12** | Le voci di nicchia sono deliberate o residui? | Restano tutte: il mandato impone di conservare ogni argomento dichiarato. | 89 voci P3 restano enciclopedia a lungo termine. |

Tutte le risposte sono state applicate solo a CSV e rapporti di audit; nessun contenuto didattico è stato modificato. La migrazione non è iniziata.

---

## 9. Collegamenti

- Dettaglio di ogni voce: `audit/CONTENT_INVENTORY.csv`
- Classificazione e tassonomia: `audit/CONTENT_CLASSIFICATION.md`
- Priorità dei mancanti: `audit/MISSING_TOPICS.md`
- Catalogo proposto: `audit/PROPOSED_ARCHITECTURE.md`
