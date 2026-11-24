# Argomenti mancanti

**Rapporto:** `audit/MISSING_TOPICS.md`
**Fonte:** `audit/CONTENT_INVENTORY.csv` — 184 voci `ASSENTE`
**Data:** 24 novembre 2026

---

## 1. Sintesi

Dei 218 argomenti dichiarati, **184 non hanno alcun contenuto didattico**. Non tutti hanno lo stesso peso: 10 sbloccano altre aree, 34 sono ad alta priorità editoriale, 51 sono importanti ma successivi, 89 completano l'enciclopedia.

| Priorità | Significato | Voci |
|---|---|---:|
| **P0** | Fondamento trasversale: senza di esso le aree collegate restano incomprensibili | 10 |
| **P1** | Alta priorità: ecosistema già avviato, prerequisito diretto o domanda forte | 34 |
| **P2** | Importante, ma dopo le fondamenta | 51 |
| **P3** | Completamento enciclopedico o nicchia specialistica | 89 |
| | **Totale** | **184** |

La conseguenza pratica: **non servono 184 corsi nei prossimi tre mesi**. Dieci fondamenta e una trentina di argomenti prioritari coprono la maggior parte del valore percepito; il resto è enciclopedia da costruire nel tempo.

---

## 2. P0 — Le dieci fondamenta mancanti

Sono argomenti che oggi non esistono e che rendono difficile insegnare bene tutto il resto. Ogni area successiva li presuppone.

| Argomento | Area | Livello | Dipendenze | Perché è P0 |
|---|---|---|---|---|
| **OS** | Sistemi operativi | Base | Architettura del calcolatore; terminale | Processi, memoria, filesystem e permessi sono il vocabolario di ogni lezione avanzata. |
| **Bash** | Sistemi operativi | Base | Linux; uso del terminale | È la shell usata dagli strumenti che il repository già insegna (Git, Docker, CI, server). |
| **SSH** | Networking | Base | Modello OSI/TCP-IP; Linux | Prerequisito di server, deploy, Git remoto, VPN e amministrazione. |
| **DNS** | Networking | Base | Modello OSI/TCP-IP | Risoluzione dei nomi: prerequisito di HTTP, TLS, server, cloud e di ogni deploy. La voce dichiarata era `DSN`, che l'autore ha confermato essere DNS. |
| **Client/Server** | API e comunicazione | Base | HTTP/HTTPS; modello OSI/TCP-IP | Modello concettuale su cui poggiano REST, WebSocket, database e cloud. Oggi è dato per scontato. |
| **SSL** | Cybersecurity | Intermedio | HTTP/HTTPS; crittografia di base | Spiega HTTPS, certificati e gran parte della sicurezza web quotidiana. |
| **TLS** | Cybersecurity | Intermedio | HTTP/HTTPS; crittografia di base | Evoluzione di SSL; è il protocollo realmente in uso. Va insegnato insieme a SSL, non al posto suo. |
| **Crittografia** | Cybersecurity | Avanzato | Matematica discreta; reti e sistemi operativi | Senza hash, chiavi simmetriche/asimmetriche e firme, TLS, JWT, password e firma degli aggiornamenti restano nozioni isolate. |
| **YAML** | Formati | Base | Nessuna | Formato di Docker Compose, Kubernetes, CI e configurazioni che il repository già usa. |
| **Markdown** | Formati | Base | Nessuna | È il formato di tutti i 137 documenti, ma non viene mai spiegato: chi scrive contenuti non sa come estenderlo. |

**Nota:** `DNS` è la decima fondamenta, confermata dall'autore dopo l'audit del nome dichiarato `DSN`. Con le conferme ricevute non resta alcuna voce `DA VERIFICARE`.

---

## 3. P1 — I 34 argomenti prioritari

