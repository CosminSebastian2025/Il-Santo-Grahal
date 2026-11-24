# Classificazione dei contenuti

**Rapporto:** `audit/CONTENT_CLASSIFICATION.md`
**Fonte primaria:** `audit/CONTENT_INVENTORY.csv` (218 voci)
**Data:** 24 novembre 2026

---

## 1. Metodo

Ogni voce dell'inventario dichiarato è stata:

1. **normalizzata** solo quando la corrispondenza era certa (es. `Typescript` → TypeScript); i nomi ambigui o sospetti refusi sono stati sottoposti all'autore, che ne ha confermato l'interpretazione (10 casi, riportati in `DUPLICATES_AND_AMBIGUITIES.md`);
2. **confrontata** con i 137 documenti di `public/docs` tramite ricerca testuale su tutto il corpus (titoli, paragrafi, blocchi di codice, nomi file);
3. **verificata a campione** con lettura dei documenti chiave per distinguere un contenuto reale da una menzione incidentale;
4. **classificata** con una categoria primaria e zero o più categorie secondarie;
5. **misurata** con livello stimato, tipo, dipendenze, problemi ed evidenza.

Le categorie sono le 18 aree richieste. Un argomento ha **una sola categoria primaria**: le secondarie servono a rappresentare i legami (es. Docker è primariamente DevOps, secondariamente Backend e Server).

### Definizioni di stato

| Stato | Definizione operativa usata |
|---|---|
| **PRESENTE** | Esiste almeno una lezione o pagina dedicata principalmente all'argomento, oppure l'argomento è trattato in modo ricorrente e strutturato in più percorsi. |
| **PARZIALE** | Esiste materiale, ma solo come sezione interna a una lezione di un altro argomento, come menzione operativa o come uso nel progetto; manca un percorso/pagina di riferimento. |
| **ASSENTE** | Non esiste contenuto didattico. Sono inclusi i casi di sola citazione incidentale o di falsa corrispondenza. |
| **DA VERIFICARE** | Il nome è ambiguo, è un probabile refuso o la corrispondenza non è determinabile senza conferma dell'autore. Nessuna voce resta in questo stato dopo la conferma dell'autore. |
| **DUPLICATO** | Più documenti trattano lo stesso argomento con contenuto sovrapposto. |
| **OBSOLETO** | Contenuto che richiede verifica tecnica perché riferito a versioni o pratiche superate. |

**Nessuna voce è stata classificata DUPLICATO o OBSOLETO.** Le sovrapposizioni esistenti sono intenzionali o gestibili e sono descritte in `DUPLICATES_AND_AMBIGUITIES.md`; non c'è duplicazione documentale vera e propria (137 file = 137 pagine uniche). L'obsolescenza non è dimostrabile senza una verifica versione-per-versione: è un rischio, non un fatto, ed è stato registrato come tale.

---

## 2. Distribuzione complessiva

| Stato | Voci | Percentuale |
|---|---:|---:|
| PRESENTE | 13 | 6,0% |
| PARZIALE | 21 | 9,6% |
| ASSENTE | 184 | 84,4% |
| DA VERIFICARE | 0 | 0% |
| **Totale** | **218** | **100%** |

**Voci con materiale (presenti + parziali): 34 su 218 (15,6%).**

Il dato va letto insieme alla profondità: i 10 percorsi esistenti sono solidi e coprono 37.103 righe. Il problema non è la qualità del poco che c'è, ma la distanza tra la profondità di 13 argomenti e l'ampiezza di 218.

---

## 3. Tassonomia e copertura per area

| # | Area | Totale | Presente | Parziale | Assente | Da verificare |
|---|---|---:|---:|---:|---:|---:|
| 1 | Linguaggi di programmazione | 40 | 6 | 1 | 33 | 0 |
| 2 | Fondamenti di informatica | 2 | 0 | 2 | 0 | 0 |
| 3 | Web development e frontend | 18 | 1 | 4 | 13 | 0 |
| 4 | Backend development | 15 | 1 | 1 | 13 | 0 |
| 5 | Mobile development | 6 | 3 | 0 | 3 | 0 |
| 6 | Desktop development | 5 | 0 | 0 | 5 | 0 |
| 7 | Database e dati | 7 | 1 | 1 | 5 | 0 |
| 8 | API e comunicazione | 7 | 0 | 3 | 4 | 0 |
| 9 | Sistemi operativi | 4 | 0 | 1 | 3 | 0 |
| 10 | Networking e telecomunicazioni | 30 | 0 | 0 | 30 | 0 |
| 11 | Cybersecurity e crittografia | 21 | 0 | 2 | 19 | 0 |
| 12 | DevOps e infrastruttura | 19 | 0 | 3 | 16 | 0 |
| 13 | Server e reverse proxy | 13 | 0 | 0 | 13 | 0 |
| 14 | Cloud e architetture distribuite | 7 | 0 | 0 | 7 | 0 |
| 15 | AI e data science | 2 | 0 | 0 | 2 | 0 |
| 16 | Game development e grafica | 5 | 0 | 0 | 5 | 0 |
| 17 | Automazione e strumenti | 10 | 1 | 2 | 7 | 0 |
| 18 | Formati e documentazione tecnica | 7 | 0 | 1 | 6 | 0 |
| | **Totale** | **218** | **13** | **21** | **184** | **0** |