### 3.1 Linguaggi (5)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| PHP | Intermedio | Logica di programmazione; terminale | Backend web diffuso; sblocca Livewire e l'ecosistema LAMP. |
| Golang | Intermedio | Logica di programmazione; terminale | Backend, CLI e infrastruttura; alternativa concreta a Java/Kotlin. |
| Python | Base | Logica di programmazione; terminale | Prerequisito di AI, data science, Django/Flask e scripting. |
| Rust | Avanzato | Logica di programmazione; terminale | Prerequisito di Tauri; linguaggio di sistema sempre più richiesto. |
| Swift | Avanzato | Logica di programmazione; terminale | Unico modo per coprire iOS in modo nativo. |

### 3.2 Web e frontend (6)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| JSP | Intermedio | HTML, CSS e JavaScript | Chiude il percorso Java web insieme a Servlet e Jakarta EE. |
| Angular | Intermedio | HTML, CSS e JavaScript | Principale framework frontend enterprise. |
| Vue | Intermedio | HTML, CSS e JavaScript | Terzo pilastro frontend, complementare a React. |
| Svelte | Intermedio | HTML, CSS e JavaScript | Framework compatto e molto usato. |
| SCSS | Intermedio | HTML e CSS | Estensione pratica del CSS già insegnato dentro React. |
| Redux | Intermedio | React; JavaScript | Stato globale: oggi React è presente ma senza gestione dello stato. |

### 3.3 Backend (5)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| Node.js | Intermedio | HTTP, JSON; basi di programmazione | Backend JavaScript, naturale continuazione di React. |
| Servlet | Intermedio | HTTP, JSON; basi di programmazione | Fondamento del web Java, oggi assente. |
| Jakarta EE | Avanzato | HTTP, JSON; basi di programmazione | Piattaforma enterprise Java; completa Spring Boot. |
| Django | Intermedio | HTTP, JSON; basi di programmazione | Backend Python completo e didatticamente lineare. |
| Koin | Intermedio | Kotlin | Dependency injection per Kotlin/KMP, ecosistema già avviato. |

### 3.4 Mobile, desktop e dati (4)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| Flutter & Dart | Mobile | Intermedio | Dart; basi di programmazione | Principale alternativa cross-platform a KMP. |
| Tauri | Desktop | Avanzato | Rust; JavaScript | **La piattaforma su cui è costruita l'app stessa**, ma non è insegnata. |
| Electron | Desktop | Intermedio | Programmazione a oggetti; desktop | Standard de facto per app desktop web. |
| Prisma | Database | Intermedio | Modello relazionale e SQL | ORM TypeScript, coerente con l'ecosistema React/Next. |

### 3.5 API, sicurezza e infrastruttura (9)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| WebSocket | API | Intermedio | Client/Server; HTTP; JSON | Unico modo per trattare comunicazione bidirezionale. |
| CSRF | Cybersecurity | Intermedio | HTTP; sessioni/cookie | Lacuna OWASP accanto a XSS. |
| SSO | Cybersecurity | Intermedio | HTTP; identità | Autenticazione aziendale, collegata a OAuth2 già presente in Java. |
| Kubernetes | DevOps | Avanzato | Linux, terminale e reti | Orchestrazione: senza di essa Docker resta locale. |
| Podman | DevOps | Intermedio | Linux, terminale e reti | Alternativa rootless a Docker. |
| Terraform | DevOps | Avanzato | Linux, terminale e reti | Infrastructure as Code, prerequisito del cloud. |
| Ansible | DevOps | Avanzato | Linux, terminale e reti | Configurazione e automazione dei server. |
| Nginx | Server/Proxy | Intermedio | HTTP, DNS e TLS; Linux | Server web e reverse proxy più diffuso. |
| Traefik | Server/Proxy | Avanzato | HTTP, DNS e TLS; Linux | Reverse proxy pensato per container e TLS automatico. |

### 3.6 Cloud, AI e strumenti (5)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| Cloud | Cloud | Intermedio | Reti, Linux e virtualizzazione | Concetto ombrello di tutta l'area 14. |
| Cloudflare | Cloud/Server | Intermedio | Reti, Linux e virtualizzazione | DNS, CDN, TLS e protezione: molto usato e assente. |
| AI | AI | Intermedio | Statistica, Python e basi di programmazione | Area dichiarata e totalmente scoperta. |
| DevOps | DevOps | Intermedio | Linux, terminale e reti | La disciplina che tiene insieme Docker, CI/CD e cloud. |
| PowerShell | Automazione | Base | Terminale, script e ambienti | Complemento Windows di Bash. |

---

## 4. P2 — I 51 argomenti successivi

### 4.1 Linguaggi (1)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| Ruby | Intermedio | Logica di programmazione; terminale | Linguaggio e filosofia Rails; nicchia ma storicamente importante. |

### 4.2 Web e frontend (3)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| Astro | Intermedio | HTML, CSS e JavaScript | Siti content-first, vicino alla natura di questo progetto. |
| MDX | Intermedio | HTML, CSS e JavaScript | Markdown + componenti: utile per la futura piattaforma. |
| Nuxt.js | Intermedio | Vue; HTML, CSS e JavaScript | Meta-framework Vue, speculare a Next.js. |

### 4.3 Backend (4)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| Bun.js | Intermedio | HTTP, JSON; basi di programmazione | Runtime JavaScript alternativo a Node.js. |
| Flask | Intermedio | HTTP, JSON; basi di programmazione | Micro-framework Python, più semplice di Django. |
| Multer | Intermedio | Node.js; HTTP | Upload di file in Express/Node. |
| Nest.js | Avanzato | Node.js; HTTP, JSON | Backend strutturato TypeScript. |

### 4.4 Mobile, desktop e dati (6)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| NativeWind | Mobile | Intermedio | JavaScript/TypeScript o Kotlin | Tailwind per React Native. |
| Qt | Desktop | Intermedio | Programmazione a oggetti; desktop | Framework desktop C++ storico. |
| JavaFX | Desktop | Intermedio | Programmazione a oggetti; desktop | Desktop Java moderno. |
| CQL | Database | Avanzato | Modello relazionale e SQL | Cassandra Query Language; unico NoSQL dichiarato. |
| Neon | Database | Intermedio | Modello relazionale e SQL | Postgres serverless. |
| Drizzle | Database | Intermedio | Modello relazionale e SQL | ORM TypeScript alternativo a Prisma. |

### 4.5 API e sicurezza (12)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| Stripe | API | Intermedio | Client/Server; HTTP; JSON | Pagamenti: API reale molto richiesta. |
| Ethical Hacker | Cybersecurity | Avanzato | Reti, OS, crittografia | Percorso offensivo; da costruire dopo le fondamenta. |
| GDPR | Cybersecurity | Intermedio | Reti, OS, crittografia | Normativa sulla privacy, assente. |
| Kerberos | Cybersecurity | Avanzato | Reti, OS, crittografia | Autenticazione di dominio. |
| AES | Cybersecurity | Avanzato | Crittografia | Cifratura simmetrica. |
| Firewall | Cybersecurity | Intermedio | Reti, OS | Controllo del traffico. |
| Brute-Force | Cybersecurity | Intermedio | Reti, OS | Attacchi e difese sulle credenziali. |
| X.509 | Cybersecurity | Avanzato | Crittografia | Certificati: collegamento diretto a TLS. |
| RSA | Cybersecurity | Avanzato | Crittografia | Cifratura asimmetrica. |
| ModSecurity | Cybersecurity | Avanzato | Nginx/Apache; HTTP | WAF per server web. |
| WASP CRS | Cybersecurity | Avanzato | ModSecurity | Ruleset OWASP per WAF. |
| mTLS | Cybersecurity | Avanzato | TLS; X.509 | Autenticazione mutua tra servizi. |