### 3.1 Linguaggi di programmazione (40)

**Presenti (6):** C, C++, C#, Java, Kotlin, JavaScript.
**Parziale (1):** TypeScript (due sezioni dentro React e React Native).
**Assenti (33):** PHP, Golang, Python, Ruby, Zig, Lua, R, Starlark, OCaml, Erlang, Elixir, Perl, Fortran, Pascal, Objective-C, Objective-C++, Scala, F#, Rust, Clojure, Fennel, Emacs Lisp, Reason, SystemVerilog, Swift, Haskell, Tcl, Julia, MATLAB, COBOL, Solidity, Koka, Batchfile.

**Lettura:** l'area più forte del repository, ma copre 6 linguaggi general-purpose su oltre 30 dichiarati. Mancano sia linguaggi molto richiesti (Python, PHP, Go, Swift) sia linguaggi di nicchia che completano l'enciclopedia (Haskell, OCaml, Erlang, Elixir, Scala, F#).

### 3.2 Fondamenti di informatica (2)

**Parziali (2):** Algoritmi (STL in C++, menzioni in Java), Ottimizzazione Codice (performance in React/RN/Compose).
**Assenti:** nessuna voce dichiarata.

**Lettura:** non esiste un percorso sui fondamenti. Gli algoritmi compaiono come conseguenza dell'STL, non come disciplina. L'inventario stesso non contiene voci per complessità, strutture dati o architettura del calcolatore: è una lacuna dell'elenco, oltre che del repository.

### 3.3 Web development e frontend (18)

**Presente (1):** React.
**Parziali (4):** HTML, CSS, Tailwind CSS, Next.js.
**Assenti (13):** JSP, Angular, Astro, MDX, Svelte, SCSS, Redux, Inertia.js, Vue, Nuxt.js, Qwik, Leptos, Meteor.js.

**Lettura:** il web è rappresentato quasi solo da React. HTML e CSS sono insegnati dentro React settimana 1, non come percorso. Manca un percorso frontend autonomo e mancano tutti gli altri framework.

### 3.4 Backend development (15)

**Presente (1):** Spring Boot (due lezioni dentro Java).
**Parziale (1):** Ktor (sezioni dentro Kotlin/KMP).
**Assenti (13):** Koin, Node.js, Bun.js, Servlet, Django, Flask, 1C:Enterprise, Multer, Livewire, Nest.js, Jakarta EE, Velocity, UploadThing.

**Lettura:** il backend esiste solo nell'ecosistema Java/Kotlin. Non c'è un percorso Node.js, Python o PHP, né una trattazione della piattaforma Jakarta EE (solo import nelle lezioni JPA).

### 3.5 Mobile development (6)

**Presenti (3):** Jetpack Compose, Kotlin Multiplatform, React Native.
**Assenti (3):** Flutter & Dart, NativeWind, Ionic.

**Lettura:** Android/KMP/React Native sono coperti bene; manca Flutter, il principale concorrente cross-platform, e mancano le soluzioni web-based (Ionic) e Tailwind-native (NativeWind).

### 3.6 Desktop development (5)

**Assenti (5):** Qt, Tauri, Electron, JavaFX, Dioxus.

**Lettura:** **Tauri è usato dal progetto stesso** (`src-tauri`), ma non esiste una lezione su Tauri. È il caso più evidente di tecnologia presente nel codice e assente nella didattica.

### 3.7 Database e dati (7)

**Presente (1):** SQL (tre lezioni dentro Java).
**Parziale (1):** Redis (sezione in Java 30 + README).
**Assenti (5):** Prisma, Drizzle, Neon, NewSQL, CQL.

**Lettura:** c'è un buon nucleo relazionale (tabelle, JOIN, transazioni, JDBC), ma mancano ORM moderni, database gestiti, NewSQL e Cassandra/CQL. Manca anche un percorso su modellazione e indici.

### 3.8 API e comunicazione (7)

**Parziali (3):** HTTP/HTTPS, REST/SOAP, API.
**Assenti (4):** WebSocket, WebTransport, Client/Server, Stripe.

**Lettura:** l'API è insegnata come consumo di servizi in Java, React, JavaScript e RN. Mancano la teoria (versioning, OpenAPI, auth, paginazione, idempotenza), i WebSocket e il modello client/server.

### 3.9 Sistemi operativi (4)

**Parziale (1):** Linux (solo setup ambiente).
**Assenti (3):** OS, FreeBSD, Bash (Bash è primariamente OS).

**Lettura:** non c'è un percorso su processi, memoria, filesystem, permessi, systemd, shell scripting. Linux compare solo come prerequisito per compilare.

### 3.10 Networking e telecomunicazioni (30)

**Presenti:** nessuno.
**Assenti (30):** SSH, Tailscale, Headscale, VPN, CCNA, DNS, DHCP, NAT/PAT, ICMP, SMTP, ATM, IPSec, Cisco IOS, GRE, Proxy, Ping, SNMP, VoIP, ToIP, QoS, PSTN, RTP e RTCP, SIP, H.323, VLAN, SDN, MPLS, QUIC, VRRP, NetBird.

**Lettura:** l'area più scoperta in assoluto. Non esiste un percorso di reti, né teorico né pratico. È un prerequisito per cybersecurity, DevOps, cloud e server.

### 3.11 Cybersecurity e crittografia (21)

**Parziali (2):** Cybersecurity applicativa, XSS.
**Assenti (19):** Ethical Hacker, Crittografia, SSL, TLS, CSRF, Kerberos, AES, Firewall, Brute-Force, X.509, RSA, Ed25519, ModSecurity, WASP CRS, SSO, YubiKey, mTLS, Coraza, GDPR.

**Lettura:** esistono solo due sezioni applicative (JWT/OAuth2 in Java, XSS in React). Mancano fondamenta crittografiche, TLS, identità, WAF e un percorso ethical hacking. È l'area con il maggiore divario tra importanza percepita e copertura.

### 3.12 DevOps e infrastruttura (19)

**Parziali (3):** Docker, Docker Compose, CI/CD.
**Assenti (16):** Podman, Podman Compose, Kubernetes, Terraform, Bicep, Nix, DevOps, Istio, Linkerd, Helm, Ansible, Fluent Bit, Corosync, Pacemaker, Harness, Dozzle.

**Lettura:** c'è un'unica lezione Java che tocca cache, code, Docker e CI/CD. Non c'è un percorso DevOps, né orchestrazione, IaC, service mesh o observability.

### 3.13 Server e reverse proxy (13)

**Assenti (13):** Apache HTTP Server, Nginx, Varnish, HAProxy, Traefik, Kong, APISIX, Caddy, BunkerWeb, OpenResty, Envoy Proxy, Consul, Pangolin.

**Lettura:** nessun contenuto sui server web e sui proxy, nonostante siano prerequisiti di deployment, TLS e sicurezza.

### 3.14 Cloud e architetture distribuite (7)

**Assenti (7):** Cloud, Bunny.net, Cloudflare, Redpanda, Raft, Paxos, Saga.

**Lettura:** nessun contenuto su modelli cloud, distribuzione, consenso o streaming. La voce "Cloud" è citata una volta sola in React Native.

### 3.15 AI e data science (2)

**Assenti (2):** AI, Frigate (applicazione AI, primariamente AI).

**Lettura:** area totalmente assente, nonostante Python, R, Julia e MATLAB siano nell'inventario. È una scelta editoriale legittima, ma va dichiarata.

### 3.16 Game development e grafica (5)

**Assenti (5):** Vulkan, OpenGL, Unity, ShaderLab, FFmpeg (primariamente Game/grafica).

**Lettura:** Unity è menzionato come sbocco del C#, ma non c'è contenuto. Nessuna API grafica, nessun motore, nessuna pipeline video.

### 3.17 Automazione e strumenti (10)

**Presente (1):** GitHub.
**Parziali (2):** CLI, GitHub Actions.
**Assenti (7):** PowerShell, Gherkin, yt-dlp, YASnippet, AutoIt, Trunk (build tool), n8n.

**Lettura:** GitHub è coperto in una lezione Java e nella pubblicazione JavaScript; GitHub Actions esiste solo nei tre workflow del repository. Manca Git come argomento autonomo, mancano shell scripting e automazione.

### 3.18 Formati e documentazione tecnica (7)

**Parziale (1):** JSON.
**Assenti (6):** YAML, HCL, Markdown (usato come formato dei documenti ma non insegnato), TeX, Roff, Velocity Template Language.

**Lettura:** i formati sono usati ovunque ma non spiegati. JSON è l'unico trattato, e solo come serializzazione dentro altri corsi.

---

## 4. Livello e tipo di argomento

### 4.1 Livello stimato

| Livello | Voci | Percentuale |
|---|---:|---:|
| Base | 25 | 11,5% |
| Intermedio | 95 | 43,6% |
| Avanzato | 98 | 45,0% |

La distribuzione è coerente con l'inventario: molti linguaggi e strumenti di nicchia sono avanzati. Il repository attuale, però, copre soprattutto il livello base/intermedio; l'offerta avanzata è quasi tutta da costruire. (Percentuali arrotondate: la somma può non essere esattamente 100%.)

### 4.2 Tipo di argomento (vocabolario controllato)

| Tipo | Voci |
|---|---:|
| Linguaggio | 49 |
| Framework/Libreria | 33 |
| Strumento | 30 |
| Protocollo | 19 |
| Tecnologia | 15 |
| Concetto/Teoria | 11 |
| Server/Proxy | 11 |
| Piattaforma | 10 |
| Standard/Formato | 7 |
| Disciplina | 7 |
| Architettura | 3 |
| Servizio cloud | 3 |
| Sistema operativo | 3 |
| Database/ORM | 3 |
| Pratica/Metodologia | 4 |
| API/Interfaccia | 3 |
| Ambiente runtime | 2 |
| Vulnerabilità | 2 |
| Normativa | 1 |
| Hardware | 1 |
| Applicazione | 1 |

I tipi sono stati normalizzati in un vocabolario controllato per rendere possibile filtri e statistiche. Il CSV riporta il tipo normalizzato; la categoria secondaria conserva le sfumature.

---

## 5. Lettura d'insieme

### 5.1 Che cosa racconta la mappa

Il repository è **forte in verticale e debole in orizzontale**:

- **Verticale:** sei linguaggi con percorsi da 9 a 31 documenti (C, C++, C#, Java, Kotlin, JavaScript), più React, React Native e mobile Android/KMP. Chi studia uno di questi trova un percorso completo.
- **Orizzontale:** mancano le aree che rendono un'informatico autonomo nel mondo reale: reti, sicurezza, sistemi operativi, database moderni, deployment, cloud, osservabilità.
- **Enciclopedia:** mancano glossario, riferimenti incrociati, metadati e ricerca. La piattaforma è una raccolta di corsi, non ancora un'enciclopedia.

### 5.2 Dove concentrare i prossimi sforzi

In ordine di leva:

1. **Rendere esplorabile ciò che esiste** (catalogo, routing, ricerca, metadati): trasforma 137 documenti in una biblioteca.
2. **Completare i 21 parziali** (sezione 2): TypeScript, HTML, CSS, Tailwind CSS, Next.js, Ktor, Redis, JSON, CI/CD, Docker, Docker Compose, HTTP/HTTPS, REST/SOAP, API, Cybersecurity applicativa, XSS, CLI, GitHub Actions, Linux, algoritmi e ottimizzazione del codice.
3. **Aprire le aree foundational mancanti:** reti, sicurezza, sistemi operativi, database non relazionali.
4. **Solo dopo:** i 33 linguaggi e gli strumenti di nicchia, che completano l'enciclopedia ma non sbloccano la visione.

### 5.3 Avvertenza sul numero 209

L'elenco dichiarato contiene **216 voci** quando viene separato sulle virgole; l'autore ha poi confermato un inventario ufficiale di **218 voci**, aggiungendo React e React Native come voci esplicite (i loro corsi esistevano già ma non erano elencati). `js` è stato risolto in JavaScript per sostituzione, non per aggiunta. Il CSV usa 218 righe, una per voce effettiva; la discrepanza 209 → 216 è riportata in `DUPLICATES_AND_AMBIGUITIES.md`.

---

## 6. Collegamenti

- Dettaglio voce per voce: `audit/CONTENT_INVENTORY.csv`
- Argomenti mancanti e priorità: `audit/MISSING_TOPICS.md`
- Sovrapposizioni e nomi ambigui: `audit/DUPLICATES_AND_AMBIGUITIES.md`
- Catalogo e tassonomia futura: `audit/PROPOSED_ARCHITECTURE.md`