### 4.6 DevOps e server (9)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| Podman Compose | DevOps | Intermedio | Podman | Equivalente di Docker Compose. |
| Helm | DevOps | Avanzato | Kubernetes | Packaging delle applicazioni Kubernetes. |
| Fluent Bit | DevOps | Avanzato | Linux; reti | Log processing e observability. |
| HAProxy | Server/Proxy | Avanzato | HTTP, DNS e TLS; Linux | Bilanciamento di carico. |
| Kong | Server/Proxy | Avanzato | HTTP, DNS e TLS; Linux | API gateway. |
| APISIX | Server/Proxy | Avanzato | HTTP, DNS e TLS; Linux | API gateway. |
| Caddy | Server/Proxy | Intermedio | HTTP, DNS e TLS; Linux | Server con HTTPS automatico, ottimo didatticamente. |
| Apache HTTP Server | Server/Proxy | Intermedio | HTTP, DNS e TLS; Linux | Server web storico, ancora diffusissimo; completa Nginx. |
| Consul | Server/Proxy | Avanzato | Reti, Linux e virtualizzazione | Service discovery e configurazione distribuita. |

### 4.7 Networking (13)

| Argomento | Livello | Dipendenze | Nota |
|---|---|---|---|
| Tailscale | Intermedio | Modello OSI/TCP-IP | VPN mesh basata su WireGuard. |
| VPN | Intermedio | Modello OSI/TCP-IP | Concetto base di rete remota. |
| CCNA | Intermedio | Modello OSI/TCP-IP | Certificazione e percorso strutturato di reti. |
| DHCP | Intermedio | Modello OSI/TCP-IP | Assegnazione degli indirizzi. |
| NAT/PAT | Intermedio | Modello OSI/TCP-IP | Traduzione degli indirizzi. |
| ICMP | Intermedio | Modello OSI/TCP-IP | Diagnostica di rete. |
| SMTP | Intermedio | Modello OSI/TCP-IP | Posta elettronica. |
| IPSec | Avanzato | Modello OSI/TCP-IP | Sicurezza a livello IP. |
| Proxy | Intermedio | Modello OSI/TCP-IP | Intermediari di rete. |
| Ping | Base | Modello OSI/TCP-IP | Strumento diagnostico immediato. |
| VLAN | Intermedio | Modello OSI/TCP-IP | Segmentazione di rete. |
| QUIC | Avanzato | Modello OSI/TCP-IP; TLS | Trasporto di HTTP/3. |
| Cisco IOS | Intermedio | Modello OSI/TCP-IP | Sistema operativo dei dispositivi Cisco; base del percorso CCNA. |

### 4.8 Altro (3)

| Argomento | Area | Livello | Dipendenze | Nota |
|---|---|---|---|---|
| Unity | Game | Intermedio | Programmazione, matematica, GPU | Motore più diffuso; menzionato come sbocco del C#. |
| Gherkin | Automazione | Intermedio | Terminale, script | BDD e test leggibili. |
| HCL | Formati | Intermedio | Nessuna | Linguaggio di Terraform. |

---

## 5. P3 — Gli 89 argomenti di completamento

Sono elencati per area, senza nota individuale: il nome e la dipendenza bastano a collocarli. Rappresentano l'enciclopedia a lungo termine, non la roadmap dei 90 giorni.

### 5.1 Linguaggi (27)

| Argomento | Livello |
|---|---|
| Zig | Avanzato |
| Lua | Intermedio |
| R | Intermedio |
| Starlark | Avanzato |
| OCaml | Avanzato |
| Erlang | Avanzato |
| Elixir | Avanzato |
| Perl | Intermedio |
| Fortran | Avanzato |
| Pascal | Base |
| Objective-C | Avanzato |
| Objective-C++ | Avanzato |
| Scala | Avanzato |
| F# | Avanzato |
| Clojure | Avanzato |
| Fennel | Avanzato |
| Emacs Lisp | Avanzato |
| Reason | Avanzato |
| SystemVerilog | Avanzato |
| Haskell | Avanzato |
| Tcl | Intermedio |
| Julia | Avanzato |
| MATLAB | Intermedio |
| COBOL | Avanzato |
| Solidity | Avanzato |
| Koka | Avanzato |
| Batchfile | Base |

### 5.2 Web e frontend (4)

| Argomento | Livello |
|---|---|
| Inertia.js | Intermedio |
| Qwik | Avanzato |
| Leptos | Avanzato |
| Meteor.js | Avanzato |

### 5.3 Backend, mobile e desktop (6)

| Argomento | Area | Livello |
|---|---|---|
| 1C:Enterprise | Backend | Avanzato |
| Livewire | Backend | Intermedio |
| Velocity | Backend | Intermedio |
| UploadThing | Backend | Intermedio |
| Ionic | Mobile | Intermedio |
| Dioxus | Desktop | Avanzato |

### 5.4 Database, API, cloud e AI (8)

| Argomento | Area | Livello |
|---|---|---|
| NewSQL | Database | Avanzato |
| WebTransport | API | Avanzato |
| Bunny.net | Cloud | Intermedio |
| Saga | Cloud | Avanzato |
| Redpanda | Cloud | Avanzato |
| Raft | Cloud | Avanzato |
| Paxos | Cloud | Avanzato |
| Frigate | AI | Avanzato |

### 5.5 Sicurezza (3)

| Argomento | Livello |
|---|---|
| Ed25519 | Avanzato |
| YubiKey | Intermedio |
| Coraza | Avanzato |

### 5.6 DevOps e server (13)

| Argomento | Area | Livello |
|---|---|---|
| Bicep | DevOps | Avanzato |
| Nix | DevOps | Avanzato |
| Istio | DevOps | Avanzato |
| Linkerd | DevOps | Avanzato |
| Corosync | DevOps | Avanzato |
| Pacemaker | DevOps | Avanzato |
| Harness | DevOps | Avanzato |
| Dozzle | DevOps | Intermedio |
| Varnish | Server | Avanzato |
| BunkerWeb | Server | Avanzato |
| OpenResty | Server | Avanzato |
| Envoy Proxy | Server | Avanzato |
| Pangolin | Server | Avanzato |

### 5.7 Networking e sistemi operativi (16)

| Argomento | Area | Livello |
|---|---|---|
| FreeBSD | Sistemi operativi | Avanzato |
| Headscale | Networking | Avanzato |
| ATM | Networking | Avanzato |
| GRE | Networking | Avanzato |
| SNMP | Networking | Intermedio |
| VoIP | Networking | Avanzato |
| ToIP | Networking | Avanzato |
| QoS | Networking | Avanzato |
| PSTN | Networking | Avanzato |
| RTP e RTCP | Networking | Avanzato |
| SIP | Networking | Avanzato |
| H.323 | Networking | Avanzato |
| SDN | Networking | Avanzato |
| MPLS | Networking | Avanzato |
| VRRP | Networking | Avanzato |
| NetBird | Networking | Avanzato |

### 5.8 Game, formati e strumenti (12)

| Argomento | Area | Livello |
|---|---|---|
| FFmpeg | Game/grafica | Avanzato |
| ShaderLab | Game/grafica | Avanzato |
| Vulkan | Game/grafica | Avanzato |
| OpenGL | Game/grafica | Avanzato |
| TeX | Formati | Avanzato |
| Roff | Formati | Avanzato |
| Velocity Template Language | Formati | Intermedio |
| yt-dlp | Automazione | Base |
| YASnippet | Automazione | Intermedio |
| n8n | Automazione | Intermedio |
| AutoIt | Automazione | Intermedio |
| Trunk (build tool) | Automazione | Avanzato |

**Verifica dei conteggi:** 27 + 4 + 6 + 8 + 3 + 13 + 16 + 12 = **89**, coerente con P0 10 + P1 34 + P2 51 + P3 89 = **184**.

---

## 6. I 21 parziali: non mancano, vanno completati

Questi argomenti hanno già materiale e richiedono un intervento più leggero: una pagina di riferimento, un percorso o la parte teorica mancante.

| Argomento | Dove si trova oggi | Cosa manca |
|---|---|---|
| HTML | React settimana 1; React Native | Semantica, form, accessibilità, struttura di documento |
| CSS | React settimana 1; React Native | Layout, flex/grid, responsive, cascade e specificità |
| TypeScript | Sezioni dentro React e React Native | Tipi avanzati, generics, utility types, configurazione |
| JSON | Java, JavaScript, React, React Native | Schema, validazione, parsing e sicurezza |
| Tailwind CSS | React | Configurazione, design system, componenti riutilizzabili |
| Next.js | React | App Router, rendering, data fetching, export statico |
| Docker | Java lezione 30 | Immagini, volumi, reti, multi-stage, sicurezza |
| Docker Compose | Java lezione 30 | Multi-servizio, dipendenze, ambienti |
| CI/CD | Java lezione 30; pubblicazione GitHub | Pipeline complete, segreti, ambienti, rollback |
| GitHub Actions | Tre workflow in `.github/workflows` | Sintassi dei workflow, segreti, matrix, ambienti, release |
| CLI | Lezioni C, Java, GitHub | Fondamenti di shell, pipe, redirect, exit code |
| Linux | Setup di C e C++ | Permessi, processi, systemd, pacchetti, filesystem |
| Cybersecurity | Java lezione 29 | Modello delle minacce, OWASP completo, difesa |
| HTTP/HTTPS | Java, React, React Native | Header, caching, CORS, status code, redirect |
| REST/SOAP | Java, React Native | Progettazione API, versioning, idempotenza, errori |
| API | Java, React, JavaScript, React Native | OpenAPI, autenticazione, paginazione, rate limit |
| Redis | Java lezione 30; README | Persistenza, scadenza, pub/sub, clustering |
| Ottimizzazione Codice | React, React Native, Compose | Profiling, misure, complessità, caching |
| Algoritmi | C++ STL; menzioni Java | Complessità, strutture dati, scelta dell'algoritmo |
| XSS | React | CSP, sanitizzazione, altri attacchi OWASP |
| Ktor | Kotlin, KMP | Routing, autenticazione, persistenza, test |

---

## 7. Ordine di dipendenza consigliato

Se si dovesse costruire un solo percorso nuovo prima degli altri, l'ordine con il massimo effetto a catena sarebbe:

```
OS + Bash  →  SSH + DNS + Client/Server  →  HTTP/HTTPS + TLS/SSL + Crittografia
           →  YAML + Markdown  →  Docker/Compose (completamento)  →  Nginx/Traefik
           →  CI/CD (completamento)  →  Cloud + Terraform/Ansible  →  Kubernetes
```

In parallelo, senza dipendenze dalle fondamenta:

- **Node.js** (dopo HTTP/JSON) sblocca Nest.js, Multer, Prisma, Drizzle.
- **Python** sblocca Django, Flask, AI, data science.
- **Rust** sblocca Tauri.
- **Flutter & Dart** completa il mobile.
- **SCSS + Redux + Vue/Angular/Svelte** completano il frontend.

---

## 8. Collegamenti

- Stato e percorso di ogni voce: `audit/CONTENT_INVENTORY.csv`
- Nomi ambigui e interpretazioni confermate (`DSN` → DNS, `Apache` → Apache HTTP Server, `Workflow` → GitHub Actions, ecc.): `audit/DUPLICATES_AND_AMBIGUITIES.md`
- Struttura proposta per ospitare i nuovi contenuti: `audit/PROPOSED_ARCHITECTURE.md`
- Sequenza temporale: `audit/ROADMAP_90_DAYS.md`
