// Glossario essenziale: definizioni brevi collegate alle schede del catalogo.
import type { GlossaryTerm } from "@/content/types";

export const glossary: GlossaryTerm[] = [
  {
    term: "Algoritmo",
    slug: "algoritmo",
    definition:
      "Sequenza finita e non ambigua di passi che trasforma un input in un risultato atteso.",
    relatedTopicIds: ["fond-algoritmi"],
  },
  {
    term: "API",
    slug: "api",
    definition:
      "Contratto pubblico con cui un programma espone funzionalità o dati a un altro programma.",
    relatedTopicIds: ["com-api", "com-rest-soap"],
  },
  {
    term: "Architettura client/server",
    slug: "architettura-client-server",
    definition:
      "Modello in cui un client invia richieste e un server le elabora e restituisce risposte.",
    relatedTopicIds: ["com-client-server", "com-http-https"],
  },
  {
    term: "Asincronia",
    slug: "asincronia",
    definition:
      "Capacità di avviare un'operazione senza bloccare il flusso principale, riprendendola quando il risultato è pronto.",
    relatedTopicIds: ["ling-javascript", "com-websocket"],
  },
  {
    term: "Autenticazione",
    slug: "autenticazione",
    definition:
      "Processo che verifica l'identità dichiarata da un utente o da un sistema.",
    relatedTopicIds: ["sec-sso", "sec-kerberos"],
  },
  {
    term: "Autorizzazione",
    slug: "autorizzazione",
    definition:
      "Insieme delle regole che stabiliscono quali azioni un'identità autenticata può compiere.",
    relatedTopicIds: ["sec-cybersecurity", "sec-firewall"],
  },
  {
    term: "Backend",
    slug: "backend",
    definition:
      "Parte di un sistema che elabora dati, applica la logica di business e parla con database e servizi.",
    relatedTopicIds: ["backend-spring-boot", "backend-node-js", "backend-ktor", "backend-velocity"],
  },
  {
    term: "Branch",
    slug: "branch",
    definition:
      "Linea di sviluppo indipendente dentro un repository Git, usata per isolare modifiche.",
    relatedTopicIds: ["auto-github"],
  },
  {
    term: "Cache",
    slug: "cache",
    definition:
      "Deposito temporaneo di dati già calcolati o scaricati, usato per rispondere più rapidamente.",
    relatedTopicIds: ["db-redis", "backend-velocity"],
  },
  {
    term: "CLI",
    slug: "cli",
    definition:
      "Interfaccia a riga di comando: si impartiscono istruzioni scrivendo comandi testuali.",
    relatedTopicIds: ["auto-cli", "os-bash"],
  },
  {
    term: "Commit",
    slug: "commit",
    definition:
      "Istantanea versionata delle modifiche in un repository Git, con autore e messaggio.",
    relatedTopicIds: ["auto-github"],
  },
  {
    term: "Compilatore",
    slug: "compilatore",
    definition:
      "Programma che traduce il codice sorgente in codice macchina o in un formato eseguibile.",
    relatedTopicIds: ["ling-c", "ling-cpp", "desktop-qt"],
  },
  {
    term: "Concorrenza",
    slug: "concorrenza",
    definition:
      "Esecuzione di più attività che progrediscono nello stesso intervallo di tempo, condividendo risorse.",
    relatedTopicIds: ["ling-java", "backend-bun-js", "backend-node-js"],
  },
  {
    term: "Container",
    slug: "container",
    definition:
      "Ambiente isolato e riproducibile che contiene un'applicazione e le sue dipendenze.",
    relatedTopicIds: ["devops-docker", "devops-kubernetes", "devops-podman", "game-ffmpeg"],
  },
  {
    term: "CSS",
    slug: "css",
    definition:
      "Linguaggio di stile che definisce aspetto, layout e adattamento delle pagine web.",
    relatedTopicIds: ["web-css", "web-tailwind-css"],
  },
  {
    term: "Database",
    slug: "database",
    definition:
      "Sistema organizzato per memorizzare, interrogare e aggiornare dati in modo affidabile.",
    relatedTopicIds: ["db-sql", "db-newsql", "db-neon"],
  },
  {
    term: "Debugging",
    slug: "debugging",
    definition:
      "Attività di ricerca e correzione della causa di un comportamento errato del software.",
    relatedTopicIds: ["ling-java", "ling-c"],
  },
  {
    term: "Deploy",
    slug: "deploy",
    definition:
      "Rilascio di una nuova versione del software in un ambiente raggiungibile dagli utenti.",
    relatedTopicIds: ["devops-ci-cd", "devops-docker"],
  },
  {
    term: "DNS",
    slug: "dns",
    definition:
      "Sistema che traduce nomi di dominio leggibili in indirizzi IP usati dalla rete.",
    relatedTopicIds: ["net-dns"],
  },
  {
    term: "DOM",
    slug: "dom",
    definition:
      "Rappresentazione ad albero del documento HTML che il browser espone agli script.",
    relatedTopicIds: ["web-html", "ling-javascript"],
  },
  {
    term: "Endpoint",
    slug: "endpoint",
    definition:
      "Indirizzo specifico di un'API a cui si inviano richieste per ottenere o modificare una risorsa.",
    relatedTopicIds: ["com-api", "com-rest-soap"],
  },
  {
    term: "Framework",
    slug: "framework",
    definition:
      "Struttura di codice e convenzioni che guida la costruzione di un'applicazione.",
    relatedTopicIds: ["web-react", "backend-spring-boot", "backend-velocity", "desktop-qt", "mobile-ionic"],
  },
  {
    term: "Frontend",
    slug: "frontend",
    definition:
      "Parte di un'applicazione con cui l'utente interagisce direttamente, di solito nel browser o su mobile.",
    relatedTopicIds: ["web-html", "web-react", "mobile-react-native", "mobile-ionic"],
  },
  {
    term: "Git",
    slug: "git",
    definition:
      "Sistema di controllo versione distribuito che registra la storia delle modifiche al codice.",
    relatedTopicIds: ["auto-github"],
  },
  {
    term: "GitHub",
    slug: "github",
    definition:
      "Piattaforma che ospita repository Git e aggiunge collaborazione, issue e automazioni.",
    relatedTopicIds: ["auto-github", "auto-github-actions"],
  },
  {
    term: "HTML",
    slug: "html",
    definition:
      "Linguaggio di marcatura che descrive struttura e significato del contenuto di una pagina web.",
    relatedTopicIds: ["web-html"],
  },
  {
    term: "HTTP",
    slug: "http",
    definition:
      "Protocollo applicativo di richiesta e risposta alla base del traffico web.",
    relatedTopicIds: ["com-http-https"],
  },
  {
    term: "Indice",
    slug: "indice",
    definition:
      "Struttura ausiliaria di un database che accelera la ricerca delle righe.",
    relatedTopicIds: ["db-sql"],
  },
  {
    term: "Interprete",
    slug: "interprete",
    definition:
      "Programma che esegue il codice sorgente leggendolo e traducendolo passo dopo passo.",
    relatedTopicIds: ["ling-javascript", "ling-python"],
  },
  {
    term: "JSON",
    slug: "json",
    definition:
      "Formato testuale leggero per scambiare dati strutturati come oggetti e liste.",
    relatedTopicIds: ["fmt-json", "com-api"],
  },
  {
    term: "Latency",
    slug: "latency",
    definition:
      "Tempo che intercorre tra l'avvio di un'operazione e il momento in cui il risultato è disponibile.",
    relatedTopicIds: ["fond-ottimizzazione-codice"],
  },
  {
    term: "Linguaggio di programmazione",
    slug: "linguaggio-di-programmazione",
    definition:
      "Notazione formale con cui si descrive un algoritmo in modo che un esecutore possa elaborarlo.",
    relatedTopicIds: ["ling-c", "ling-java", "ling-python"],
  },
  {
    term: "Markdown",
    slug: "markdown",
    definition:
      "Formato di testo semplice con una sintassi leggera per titoli, elenchi, link e codice.",
    relatedTopicIds: ["fmt-markdown"],
  },
  {
    term: "Mobile",
    slug: "mobile",
    definition:
      "Ambito delle applicazioni pensate per smartphone e tablet, con vincoli di schermo e risorse.",
    relatedTopicIds: ["mobile-react-native", "mobile-kotlin-multiplatform", "mobile-ionic"],
  },
  {
    term: "Modulo",
    slug: "modulo",
    definition:
      "Unità di codice autonoma che espone funzioni o valori e nasconde i dettagli interni.",
    relatedTopicIds: ["ling-javascript", "ling-typescript", "backend-bun-js", "backend-node-js"],
  },
  {
    term: "Null-safety",
    slug: "null-safety",
    definition:
      "Insieme di regole del linguaggio che impediscono di usare un valore assente senza averlo gestito.",
    relatedTopicIds: ["ling-kotlin", "ling-typescript"],
  },
  {
    term: "OOP",
    slug: "oop",
    definition:
      "Programmazione orientata agli oggetti: si modella il dominio con classi, oggetti e messaggi.",
    relatedTopicIds: ["ling-java", "ling-cpp", "ling-c-sharp", "desktop-qt"],
  },
  {
    term: "Pipeline",
    slug: "pipeline",
    definition:
      "Sequenza automatizzata di passaggi come build, test e rilascio attivata da un evento.",
    relatedTopicIds: ["devops-ci-cd", "auto-github-actions", "os-bash"],
  },
  {
    term: "Protocollo",
    slug: "protocollo",
    definition:
      "Insieme di regole concordate che due sistemi seguono per comunicare correttamente.",
    relatedTopicIds: ["com-http-https", "net-ssh"],
  },
  {
    term: "Proxy",
    slug: "proxy",
    definition:
      "Intermediario che riceve richieste, le inoltra e restituisce le risposte al client.",
    relatedTopicIds: ["net-proxy", "srv-nginx"],
  },
  {
    term: "Query",
    slug: "query",
    definition:
      "Richiesta formulata a un database per leggere o modificare dati.",
    relatedTopicIds: ["db-sql"],
  },
  {
    term: "Repository",
    slug: "repository",
    definition:
      "Archivio versionato che contiene codice e storia delle modifiche di un progetto.",
    relatedTopicIds: ["auto-github"],
  },
  {
    term: "REST",
    slug: "rest",
    definition:
      "Stile architetturale per API HTTP basato su risorse, metodi standard e stato trasferito.",
    relatedTopicIds: ["com-rest-soap", "com-api"],
  },
  {
    term: "Routing",
    slug: "routing",
    definition:
      "Meccanismo che associa un indirizzo o un percorso alla funzione che deve gestirlo.",
    relatedTopicIds: ["backend-ktor", "web-next-js"],
  },
  {
    term: "Runtime",
    slug: "runtime",
    definition:
      "Ambiente che esegue un programma e fornisce servizi come memoria, I/O e garbage collection.",
    relatedTopicIds: ["ling-javascript", "ling-java", "backend-bun-js", "backend-node-js"],
  },
  {
    term: "Server",
    slug: "server",
    definition:
      "Programma o macchina che fornisce risorse e servizi a client che ne fanno richiesta.",
    relatedTopicIds: ["com-client-server", "srv-nginx"],
  },
  {
    term: "Shell",
    slug: "shell",
    definition:
      "Programma che legge comandi testuali e li fa eseguire dal sistema operativo.",
    relatedTopicIds: ["os-bash", "auto-cli"],
  },
  {
    term: "SQL",
    slug: "sql",
    definition:
      "Linguaggio dichiarativo per definire, interrogare e modificare dati relazionali.",
    relatedTopicIds: ["db-sql", "db-drizzle"],
  },
  {
    term: "Stato",
    slug: "stato",
    definition:
      "Insieme dei dati che in un dato momento determinano ciò che un'interfaccia mostra e permette.",
    relatedTopicIds: ["web-react", "mobile-jetpack-compose", "fmt-velocity-template-language"],
  },
  {
    term: "TLS",
    slug: "tls",
    definition:
      "Protocollo crittografico che cifra e autentica le comunicazioni su rete.",
    relatedTopicIds: ["sec-tls", "sec-ssl"],
  },
  {
    term: "Variabile",
    slug: "variabile",
    definition:
      "Nome associato a un valore o a una zona di memoria che il programma può leggere e modificare.",
    relatedTopicIds: ["ling-c", "ling-javascript", "fmt-velocity-template-language"],
  },
  {
    term: "Virtual DOM",
    slug: "virtual-dom",
    definition:
      "Copia leggera dell'interfaccia tenuta in memoria per calcolare le modifiche minime al DOM reale.",
    relatedTopicIds: ["web-react"],
  },
  {
    term: "VPN",
    slug: "vpn",
    definition:
      "Rete privata virtuale che incapsula il traffico in un tunnel cifrato tra due punti.",
    relatedTopicIds: ["net-vpn", "net-tailscale"],
  },
  {
    term: "WebSocket",
    slug: "websocket",
    definition:
      "Protocollo che apre una connessione bidirezionale persistente tra client e server.",
    relatedTopicIds: ["com-websocket", "com-webtransport"],
  },
  {
    term: "YAML",
    slug: "yaml",
    definition:
      "Formato testuale leggibile per configurazioni e dati strutturati.",
    relatedTopicIds: ["fmt-yaml", "devops-ci-cd"],
  },
  {
    term: "Kernel",
    slug: "kernel",
    definition:
      "Nucleo del sistema operativo che gestisce CPU, memoria, processi e accesso ai dispositivi.",
    relatedTopicIds: ["os-os", "os-linux"],
  },
  {
    term: "Processo",
    slug: "processo",
    definition:
      "Programma in esecuzione con il proprio spazio di memoria e le proprie risorse assegnate dal sistema operativo.",
    relatedTopicIds: ["os-os", "os-linux", "os-bash"],
  },
  {
    term: "Memoria virtuale",
    slug: "memoria-virtuale",
    definition:
      "Astrazione che assegna a ogni processo uno spazio di indirizzi proprio, tradotto dalla CPU in memoria fisica.",
    relatedTopicIds: ["os-os", "os-linux"],
  },
  {
    term: "Filesystem",
    slug: "filesystem",
    definition:
      "Organizzazione di file e directory su un supporto, con regole per nomi, metadati e permessi.",
    relatedTopicIds: ["os-os", "os-linux", "os-bash"],
  },
  {
    term: "Permesso",
    slug: "permesso",
    definition:
      "Regola che stabilisce chi può leggere, scrivere o eseguire un file o una directory.",
    relatedTopicIds: ["os-os", "os-linux", "os-bash"],
  },
  {
    term: "Variabile d'ambiente",
    slug: "variabile-d-ambiente",
    definition:
      "Coppia nome-valore ereditata dai processi figli e usata per configurare programmi e shell.",
    relatedTopicIds: ["os-bash", "auto-cli", "devops-docker"],
  },
  {
    term: "Codice di uscita",
    slug: "codice-di-uscita",
    definition:
      "Numero restituito da un comando o processo: zero indica successo, un valore diverso indica un errore.",
    relatedTopicIds: ["os-bash", "auto-cli", "devops-ci-cd"],
  },
  {
    term: "Quoting",
    slug: "quoting",
    definition:
      "Uso di apici e backslash nella shell per impedire espansioni indesiderate di spazi, variabili e metacaratteri.",
    relatedTopicIds: ["os-bash", "auto-cli"],
  },
  {
    term: "Chiave SSH",
    slug: "chiave-ssh",
    definition:
      "Coppia di chiavi pubblica e privata usata per autenticarsi a un server senza trasmettere una password.",
    relatedTopicIds: ["net-ssh", "sec-crittografia"],
  },
  {
    term: "Host key",
    slug: "host-key",
    definition:
      "Chiave pubblica che identifica un server SSH e permette al client di riconoscere un host già visto.",
    relatedTopicIds: ["net-ssh", "sec-tls"],
  },
  {
    term: "Tunnel SSH",
    slug: "tunnel-ssh",
    definition:
      "Canale cifrato che incapsula un altro protocollo dentro una connessione SSH.",
    relatedTopicIds: ["net-ssh", "net-vpn"],
  },
  {
    term: "Port forwarding",
    slug: "port-forwarding",
    definition:
      "Regola che inoltra il traffico da una porta locale o remota verso un'altra destinazione.",
    relatedTopicIds: ["net-ssh", "net-nat-pat"],
  },
  {
    term: "Resolver",
    slug: "resolver",
    definition:
      "Componente che interroga il DNS e restituisce al client l'indirizzo o il record richiesto.",
    relatedTopicIds: ["net-dns", "net-dhcp"],
  },
  {
    term: "Record DNS",
    slug: "record-dns",
    definition:
      "Voce di una zona DNS che associa un nome a un indirizzo o a un altro dato, come A, AAAA, MX o TXT.",
    relatedTopicIds: ["net-dns", "net-smtp"],
  },
  {
    term: "TTL",
    slug: "ttl-dns",
    definition:
      "Tempo per cui un record DNS può restare in cache prima di essere interrogato di nuovo.",
    relatedTopicIds: ["net-dns", "cloud-cloudflare"],
  },
  {
    term: "Zona DNS",
    slug: "zona-dns",
    definition:
      "Porzione dello spazio dei nomi DNS gestita da un'autorità e descritta da un file di zona.",
    relatedTopicIds: ["net-dns", "cloud-cloudflare"],
  },
  {
    term: "Client",
    slug: "client",
    definition:
      "Programma o dispositivo che inizia una richiesta verso un server e ne consuma la risposta.",
    relatedTopicIds: ["com-client-server", "com-http-https"],
  },
  {
    term: "Socket",
    slug: "socket",
    definition:
      "Endpoint di comunicazione identificato da indirizzo e porta, usato per scambiare dati sulla rete.",
    relatedTopicIds: ["com-client-server", "com-websocket"],
  },
  {
    term: "Stateless",
    slug: "stateless",
    definition:
      "Protocollo o servizio che non conserva lo stato della conversazione tra una richiesta e l'altra.",
    relatedTopicIds: ["com-client-server", "com-http-https", "com-api"],
  },
  {
    term: "Certificato X.509",
    slug: "certificato-x-509",
    definition:
      "Documento firmato che lega una chiave pubblica a un'identità e viene usato per autenticare server e client.",
    relatedTopicIds: ["sec-ssl", "sec-tls", "sec-x-509"],
  },
  {
    term: "Autorità di certificazione",
    slug: "autorita-di-certificazione",
    definition:
      "Organizzazione che firma certificati e di cui i client si fidano per verificare l'identità di un server.",
    relatedTopicIds: ["sec-ssl", "sec-tls"],
  },
  {
    term: "Handshake TLS",
    slug: "handshake-tls",
    definition:
      "Fase iniziale in cui client e server concordano versione, cifrari e chiavi e verificano i certificati.",
    relatedTopicIds: ["sec-tls", "sec-ssl"],
  },
  {
    term: "Cipher suite",
    slug: "cipher-suite",
    definition:
      "Insieme di algoritmi usati in una connessione TLS per scambio di chiavi, cifratura e integrità.",
    relatedTopicIds: ["sec-tls", "sec-crittografia"],
  },
  {
    term: "SNI",
    slug: "sni",
    definition:
      "Estensione TLS con cui il client indica il nome del server, permettendo di ospitare più siti sullo stesso indirizzo.",
    relatedTopicIds: ["sec-tls", "srv-nginx"],
  },
  {
    term: "mTLS",
    slug: "mtls",
    definition:
      "TLS mutuo: anche il client presenta un certificato e viene autenticato dal server.",
    relatedTopicIds: ["sec-tls", "sec-mtls"],
  },
  {
    term: "Hash crittografico",
    slug: "hash-crittografico",
    definition:
      "Impronta di lunghezza fissa calcolata da un dato, usata per verificare integrità e identificare contenuti.",
    relatedTopicIds: ["sec-crittografia", "sec-aes"],
  },
  {
    term: "Cifratura simmetrica",
    slug: "cifratura-simmetrica",
    definition:
      "Cifratura in cui la stessa chiave serve per cifrare e decifrare, adatta a grandi volumi di dati.",
    relatedTopicIds: ["sec-crittografia", "sec-aes", "sec-tls"],
  },
  {
    term: "Cifratura asimmetrica",
    slug: "cifratura-asimmetrica",
    definition:
      "Cifratura basata su una coppia di chiavi: una pubblica per cifrare o verificare, una privata per decifrare o firmare.",
    relatedTopicIds: ["sec-crittografia", "sec-rsa", "sec-tls"],
  },
  {
    term: "Firma digitale",
    slug: "firma-digitale",
    definition:
      "Valore crittografico che dimostra l'autenticità e l'integrità di un messaggio o di un documento.",
    relatedTopicIds: ["sec-crittografia", "sec-rsa", "sec-ed25519"],
  },
  {
    term: "Indentazione YAML",
    slug: "indentazione-yaml",
    definition:
      "Uso coerente degli spazi per esprimere la gerarchia di mappe e liste in un documento YAML.",
    relatedTopicIds: ["fmt-yaml", "devops-docker-compose"],
  },
  {
    term: "Anchor e alias",
    slug: "anchor-e-alias",
    definition:
      "Meccanismo YAML che permette di definire un blocco una volta e riutilizzarlo altrove senza duplicarlo.",
    relatedTopicIds: ["fmt-yaml", "devops-ci-cd"],
  },
  {
    term: "Schema YAML",
    slug: "schema-yaml",
    definition:
      "Definizione formale dei campi ammessi in un documento YAML, usata per validarlo prima dell'uso.",
    relatedTopicIds: ["fmt-yaml", "devops-kubernetes", "devops-ansible"],
  },
  {
    term: "CommonMark",
    slug: "commonmark",
    definition:
      "Specifica precisa del Markdown di base, pensata per rendere coerente il comportamento dei parser.",
    relatedTopicIds: ["fmt-markdown", "web-mdx"],
  },
  {
    term: "GitHub Flavored Markdown",
    slug: "github-flavored-markdown",
    definition:
      "Estensione di CommonMark usata da GitHub, con tabelle, task list, link automatici e altro.",
    relatedTopicIds: ["fmt-markdown", "auto-github"],
  },
  {
    term: "Code fence",
    slug: "code-fence",
    definition:
      "Blocco delimitato da tre backtick che conserva la formattazione del codice e può indicare il linguaggio.",
    relatedTopicIds: ["fmt-markdown", "web-mdx"],
  },
  {
    term: "HTML semantico",
    slug: "html-semantico",
    definition:
      "Uso di elementi HTML che descrivono il ruolo del contenuto, come header, nav, main, article e footer.",
    relatedTopicIds: ["web-html", "web-css"],
  },
  {
    term: "Accessibilità web",
    slug: "accessibilita-web",
    definition:
      "Insieme di pratiche che rendono un'interfaccia utilizzabile con tastiera, lettori schermo e tecnologie assistive.",
    relatedTopicIds: ["web-html", "web-css", "web-tailwind-css"],
  },
  {
    term: "Validazione dei form",
    slug: "validazione-form",
    definition:
      "Controllo dei dati inseriti prima dell'invio, fatto nel browser con attributi HTML e sul server come ultima difesa.",
    relatedTopicIds: ["web-html", "web-next-js", "com-api"],
  },
  {
    term: "Specificità CSS",
    slug: "specificita-css",
    definition:
      "Regola che stabilisce quale dichiarazione CSS vince quando più selettori colpiscono lo stesso elemento.",
    relatedTopicIds: ["web-css", "web-tailwind-css", "web-scss"],
  },
  {
    term: "Flexbox",
    slug: "flexbox",
    definition:
      "Modello di layout CSS che distribuisce elementi lungo un asse e ne controlla allineamento e spaziatura.",
    relatedTopicIds: ["web-css", "web-tailwind-css"],
  },
  {
    term: "CSS Grid",
    slug: "css-grid",
    definition:
      "Sistema di layout bidimensionale che organizza gli elementi in righe e colonne definite dal contenitore.",
    relatedTopicIds: ["web-css", "web-tailwind-css"],
  },
  {
    term: "Media query",
    slug: "media-query",
    definition:
      "Regola CSS che applica stili solo quando il viewport o il dispositivo soddisfano una condizione.",
    relatedTopicIds: ["web-css", "web-tailwind-css"],
  },
  {
    term: "Utility-first",
    slug: "utility-first",
    definition:
      "Approccio CSS in cui si compongono classi piccole e specializzate direttamente nel markup.",
    relatedTopicIds: ["web-tailwind-css", "web-css", "mobile-nativewind"],
  },
  {
    term: "Design token",
    slug: "design-token",
    definition:
      "Valore condiviso di colore, spaziatura o tipografia che mantiene coerente un design system.",
    relatedTopicIds: ["web-tailwind-css", "web-css"],
  },
  {
    term: "Type narrowing",
    slug: "type-narrowing",
    definition:
      "Restringimento del tipo di una variabile dentro un blocco, ottenuto con controlli come typeof o instanceof.",
    relatedTopicIds: ["ling-typescript", "ling-javascript"],
  },
  {
    term: "Generics",
    slug: "generics",
    definition:
      "Parametri di tipo che rendono funzioni e strutture riutilizzabili mantenendo il controllo dei tipi.",
    relatedTopicIds: ["ling-typescript", "ling-kotlin"],
  },
  {
    term: "Strict mode TypeScript",
    slug: "strict-mode-typescript",
    definition:
      "Insieme di controlli del compilatore che rende espliciti i casi ambigui, come null e any impliciti.",
    relatedTopicIds: ["ling-typescript"],
  },
  {
    term: "Server Components",
    slug: "server-components",
    definition:
      "Componenti React eseguiti sul server che possono leggere dati senza inviare il loro codice al browser.",
    relatedTopicIds: ["web-next-js", "web-react"],
  },
  {
    term: "App Router",
    slug: "app-router",
    definition:
      "Sistema di routing di Next.js basato su cartelle, layout annidati e componenti server per impostazione predefinita.",
    relatedTopicIds: ["web-next-js", "web-react"],
  },
  {
    term: "Rendering statico",
    slug: "rendering-statico",
    definition:
      "Generazione dell'HTML in fase di build, così che le richieste successive ricevano pagine già pronte.",
    relatedTopicIds: ["web-next-js", "com-http-https", "web-astro"],
  },
  {
    term: "JSON Schema",
    slug: "json-schema",
    definition:
      "Vocabolario per descrivere e validare la struttura, i tipi e i vincoli di un documento JSON.",
    relatedTopicIds: ["fmt-json", "com-api"],
  },
  {
    term: "Serializzazione",
    slug: "serializzazione",
    definition:
      "Conversione di strutture dati in un formato trasferibile, come JSON, e ricostruzione al contrario.",
    relatedTopicIds: ["fmt-json", "com-api"],
  },
  {
    term: "Parsing JSON",
    slug: "parsing-json",
    definition:
      "Lettura di un testo JSON e trasformazione in valori utilizzabili dal linguaggio, con gestione degli errori.",
    relatedTopicIds: ["fmt-json", "ling-javascript"],
  },
  {
    term: "Ktor plugin",
    slug: "ktor-plugin",
    definition:
      "Modulo che aggiunge funzionalità a un'applicazione Ktor, come serializzazione, routing o compressione.",
    relatedTopicIds: ["backend-ktor", "ling-kotlin"],
  },
  {
    term: "testApplication",
    slug: "testapplication",
    definition:
      "Utility di Ktor per avviare l'applicazione in un test e inviare richieste HTTP senza un server esterno.",
    relatedTopicIds: ["backend-ktor", "ling-kotlin"],
  },
  {
    term: "Content negotiation",
    slug: "content-negotiation",
    definition:
      "Meccanismo HTTP con cui client e server scelgono il formato della rappresentazione, ad esempio JSON o XML.",
    relatedTopicIds: ["backend-ktor", "com-api", "com-rest-soap"],
  },
  {
    term: "Metodo idempotente",
    slug: "metodo-idempotente",
    definition:
      "Metodo HTTP che, ripetuto più volte, produce lo stesso effetto osservabile, come GET, PUT e DELETE.",
    relatedTopicIds: ["com-http-https", "com-rest-soap"],
  },
  {
    term: "Header HTTP",
    slug: "header-http",
    definition:
      "Campo di metadati di una richiesta o risposta HTTP, usato per content type, cache, autenticazione e altro.",
    relatedTopicIds: ["com-http-https", "com-api"],
  },
  {
    term: "HTTP/2",
    slug: "http-2",
    definition:
      "Versione binaria di HTTP con multiplazione delle richieste su una sola connessione TCP e compressione degli header.",
    relatedTopicIds: ["com-http-https", "sec-tls"],
  },
  {
    term: "WSDL",
    slug: "wsdl",
    definition:
      "Descrizione XML di un servizio SOAP: operazioni, messaggi, tipi e indirizzo dell'endpoint.",
    relatedTopicIds: ["com-rest-soap", "com-api"],
  },
  {
    term: "SOAP envelope",
    slug: "soap-envelope",
    definition:
      "Struttura XML che avvolge header e body di un messaggio SOAP e ne definisce le regole di elaborazione.",
    relatedTopicIds: ["com-rest-soap"],
  },
  {
    term: "OpenAPI",
    slug: "openapi",
    definition:
      "Formato standard per descrivere un'API HTTP, usato per documentazione, client e test contrattuali.",
    relatedTopicIds: ["com-api", "com-rest-soap"],
  },
  {
    term: "Versioning API",
    slug: "versioning-api",
    definition:
      "Strategia per evolvere un'API senza rompere i client esistenti, tramite percorso, header o media type.",
    relatedTopicIds: ["com-api", "com-rest-soap"],
  },
  {
    term: "Problem Details",
    slug: "problem-details",
    definition:
      "Formato standard RFC 9457 per descrivere gli errori HTTP in modo machine-readable e coerente.",
    relatedTopicIds: ["com-api", "com-http-https"],
  },
  {
    term: "API key",
    slug: "api-key",
    definition:
      "Credenziale semplice usata per identificare un client, da proteggere e ruotare come un segreto.",
    relatedTopicIds: ["com-api", "sec-cybersecurity"],
  },
  {
    term: "Dockerfile",
    slug: "dockerfile",
    definition:
      "File di istruzioni che descrive come costruire un'immagine container strato dopo strato.",
    relatedTopicIds: ["devops-docker", "devops-docker-compose"],
  },
  {
    term: "Layer immagine",
    slug: "layer-immagine",
    definition:
      "Strato immutabile di un'immagine container, riutilizzabile e condiviso tra immagini diverse.",
    relatedTopicIds: ["devops-docker"],
  },
  {
    term: "Registry container",
    slug: "registry-container",
    definition:
      "Servizio che conserva e distribuisce immagini container, con tag e controllo degli accessi.",
    relatedTopicIds: ["devops-docker", "devops-docker-compose"],
  },
  {
    term: "Compose file",
    slug: "compose-file",
    definition:
      "Documento YAML che dichiara servizi, reti, volumi e configurazione di un'applicazione Docker Compose.",
    relatedTopicIds: ["devops-docker-compose", "devops-docker", "devops-podman-compose"],
  },
  {
    term: "Healthcheck",
    slug: "healthcheck",
    definition:
      "Controllo periodico che verifica se un servizio è sano e permette di riavviarlo o escluderlo dal traffico.",
    relatedTopicIds: ["devops-docker-compose", "devops-docker", "devops-podman-compose"],
  },
  {
    term: "Servizio Compose",
    slug: "servizio-compose",
    definition:
      "Unità di Docker Compose che descrive immagine, comando, dipendenze e configurazione di un container.",
    relatedTopicIds: ["devops-docker-compose", "devops-docker", "devops-podman-compose"],
  },
  {
    term: "Threat modeling",
    slug: "threat-modeling",
    definition:
      "Metodo per identificare asset, attori, minacce e contromisure prima di costruire o modificare un sistema.",
    relatedTopicIds: ["sec-cybersecurity", "sec-xss", "com-api"],
  },
  {
    term: "Difesa in profondità",
    slug: "difesa-in-profondita",
    definition:
      "Strategia con più barriere indipendenti, così che il fallimento di una non comprometta l'intero sistema.",
    relatedTopicIds: ["sec-cybersecurity", "sec-xss"],
  },
  {
    term: "Superficie d'attacco",
    slug: "superficie-dattacco",
    definition:
      "Insieme di punti esposti che un attaccante può provare a sfruttare, da ridurre e monitorare.",
    relatedTopicIds: ["sec-cybersecurity", "sec-xss"],
  },
  {
    term: "Workflow GitHub Actions",
    slug: "workflow-github-actions",
    definition:
      "File YAML in .github/workflows che definisce eventi, job e passi eseguiti dalla piattaforma.",
    relatedTopicIds: ["auto-github-actions", "devops-ci-cd"],
  },
  {
    term: "Runner GitHub Actions",
    slug: "runner-github-actions",
    definition:
      "Macchina che esegue i job di un workflow, ospitata da GitHub oppure gestita internamente.",
    relatedTopicIds: ["auto-github-actions", "devops-ci-cd"],
  },
  {
    term: "Artefatto di build",
    slug: "artefatto-di-build",
    definition:
      "Prodotto di una pipeline conservato e riutilizzato, come un binario, un pacchetto o un report.",
    relatedTopicIds: ["auto-github-actions", "devops-ci-cd"],
  },
  {
    term: "Redis cache-aside",
    slug: "redis-cache-aside",
    definition:
      "Pattern in cui l'applicazione legge dalla cache, in caso di miss carica la fonte e poi popola Redis.",
    relatedTopicIds: ["db-redis", "com-api"],
  },
  {
    term: "TTL Redis",
    slug: "ttl-redis",
    definition:
      "Tempo di vita di una chiave Redis, dopo il quale la chiave scade e viene rimossa.",
    relatedTopicIds: ["db-redis", "com-http-https"],
  },
  {
    term: "Persistenza Redis",
    slug: "persistenza-redis",
    definition:
      "Meccanismi RDB e AOF con cui Redis salva i dati su disco per sopravvivere a un riavvio.",
    relatedTopicIds: ["db-redis"],
  },
  {
    term: "Profiling",
    slug: "profiling",
    definition:
      "Misurazione dell'uso di CPU, memoria e tempo per individuare i punti caldi di un programma.",
    relatedTopicIds: ["fond-ottimizzazione-codice", "fond-algoritmi"],
  },
  {
    term: "Complessità temporale",
    slug: "complessita-temporale",
    definition:
      "Crescita del tempo di esecuzione di un algoritmo al crescere della dimensione dell'input.",
    relatedTopicIds: ["fond-ottimizzazione-codice", "fond-algoritmi"],
  },
  {
    term: "Benchmark",
    slug: "benchmark",
    definition:
      "Misura ripetibile delle prestazioni usata per confrontare implementazioni in condizioni controllate.",
    relatedTopicIds: ["fond-ottimizzazione-codice"],
  },
  {
    term: "Notazione O grande",
    slug: "notazione-o-grande",
    definition:
      "Notazione asintotica che descrive il limite superiore della crescita di un algoritmo.",
    relatedTopicIds: ["fond-algoritmi", "fond-ottimizzazione-codice"],
  },
  {
    term: "Ricerca binaria",
    slug: "ricerca-binaria",
    definition:
      "Algoritmo che trova un elemento in un array ordinato dimezzando ogni volta l'intervallo di ricerca.",
    relatedTopicIds: ["fond-algoritmi"],
  },
  {
    term: "Struttura dati",
    slug: "struttura-dati",
    definition:
      "Modo di organizzare i dati in memoria per rendere efficienti le operazioni previste.",
    relatedTopicIds: ["fond-algoritmi", "fond-ottimizzazione-codice"],
  },
  {
    term: "Cross-site scripting",
    slug: "cross-site-scripting",
    definition:
      "Vulnerabilità in cui codice non fidato viene eseguito nel browser di un altro utente.",
    relatedTopicIds: ["sec-xss", "sec-cybersecurity"],
  },
  {
    term: "Content Security Policy",
    slug: "content-security-policy",
    definition:
      "Header che limita le sorgenti da cui il browser può caricare script, stili e altre risorse.",
    relatedTopicIds: ["sec-xss", "web-html"],
  },
  {
    term: "Output encoding",
    slug: "output-encoding",
    definition:
      "Codifica dei dati nel contesto di destinazione, per impedire che vengano interpretati come codice.",
    relatedTopicIds: ["sec-xss", "sec-cybersecurity", "fmt-velocity-template-language"],
  },
	{
		term: "Pattern matching",
		slug: "pattern-matching",
		definition: "Confronto strutturale con cui si legano variabili a parti di un valore e si spezza il flusso.",
		relatedTopicIds: ["ling-elixir", "ling-ocaml", "ling-reason"],
	},
	{
		term: "Mix",
		slug: "mix",
		definition: "Sistema di build di Elixir che gestisce progetti, dipendenze, task, formattazione e test.",
		relatedTopicIds: ["ling-elixir"],
	},
	{
		term: "BEAM",
		slug: "beam",
		definition: "Macchina virtuale Erlang che esegue moduli compilati in bytecode con processi leggeri e isolati.",
		relatedTopicIds: ["ling-elixir"],
	},
	{
		term: "Gen server",
		slug: "gen-server",
		definition: "Comportamento OTP che separa protocollo dei messaggi e stato di un processo tramite callback.",
		relatedTopicIds: ["ling-erlang"],
	},
	{
		term: "Supervision tree",
		slug: "supervision-tree",
		definition: "Gerarchia di supervisor che avviano e riavviano processi figli secondo strategie e soglie definite.",
		relatedTopicIds: ["ling-erlang"],
	},
	{
		term: "Rebar3",
		slug: "rebar3",
		definition: "Build tool ufficiale dell'ecosistema Erlang per compilare, testare e produrre release.",
		relatedTopicIds: ["ling-erlang"],
	},
	{
		term: "gfortran",
		slug: "gfortran",
		definition: "Compilatore Fortran del progetto GNU, compatibile con gli standard moderni e diffuso nei sistemi Unix.",
		relatedTopicIds: ["ling-fortran"],
	},
	{
		term: "Kind",
		slug: "kind",
		definition: "Parametro Fortran che specifica tipologia e precisione di un tipo, selezionato tramite costanti di iso_fortran_env.",
		relatedTopicIds: ["ling-fortran"],
	},
	{
		term: "fpm (Fortran Package Manager)",
		slug: "fpm",
		definition: "Gestore di build e dipendenze ufficiale per progetti Fortran, con comandi per compilare, eseguire e testare.",
		relatedTopicIds: ["ling-fortran"],
	},
	{
		term: "Goroutine",
		slug: "goroutine",
		definition: "Coroutine leggere gestite dallo scheduler del runtime Go, avviate con la parola chiave go.",
		relatedTopicIds: ["ling-golang"],
	},
	{
		term: "Go module",
		slug: "go-module",
		definition: "Insieme di pacchetti versionato e definito da go.mod, con dipendenze bloccate da go.sum.",
		relatedTopicIds: ["ling-golang"],
	},
	{
		term: "Garbage collection",
		slug: "garbage-collection",
		definition: "Recupero automatico della memoria non più raggiungibile; in Go è concorrente e affidato al runtime.",
		relatedTopicIds: ["ling-golang", "ling-lua", "ling-python"],
	},
	{
		term: "Metatabella",
		slug: "metatabella",
		definition: "Tabella associata a un valore che definisce comportamenti speciali come __index e __tostring.",
		relatedTopicIds: ["ling-lua"],
	},
	{
		term: "REPL",
		slug: "repl",
		definition: "Console interattiva in cui si scrivono espressioni ed esegue subito, aperta con lua -i.",
		relatedTopicIds: ["ling-lua", "ling-python", "ling-clojure"],
	},
	{
		term: "ARC",
		slug: "arc",
		definition: "Conteggio automatico dei riferimenti: il compilatore inserisce retain e release al posto dello sviluppatore.",
		relatedTopicIds: ["ling-objective-c"],
	},
	{
		term: "Selector",
		slug: "selector",
		definition: "Nome di un metodo Objective-C usato dal runtime per risolvere un messaggio a esecuzione.",
		relatedTopicIds: ["ling-objective-c"],
	},
	{
		term: "Categoria",
		slug: "categoria",
		definition: "Meccanismo Objective-C che aggiunge metodi a una classe esistente senza modificarne il sorgente.",
		relatedTopicIds: ["ling-objective-c"],
	},
	{
		term: "File .mm",
		slug: "file-mm",
		definition: "Sorgente compilato da Clang con C++ e Objective-C attivi, usato per i ponti tra i due mondi.",
		relatedTopicIds: ["ling-objective-cpp"],
	},
	{
		term: "RAII",
		slug: "raii",
		definition: "Legare la durata di una risorsa C++ al costruttore e al distruttore di un oggetto, tipicamente via unique_ptr.",
		relatedTopicIds: ["ling-objective-cpp"],
	},
	{
		term: "Ponte Objective-C",
		slug: "ponte-objective-c",
		definition: "Classe Objective-C con superficie minima che nasconde tipi C++ e converte errori in NSError.",
		relatedTopicIds: ["ling-objective-cpp"],
	},
	{
		term: "Dune",
		slug: "dune",
		definition: "Sistema di build standard per progetti OCaml che compila librerie, eseguibili e test da file dune dichiarativi.",
		relatedTopicIds: ["ling-ocaml"],
	},
	{
		term: "Currying",
		slug: "currying",
		definition: "Trasformazione di una funzione a più argomenti in funzioni a un argomento applicabili parzialmente.",
		relatedTopicIds: ["ling-ocaml", "ling-f-sharp", "ling-haskell"],
	},
	{
		term: "Free Pascal Compiler (fpc)",
		slug: "free-pascal-compiler",
		definition: "Compilatore open source multipiattaforma per Pascal e Object Pascal, autore di eseguibili nativi autonomi.",
		relatedTopicIds: ["ling-pascal"],
	},
	{
		term: "Object Pascal",
		slug: "object-pascal",
		definition: "Estensione a oggetti del Pascal con classi, proprietà ed ereditarietà, usata da Delphi e Free Pascal.",
		relatedTopicIds: ["ling-pascal"],
	},
	{
		term: "Unit",
		slug: "unit",
		definition: "Modulo Pascal compilato separatamente, con sezione interface pubblica e implementation privata riusabile dai programmi.",
		relatedTopicIds: ["ling-pascal"],
	},
	{
		term: "CPAN",
		slug: "cpan",
		definition: "Archivio e repository di moduli Perl, da cui si installano le librerie non incluse nel core.",
		relatedTopicIds: ["ling-perl"],
	},
	{
		term: "Contesto",
		slug: "contesto",
		definition: "Modo in cui un'espressione Perl viene valutata: scalare, lista o vuoto, con esiti diversi.",
		relatedTopicIds: ["ling-perl"],
	},
	{
		term: "TAP",
		slug: "tap",
		definition: "Formato testuale di output dei test Perl, letto da prove e dagli strumenti di integrazione continua.",
		relatedTopicIds: ["ling-perl"],
	},
	{
		term: "Type juggling",
		slug: "type-juggling",
		definition: "Conversione implicita o esplicita dei tipi in PHP, più prevedibile con strict_types e operatori ===.",
		relatedTopicIds: ["ling-php"],
	},
	{
		term: "Composer",
		slug: "composer",
		definition: "Gestore di dipendenze PHP che risolve versioni, scarica pacchetti e genera l'autoloader.",
		relatedTopicIds: ["ling-php"],
	},
	{
		term: "Autoloading PSR-4",
		slug: "autoloading-psr-4",
		definition: "Convenzione che mappa namespace su cartelle, caricando le classi solo quando servono.",
		relatedTopicIds: ["ling-php"],
	},
	{
		term: "Ambiente virtuale",
		slug: "ambiente-virtuale",
		definition: "Cartella con interprete e pacchetti isolati, creata con venv per ogni progetto.",
		relatedTopicIds: ["ling-python"],
	},
	{
		term: "Vettorizzazione",
		slug: "vettorizzazione",
		definition: "Esecuzione di un'operazione su un intero vettore senza scrivere cicli espliciti.",
		relatedTopicIds: ["ling-r", "ling-matlab"],
	},
	{
		term: "Data frame",
		slug: "data-frame",
		definition: "Struttura tabellare in cui ogni colonna è un vettore e ogni riga un record omogeneo.",
		relatedTopicIds: ["ling-r"],
	},
	{
		term: "CRAN",
		slug: "cran",
		definition: "Repository ufficiale dei pacchetti R, con controlli di qualità e distribuzione delle release.",
		relatedTopicIds: ["ling-r"],
	},
	{
		term: "Blocco",
		slug: "blocco",
		definition: "Codice passato a un metodo e invocato con yield o come Proc, base di each e map.",
		relatedTopicIds: ["ling-ruby"],
	},
	{
		term: "Gem",
		slug: "gem",
		definition: "Pacchetto Ruby installabile con versione e dipendenze, distribuito sul registro rubygems.org.",
		relatedTopicIds: ["ling-ruby"],
	},
	{
		term: "Gemfile.lock",
		slug: "gemfile-lock",
		definition: "File che fissa le versioni risolte da Bundler per rendere le installazioni riproducibili.",
		relatedTopicIds: ["ling-ruby"],
	},
	{
		term: "Starlark",
		slug: "starlark",
		definition: "Linguaggio di configurazione deterministico e sandboxato, derivato da Python, usato da Bazel.",
		relatedTopicIds: ["ling-starlark"],
	},
	{
		term: "File BUILD",
		slug: "file-build",
		definition: "File Starlark che dichiara i target e le dipendenze di una package Bazel.",
		relatedTopicIds: ["ling-starlark"],
	},
	{
		term: "Regola Bazel",
		slug: "regola-bazel",
		definition: "Funzione Starlark che dichiara attributi e azioni per costruire un tipo di target.",
		relatedTopicIds: ["ling-starlark"],
	},
	{
		term: "Allocator",
		slug: "allocator",
		definition: "Oggetto che fornisce memoria a una funzione Zig, rendendo esplicito chi alloca e chi libera.",
		relatedTopicIds: ["ling-zig"],
	},
	{
		term: "Error union",
		slug: "error-union",
		definition: "Tipo che rappresenta un valore oppure un errore, gestito obbligatoriamente con try o catch.",
		relatedTopicIds: ["ling-zig"],
	},
	{
		term: "defer",
		slug: "defer",
		definition: "Istruzione che rimanda un'azione alla fine dello scope, usata per liberare risorse in modo deterministico.",
		relatedTopicIds: ["ling-zig"],
	},
	{
		term: "Espansione ritardata",
		slug: "espansione-ritardata",
		definition: "Modalità di cmd.exe, attivata con EnableDelayedExpansion, in cui le variabili si leggono con !VAR! al momento dell'esecuzione e non prima del blocco.",
		relatedTopicIds: ["ling-batchfile"],
	},
	{
		term: "Batchfile",
		slug: "batchfile",
		definition: "File di testo con estensione .bat interpretato riga per riga da cmd.exe, usato per automatizzare comandi di Windows.",
		relatedTopicIds: ["ling-batchfile"],
	},
	{
		term: "ERRORLEVEL",
		slug: "errorlevel",
		definition: "Codice di uscita dell'ultimo comando eseguito, che gli script batch confrontano con if per decidere il proprio esito.",
		relatedTopicIds: ["ling-batchfile"],
	},
	{
		term: "Collezione persistente",
		slug: "collezione-persistente",
		definition: "Struttura dati immutabile che condivide la memoria con le versioni precedenti a ogni modifica.",
		relatedTopicIds: ["ling-clojure"],
	},
	{
		term: "Atom",
		slug: "atom",
		definition: "Contenitore di stato mutabile aggiornato in modo atomico tramite swap!, usato per stati condivisi senza lock.",
		relatedTopicIds: ["ling-clojure"],
	},
	{
		term: "Working-storage",
		slug: "working-storage",
		definition: "Sezione della DATA DIVISION che dichiara le variabili statiche del programma, condivise da tutti i paragrafi.",
		relatedTopicIds: ["ling-cobol"],
	},
	{
		term: "Copybook",
		slug: "copybook",
		definition: "File di dichiarazioni COBOL incluso con COPY per condividere una struttura dati tra più programmi.",
		relatedTopicIds: ["ling-cobol"],
	},
	{
		term: "Packed-decimal (COMP-3)",
		slug: "packed-decimal",
		definition: "Rappresentazione numerica in cui ogni coppia di cifre occupa un byte e il segno occupa il mezzo byte finale.",
		relatedTopicIds: ["ling-cobol"],
	},
	{
		term: "Modo minore",
		slug: "modo-minore",
		definition: "Modalità attivabile per buffer che aggiunge comportamenti senza sostituire il modo principale, definita con define-minor-mode.",
		relatedTopicIds: ["ling-emacs-lisp"],
	},
	{
		term: "ERT",
		slug: "ert",
		definition: "Framework di test incluso in Emacs che dichiara casi con ert-deftest e asserzioni con should, eseguibile in batch mode.",
		relatedTopicIds: ["ling-emacs-lisp"],
	},
	{
		term: "package.el",
		slug: "package-el",
		definition: "Gestore di pacchetti integrato in Emacs che installa e aggiorna estensioni dai repository ELPA configurati.",
		relatedTopicIds: ["ling-emacs-lisp"],
	},
	{
		term: "Discriminated union",
		slug: "discriminated-union",
		definition: "Tipo F# che rappresenta una scelta tra casi chiusi, anche con dati, verificata esaustivamente nel pattern matching.",
		relatedTopicIds: ["ling-f-sharp"],
	},
	{
		term: "F# Interactive",
		slug: "fsharp-interactive",
		definition: "REPL e runner di script di F# avviato con dotnet fsi, usato per provare codice e riferimenti di pacchetti.",
		relatedTopicIds: ["ling-f-sharp"],
	},
	{
		term: "Macro",
		slug: "macro",
		definition: "Funzione che riceve le forme non valutate e restituisce il codice da valutare, estendendo la sintassi del linguaggio.",
		relatedTopicIds: ["ling-fennel"],
	},
	{
		term: "fennel.testing",
		slug: "fennel-testing",
		definition: "Modulo di test integrato in Fennel, con asserzioni eseguite direttamente dall'interprete sui sorgenti.",
		relatedTopicIds: ["ling-fennel"],
	},
	{
		term: "Luarocks",
		slug: "luarocks",
		definition: "Gestore di pacchetti dell'ecosistema Lua che installa moduli riutilizzabili anche da codice Fennel.",
		relatedTopicIds: ["ling-fennel"],
	},
	{
		term: "Funzione pura",
		slug: "funzione-pura",
		definition: "Funzione che restituisce sempre lo stesso risultato per gli stessi argomenti e non produce effetti osservabili.",
		relatedTopicIds: ["ling-haskell"],
	},
	{
		term: "Type class",
		slug: "type-class",
		definition: "Interfaccia Haskell che dichiara operazioni comuni, implementate da ogni tipo tramite una istanza.",
		relatedTopicIds: ["ling-haskell"],
	},
	{
		term: "Dispatch multiplo",
		slug: "dispatch-multiplo",
		definition: "Meccanismo Julia che sceglie il metodo di una funzione in base al tipo runtime di tutti gli argomenti.",
		relatedTopicIds: ["ling-julia"],
	},
	{
		term: "Broadcast",
		slug: "broadcast",
		definition: "Applicazione di un operatore o di una funzione elemento per elemento, indicata dal punto in Julia.",
		relatedTopicIds: ["ling-julia"],
	},
	{
		term: "Manifest.toml",
		slug: "manifest-toml",
		definition: "File Julia che fissa le versioni risolte di tutte le dipendenze per rendere un ambiente riproducibile.",
		relatedTopicIds: ["ling-julia"],
	},
	{
		term: "Effetto",
		slug: "effetto",
		definition: "Descrizione tipizzata di un'interazione con il mondo, come console, eccezioni o mutazione, inferita dal compilatore Koka.",
		relatedTopicIds: ["ling-koka"],
	},
	{
		term: "Handler",
		slug: "handler",
		definition: "Funzione di Koka che intercetta le operazioni di un effetto e ne decide il significato, eventualmente riprendendo l'esecuzione.",
		relatedTopicIds: ["ling-koka"],
	},
	{
		term: "Tipo algebrico",
		slug: "tipo-algebrico",
		definition: "Tipo definito come unione di costruttori alternativi, su cui si effettua pattern matching esaustivo.",
		relatedTopicIds: ["ling-koka"],
	},
	{
		term: "Workspace",
		slug: "workspace",
		definition: "Insieme delle variabili visibili nella sessione MATLAB o nello scope di una funzione.",
		relatedTopicIds: ["ling-matlab"],
	},
	{
		term: "Applicazione agli elementi (element-wise)",
		slug: "operatore-elementale",
		definition: "Operatore prefissato dal punto (.*, ./, .^) che applica il calcolo elemento per elemento invece che come algebra lineare.",
		relatedTopicIds: ["ling-matlab"],
	},
	{
		term: "Melange",
		slug: "melange",
		definition: "Backend che compila moduli OCaml e Reason in JavaScript, oggi il partner consigliato per il codice Reason nel browser.",
		relatedTopicIds: ["ling-reason"],
	},
	{
		term: "Variante",
		slug: "variante",
		definition: "Tipo OCaml e Reason definito come elenco chiuso di costruttori, che il pattern matching deve coprire in modo esaustivo.",
		relatedTopicIds: ["ling-reason"],
	},
	{
		term: "Ownership",
		slug: "ownership",
		definition: "Regola per cui ogni valore in Rust ha un solo proprietario che ne determina la durata e la liberazione.",
		relatedTopicIds: ["ling-rust"],
	},
	{
		term: "Borrowing",
		slug: "borrowing",
		definition: "Prestito di un valore tramite referenza condivisa o mutabile, senza trasferirne la proprietà.",
		relatedTopicIds: ["ling-rust"],
	},
	{
		term: "Cargo",
		slug: "cargo",
		definition: "Sistema di build e gestore di pacchetti ufficiale di Rust per compilare, testare e pubblicare crate.",
		relatedTopicIds: ["ling-rust"],
	},
	{
		term: "Case class",
		slug: "case-class",
		definition: "Classe Scala che genera uguaglianza strutturale, copy e estrazione nei match, ideale per modellare dati immutabili.",
		relatedTopicIds: ["ling-scala"],
	},
	{
		term: "sbt",
		slug: "sbt",
		definition: "Build tool dell'ecosistema Scala che gestisce dipendenze Maven, compilazione incrementale e test.",
		relatedTopicIds: ["ling-scala"],
	},
	{
		term: "Enum (tipo somma)",
		slug: "enum-scala",
		definition: "Tipo somma di Scala 3 che elenca casi chiusi, anche con dati, e obbliga il match a trattarli tutti.",
		relatedTopicIds: ["ling-scala"],
	},
	{
		term: "Contratto intelligente",
		slug: "contratto-intelligente",
		definition: "Programma distribuito sulla blockchain che combina stato persistente e funzioni eseguite dalla EVM.",
		relatedTopicIds: ["ling-solidity"],
	},
	{
		term: "Reentrancy",
		slug: "reentrancy",
		definition: "Attacco in cui una chiamata esterna rientra nel contratto prima che lo stato sia aggiornato, permettendo azioni doppie.",
		relatedTopicIds: ["ling-solidity"],
	},
	{
		term: "Gas",
		slug: "gas",
		definition: "Unità di misura del costo computazionale di ogni operazione eseguita sulla EVM, pagata in ether.",
		relatedTopicIds: ["ling-solidity"],
	},
	{
		term: "Optional",
		slug: "optional",
		definition: "Tipo Swift che contiene un valore oppure nil, e che il compilatore obbliga a estrarre prima dell'uso.",
		relatedTopicIds: ["ling-swift"],
	},
	{
		term: "Value type",
		slug: "value-type",
		definition: "Tipo come struct ed enum copiato a ogni assegnazione, che evita l'aliasing delle classi.",
		relatedTopicIds: ["ling-swift"],
	},
	{
		term: "Swift Package Manager",
		slug: "swift-package-manager",
		definition: "Strumento della toolchain Swift che risolve dipendenze, compila target ed esegue i test di un pacchetto.",
		relatedTopicIds: ["ling-swift"],
	},
	{
		term: "RTL",
		slug: "rtl",
		definition: "Livello di astrazione in cui un circuito si descrive come registri e logica combinatoria, in modo sintetizzabile.",
		relatedTopicIds: ["ling-systemverilog"],
	},
	{
		term: "Testbench",
		slug: "testbench",
		definition: "Modulo di verifica, non sintetizzabile, che stimola un design e ne controlla automaticamente le risposte.",
		relatedTopicIds: ["ling-systemverilog"],
	},
	{
		term: "Modport",
		slug: "modport",
		definition: "Dichiarazione dentro un'interfaccia SystemVerilog che fissa direzione e permessi dei segnali per uno specifico modulo.",
		relatedTopicIds: ["ling-systemverilog"],
	},
	{
		term: "Substituzione di comando",
		slug: "substituzione-di-comando",
		definition: "Sostituzione Tcl tra parentesi quadre che esegue un comando e ne inserisce il risultato come parola.",
		relatedTopicIds: ["ling-tcl"],
	},
	{
		term: "Namespace",
		slug: "tcl-namespace",
		definition: "Contenitore che raggruppa comandi e variabili Tcl sotto un prefisso, creato con namespace eval.",
		relatedTopicIds: ["ling-tcl"],
	},
	{
		term: "Event loop",
		slug: "event-loop",
		definition: "Ciclo che esegue i comandi pianificati con after e gli eventi di I/O, attivato da vwait o da Tk.",
		relatedTopicIds: ["ling-tcl"],
	},
	{
		term: "Blueprint",
		slug: "blueprint",
		definition: "Documento ufficiale Cisco che elenca le aree e le competenze verificate da un esame di certificazione.",
		relatedTopicIds: ["net-ccna"],
	},
	{
		term: "Subnet mask",
		slug: "subnet-mask",
		definition: "Maschera di 32 bit che indica quale parte di un indirizzo IPv4 identifica la sottorete e quale l'host.",
		relatedTopicIds: ["net-ccna"],
	},
	{
		term: "Continuing Education",
		slug: "continuing-education",
		definition: "Crediti ottenuti con corsi ed eventi approvati che Cisco accetta per rinnovare una certificazione senza rifare l'esame.",
		relatedTopicIds: ["net-ccna"],
	},
	{
		term: "Modalità CLI",
		slug: "modalita-cli",
		definition: "Stato della console Cisco IOS che determina quali comandi sono ammessi e che si riconosce dalla forma del prompt.",
		relatedTopicIds: ["net-cisco-ios"],
	},
	{
		term: "Running-config",
		slug: "running-config",
		definition: "Configurazione attiva in memoria che cambia a ogni comando accettato e si perde con un riavvio senza salvataggio.",
		relatedTopicIds: ["net-cisco-ios"],
	},
	{
		term: "Startup-config",
		slug: "startup-config",
		definition: "Copia della configurazione salvata in memoria non volatile e caricata dal dispositivo a ogni avvio.",
		relatedTopicIds: ["net-cisco-ios"],
	},
	{
		term: "Lease DHCP",
		slug: "lease-dhcp",
		definition: "Concessione temporanea di un indirizzo IP a un client DHCP, con scadenza e rinnovo gestiti dal client.",
		relatedTopicIds: ["net-dhcp"],
	},
	{
		term: "DHCP relay",
		slug: "dhcp-relay",
		definition: "Agente di rete che inoltra i messaggi DHCP tra una subnet senza server e il server posto altrove.",
		relatedTopicIds: ["net-dhcp"],
	},
	{
		term: "DHCP snooping",
		slug: "dhcp-snooping",
		definition: "Funzione degli switch che distingue le porte fidate e scarta risposte DHCP non legittime.",
		relatedTopicIds: ["net-dhcp"],
	},
	{
		term: "Gatekeeper",
		slug: "gatekeeper",
		definition: "Componente H.323 che gestisce registrazione, ammissione, banda e traduzione degli alias all'interno di una zona.",
		relatedTopicIds: ["net-h-323"],
	},
	{
		term: "RAS",
		slug: "ras",
		definition: "Protocollo di registrazione, ammissione e stato tra endpoint H.323 e gatekeeper, definito in H.225.0.",
		relatedTopicIds: ["net-h-323"],
	},
	{
		term: "H.245",
		slug: "h245",
		definition: "Protocollo di controllo di H.323 che negozia codec, capacità e canali logici prima dei flussi media.",
		relatedTopicIds: ["net-h-323"],
	},
	{
		term: "ICMP",
		slug: "icmp",
		definition: "Protocollo di servizio di IP che trasporta messaggi di errore e di controllo tra host e router.",
		relatedTopicIds: ["net-icmp"],
	},
	{
		term: "Echo Request",
		slug: "echo-request",
		definition: "Messaggio ICMP di tipo 8 (128 in ICMPv6) con cui un host chiede a un altro di rispondere con un Echo Reply.",
		relatedTopicIds: ["net-icmp"],
	},
	{
		term: "Time Exceeded",
		slug: "time-exceeded",
		definition: "Messaggio ICMP che un router invia quando il TTL di un pacchetto arriva a zero, base del funzionamento di traceroute.",
		relatedTopicIds: ["net-icmp"],
	},
	{
		term: "IPSec",
		slug: "ipsec",
		definition: "Suite di protocolli IETF che autentica e cifra i pacchetti IP tramite AH ed ESP, con chiavi negoziate da IKE.",
		relatedTopicIds: ["net-ipsec"],
	},
	{
		term: "Security Association",
		slug: "security-association",
		definition: "Accordo monodirezionale tra due peer che definisce algoritmi e chiavi applicati al traffico protetto.",
		relatedTopicIds: ["net-ipsec"],
	},
	{
		term: "IKEv2",
		slug: "ikev2",
		definition: "Protocollo del piano di controllo IPsec che autentica le parti e negozia le chiavi delle associazioni di sicurezza.",
		relatedTopicIds: ["net-ipsec"],
	},
	{
		term: "NAT",
		slug: "nat",
		definition: "Traduzione degli indirizzi IP di un pacchetto effettuata da un router al passaggio tra due reti.",
		relatedTopicIds: ["net-nat-pat"],
	},
	{
		term: "PAT",
		slug: "pat",
		definition: "Traduzione che modifica anche le porte, permettendo a molti host di condividere un unico indirizzo IP pubblico.",
		relatedTopicIds: ["net-nat-pat"],
	},
	{
		term: "CGNAT",
		slug: "cgnat",
		definition: "NAT di livello operatore che mette migliaia di client dietro pochi indirizzi pubblici nello spazio condiviso 100.64.0.0/10.",
		relatedTopicIds: ["net-nat-pat"],
	},
	{
		term: "Peer",
		slug: "peer",
		definition: "Macchina o dispositivo con il client NetBird installato e autorizzato, estremità del tunnel WireGuard nella rete overlay.",
		relatedTopicIds: ["net-netbird"],
	},
	{
		term: "Piano di controllo",
		slug: "piano-di-controllo",
		definition: "Insieme dei servizi che gestiscono identità, chiavi e policy di una rete, senza trasportare il traffico degli utenti.",
		relatedTopicIds: ["net-netbird", "net-sdn"],
	},
	{
		term: "NAT traversal",
		slug: "nat-traversal",
		definition: "Insieme di tecniche basate su ICE e STUN che permette a due peer dietro NAT di stabilire una connessione punto-punto.",
		relatedTopicIds: ["net-netbird", "net-voip"],
	},
	{
		term: "RTT",
		slug: "rtt",
		definition: "Tempo di andata e ritorno di un pacchetto, misurato da ping come intervallo tra richiesta e risposta.",
		relatedTopicIds: ["net-ping"],
	},
	{
		term: "TTL",
		slug: "ttl",
		definition: "Campo dell'header IP decrementato di uno da ogni router, che scarta il pacchetto quando arriva a zero.",
		relatedTopicIds: ["net-ping"],
	},
	{
		term: "Path MTU Discovery",
		slug: "path-mtu-discovery",
		definition: "Tecnica che scopre la dimensione massima trasferibile lungo un percorso usando pacchetti con flag DF.",
		relatedTopicIds: ["net-ping"],
	},
	{
		term: "Commutazione di circuito",
		slug: "commutazione-di-circuito",
		definition: "Tecnica che assegna a una chiamata un percorso dedicato per tutta la sua durata, garantendo banda e latenza costanti.",
		relatedTopicIds: ["net-pstn"],
	},
	{
		term: "SS7",
		slug: "ss7",
		definition: "Sistema di segnalazione fuori banda con cui le centrali telefoniche stabiliscono, controllano e liberano le chiamate.",
		relatedTopicIds: ["net-pstn"],
	},
	{
		term: "Gateway media",
		slug: "gateway-media",
		definition: "Apparato che collega una rete a commutazione di circuito a una rete IP, traducendo segnalazione e flussi vocali.",
		relatedTopicIds: ["net-pstn"],
	},
	{
		term: "OpenFlow",
		slug: "openflow",
		definition: "Protocollo standard che separa switch e controller tramite tabelle di flusso e un canale di controllo dedicato.",
		relatedTopicIds: ["net-sdn"],
	},
	{
		term: "Intent-based networking",
		slug: "intent-based-networking",
		definition: "Approccio in cui l'operatore dichiara il risultato desiderato e il controller ne deriva e verifica le configurazioni.",
		relatedTopicIds: ["net-sdn"],
	},
	{
		term: "SIP",
		slug: "sip",
		definition: "Protocollo testuale di segnalazione che crea, modifica e chiude sessioni multimediali su IP.",
		relatedTopicIds: ["net-sip"],
	},
	{
		term: "Registrar",
		slug: "registrar",
		definition: "Server che mantiene temporaneamente l'associazione tra un indirizzo pubblico SIP e i contatti raggiungibili di un utente.",
		relatedTopicIds: ["net-sip"],
	},
	{
		term: "SDP",
		slug: "sdp",
		definition: "Formato testuale che descrive una sessione multimediale, con indirizzi, porte e codec negoziati tra le parti.",
		relatedTopicIds: ["net-sip"],
	},
	{
		term: "Envelope SMTP",
		slug: "envelope-smtp",
		definition: "Insieme degli indirizzi MAIL FROM e RCPT TO che il server usa per instradare e rimbalzare un messaggio, distinti dagli header visibili.",
		relatedTopicIds: ["net-smtp"],
	},
	{
		term: "STARTTLS",
		slug: "starttls",
		definition: "Comando di upgrade che trasforma una connessione in chiaro in una sessione TLS, usato su SMTP, IMAP e POP.",
		relatedTopicIds: ["net-smtp"],
	},
	{
		term: "Relay",
		slug: "relay",
		definition: "Inoltro di un messaggio verso un dominio diverso da quello gestito dal server, consentito solo a client autenticati o fidati.",
		relatedTopicIds: ["net-smtp"],
	},
	{
		term: "OID",
		slug: "oid",
		definition: "Identificatore numerico a punti che individua un oggetto o un'istanza nell'albero MIB di SNMP.",
		relatedTopicIds: ["net-snmp"],
	},
	{
		term: "MIB",
		slug: "mib",
		definition: "Modulo ASN.1 che descrive gli oggetti gestibili di un dispositivo, associando OID, tipo e semantica.",
		relatedTopicIds: ["net-snmp"],
	},
	{
		term: "USM",
		slug: "usm",
		definition: "Modello di sicurezza di SNMPv3 basato su utenti, autenticazione HMAC, cifratura e protezione contro il replay.",
		relatedTopicIds: ["net-snmp"],
	},
	{
		term: "VLAN",
		slug: "vlan",
		definition: "Rete locale virtuale: dominio di broadcast logico costruito sopra una infrastruttura fisica condivisa, identificato da un tag IEEE 802.1Q.",
		relatedTopicIds: ["net-vlan"],
	},
	{
		term: "Porta trunk",
		slug: "porta-trunk",
		definition: "Porta di uno switch che trasporta più VLAN contemporaneamente taggando ogni trama con il proprio identificativo.",
		relatedTopicIds: ["net-vlan"],
	},
	{
		term: "Intervlan routing",
		slug: "intervlan-routing",
		definition: "Inoltro di livello 3 tra VLAN diverse, realizzato con sottinterfacce di un router o con interfacce virtuali di uno switch.",
		relatedTopicIds: ["net-vlan"],
	},
	{
		term: "Site-to-site",
		slug: "site-to-site",
		definition: "VPN che collega in modo permanente due reti tramite i rispettivi gateway, senza che gli host ne siano consapevoli.",
		relatedTopicIds: ["net-vpn"],
	},
	{
		term: "Split tunneling",
		slug: "split-tunneling",
		definition: "Configurazione che manda nel tunnel solo il traffico verso le reti scelte, lasciando uscire localmente il resto.",
		relatedTopicIds: ["net-vpn"],
	},
	{
		term: "DSCP",
		slug: "dscp",
		definition: "Campo di sei bit nell'header IP che etichetta la classe di servizio di un pacchetto per tutta la rete.",
		relatedTopicIds: ["net-qos"],
	},
	{
		term: "LLQ",
		slug: "llq",
		definition: "Coda a priorità stretta con tetto di banda, servita prima delle altre classi per ridurre latenza e jitter della voce.",
		relatedTopicIds: ["net-qos"],
	},
	{
		term: "Policing",
		slug: "policing",
		definition: "Meccanismo che scarta o rimarca il traffico oltre il contratto di rate, senza bufferizzarlo.",
		relatedTopicIds: ["net-qos"],
	},
	{
		term: "SSRC",
		slug: "ssrc",
		definition: "Identificatore a 32 bit di una sorgente di sincronizzazione in una sessione RTP, con spazio di sequenza e timestamp proprio.",
		relatedTopicIds: ["net-rtp-e-rtcp"],
	},
	{
		term: "Jitter buffer",
		slug: "jitter-buffer",
		definition: "Buffer che riordina i pacchetti RTP e li consegna al decoder a intervalli regolari, assorbendo la variazione del ritardo.",
		relatedTopicIds: ["net-rtp-e-rtcp", "net-voip"],
	},
	{
		term: "Jitter",
		slug: "jitter",
		definition: "Variazione del ritardo tra pacchetti consecutivi, stimata con lo stimatore ricorsivo di RFC 3550 e riportata in RTCP.",
		relatedTopicIds: ["net-rtp-e-rtcp"],
	},
	{
		term: "Incapsulamento",
		slug: "incapsulamento",
		definition: "Tecnica che inserisce un pacchetto intero dentro un altro pacchetto per trasportarlo su una rete che non lo instraderebbe direttamente.",
		relatedTopicIds: ["net-gre"],
	},
	{
		term: "MTU",
		slug: "mtu",
		definition: "Dimensione massima del pacchetto trasmissibile su un collegamento, che un tunnel riduce del sovraccarico aggiunto.",
		relatedTopicIds: ["net-gre"],
	},
	{
		term: "Tunnel point-to-point",
		slug: "tunnel-point-to-point",
		definition: "Interfaccia virtuale che collega esattamente due estremi tramite indirizzi interni distinti da quelli usati per il trasporto.",
		relatedTopicIds: ["net-gre"],
	},
	{
		term: "Forward proxy",
		slug: "forward-proxy",
		definition: "Intermediario configurato dal client che inoltra le sue richieste verso i server presentandosi con la propria identità.",
		relatedTopicIds: ["net-proxy"],
	},
	{
		term: "Reverse proxy",
		slug: "reverse-proxy",
		definition: "Intermediario configurato dal server che riceve le richieste dei client e le distribuisce ai backend come se fosse l'origine.",
		relatedTopicIds: ["net-proxy"],
	},
	{
		term: "Tunnel CONNECT",
		slug: "tunnel-connect",
		definition: "Connessione TCP opaca aperta da un proxy su richiesta CONNECT, usata dai client per attraversare l'intermediario via TLS.",
		relatedTopicIds: ["net-proxy"],
	},
	{
		term: "QUIC",
		slug: "quic",
		definition: "Trasporto cifrato su UDP che unisce affidabilità, controllo di congestione, TLS 1.3 e multiplexing in un solo livello.",
		relatedTopicIds: ["net-quic", "com-webtransport"],
	},
	{
		term: "0-RTT",
		slug: "zero-rtt",
		definition: "Modalità in cui il client invia dati applicativi nel primo pacchetto riprendendo una sessione precedente, con rischio di replay.",
		relatedTopicIds: ["net-quic"],
	},
	{
		term: "qlog",
		slug: "qlog",
		definition: "Formato JSON di eventi che registra handshake, frame e perdite di una connessione QUIC per l'analisi.",
		relatedTopicIds: ["net-quic"],
	},
	{
		term: "Router virtuale",
		slug: "router-virtuale",
		definition: "Gruppo di router che espone un unico indirizzo IP e MAC virtuali usati dai client come default gateway.",
		relatedTopicIds: ["net-vrrp"],
	},
	{
		term: "Master e Backup",
		slug: "master-e-backup",
		definition: "I due ruoli VRRP: il Master risponde per l'indirizzo virtuale, il Backup aspetta e prende il posto alla sua scomparsa.",
		relatedTopicIds: ["net-vrrp"],
	},
	{
		term: "Preemption",
		slug: "preemption",
		definition: "Regola che permette a un router con priorita' piu' alta di riprendere il ruolo di Master quando torna disponibile.",
		relatedTopicIds: ["net-vrrp"],
	},
	{
		term: "Cella",
		slug: "cella-atm",
		definition: "Unità di trasporto fissa di ATM, lunga 53 byte con 5 di intestazione e 48 di payload.",
		relatedTopicIds: ["net-atm"],
	},
	{
		term: "AAL5",
		slug: "aal5",
		definition: "Livello di adattamento ATM usato per il traffico a pacchetti, con trailer di lunghezza e checksum sull'ultima cella.",
		relatedTopicIds: ["net-atm"],
	},
	{
		term: "Circuito virtuale permanente",
		slug: "pvc",
		definition: "Connessione ATM configurata staticamente tra due estremità, identificata da una coppia VPI/VCI locale al collegamento.",
		relatedTopicIds: ["net-atm"],
	},
	{
		term: "Etichetta MPLS",
		slug: "etichetta-mpls",
		definition: "Valore locale a 20 bit che un router MPLS usa per inoltrare un pacchetto al posto del prefisso IP.",
		relatedTopicIds: ["net-mpls"],
	},
	{
		term: "Label Switched Path",
		slug: "lsp",
		definition: "Percorso attraverso una rete MPLS seguito dai pacchetti che portano una stessa etichetta.",
		relatedTopicIds: ["net-mpls"],
	},
	{
		term: "Label Distribution Protocol",
		slug: "ldp",
		definition: "Protocollo con cui router MPLS vicini si scambiano i binding etichetta-prefisso seguendo l'instradamento IP.",
		relatedTopicIds: ["net-mpls"],
	},
	{
		term: "Control server",
		slug: "control-server",
		definition: "Server del piano di controllo che registra i nodi, distribuisce le chiavi pubbliche e la policy di una rete overlay.",
		relatedTopicIds: ["net-headscale"],
	},
	{
		term: "Pre-auth key",
		slug: "pre-auth-key",
		definition: "Chiave creata in anticipo dall'amministratore di Headscale che permette a un nodo di registrarsi senza approvazione manuale nel browser.",
		relatedTopicIds: ["net-headscale"],
	},
	{
		term: "Nodo tagged",
		slug: "nodo-tagged",
		definition: "Dispositivo di Headscale o Tailscale a cui si applica un tag, assegnato all'utente speciale tagged-devices e governato dalla policy invece che da un utente.",
		relatedTopicIds: ["net-headscale"],
	},
	{
		term: "Tailnet",
		slug: "tailnet",
		definition: "Insieme privato di dispositivi e utenti di Tailscale che condividono indirizzi, nomi e regole di accesso.",
		relatedTopicIds: ["net-tailscale"],
	},
	{
		term: "DERP",
		slug: "derp",
		definition: "Relay su TCP 443 di Tailscale che inoltra il traffico cifrato quando due dispositivi non riescono a stabilire un percorso diretto.",
		relatedTopicIds: ["net-tailscale"],
	},
	{
		term: "Exit node",
		slug: "exit-node",
		definition: "Dispositivo del tailnet approvato per instradare verso internet tutto il traffico uscente di altri dispositivi.",
		relatedTopicIds: ["net-tailscale"],
	},
	{
		term: "ToIP",
		slug: "toip",
		definition: "Telephony over IP: servizio telefonico completo su rete IP, con centralino, numerazione, trunk e servizi come il fax.",
		relatedTopicIds: ["net-toip"],
	},
	{
		term: "Trunk SIP",
		slug: "trunk-sip",
		definition: "Collegamento SIP tra il centralino aziendale e l'operatore, che fornisce numeri e rotte verso la rete telefonica pubblica.",
		relatedTopicIds: ["net-toip"],
	},
	{
		term: "T.38",
		slug: "t-38",
		definition: "Raccomandazione ITU-T per trasferire il fax di Gruppo 3 in tempo reale su reti IP, negoziata in SDP come media image/t38.",
		relatedTopicIds: ["net-toip"],
	},
	{
		term: "VoIP",
		slug: "voip",
		definition: "Trasmissione della voce come pacchetti IP: codec, RTP e segnalazione separano il suono dal controllo della chiamata.",
		relatedTopicIds: ["net-voip"],
	},	{
		term: "Configurazione (1C)",
		slug: "configurazione-1c",
		definition: "Insieme di metadati, moduli e form che costituisce il codice applicativo di 1C:Enterprise ed è eseguito dal runtime della piattaforma; le modifiche si distribuiscono come file XML o pacchetto .cf.",
		relatedTopicIds: ["backend-1c-enterprise"],
	},
	{
		term: "Infobase (1C)",
		slug: "infobase-1c",
		definition: "Database associato a una configurazione 1C, che contiene dati di esercizio e cache dei metadati su un DBMS come MS SQL Server o PostgreSQL.",
		relatedTopicIds: ["backend-1c-enterprise"],
	},
	{
		term: "Linguaggio integrato 1C",
		slug: "linguaggio-integrato-1c",
		definition: "Linguaggio procedurale interpretato dalla piattaforma 1C:Enterprise, con parole chiave localizzate, tipi dinamici e strutture come Struttura, TabellaValori e Corrispondenza per scrivere la logica dei moduli di configurazione.",
		relatedTopicIds: ["backend-1c-enterprise"],
	},
	{
		term: "ORM",
		slug: "orm",
		definition: "Object-Relational Mapping: strato che traduce oggetti e metodi del linguaggio in query SQL e righe di risultato in oggetti, evitando SQL concatenato a mano.",
		relatedTopicIds: ["backend-django", "db-drizzle"],
	},
	{
		term: "Migrazione",
		slug: "migrazione",
		definition: "File versionato che descrive una modifica allo schema del database e viene applicato in ordine, così ogni ambiente ricostruisce lo stesso schema dai sorgenti.",
		relatedTopicIds: ["backend-django", "db-drizzle"],
	},
	{
		term: "Middleware",
		slug: "middleware",
		definition: "Componente che avvolge il ciclo richiesta-risposta ed esegue logica trasversale, come autenticazione, header di sicurezza o misura dei tempi, in ordine dichiarato.",
		relatedTopicIds: ["backend-django"],
	},
	{
		term: "Blueprint (Flask)",
		slug: "blueprint-flask",
		definition: "Modulo Flask che raggruppa route, template e logica correlata, registrato sull'applicazione con register_blueprint per comporre l'app da più parti.",
		relatedTopicIds: ["backend-flask"],
	},
	{
		term: "Application factory",
		slug: "application-factory",
		definition: "Funzione come create_app(config) che costruisce e restituisce l'istanza Flask, permettendo di configurare applicazioni diverse per sviluppo, test e produzione.",
		relatedTopicIds: ["backend-flask"],
	},
	{
		term: "Request context",
		slug: "request-context",
		definition: "Stato legato alla singola richiesta in Flask, accessibile tramite proxy come request, session e g e attivo solo durante l'elaborazione della vista.",
		relatedTopicIds: ["backend-flask"],
	},
	{
		term: "Jakarta EE",
		slug: "jakarta-ee",
		definition: "Piattaforma di specifiche Java per il software enterprise, organizzata in profili Core, Web e Platform e verificata con un test di compatibilità dei server.",
		relatedTopicIds: ["backend-jakarta-ee"],
	},
	{
		term: "Profilo Jakarta EE",
		slug: "profilo-jakarta-ee",
		definition: "Sottoinsieme cumulativo di specifiche, Core, Web o Platform, che definisce quali API il runtime deve garantire all'applicazione.",
		relatedTopicIds: ["backend-jakarta-ee"],
	},
	{
		term: "CDI",
		slug: "cdi",
		definition: "Contesto e iniezione delle dipendenze in Jakarta EE: crea i bean, ne gestisce gli scope e applica interceptor e transazioni.",
		relatedTopicIds: ["backend-jakarta-ee"],
	},
	{
		term: "Dependency injection",
		slug: "dependency-injection",
		definition: "Tecnica in cui una classe riceve i propri collaboratori dall'esterno invece di crearli: le dipendenze sono esplicite nel costruttore e il loro assemblaggio è centralizzato.",
		relatedTopicIds: ["backend-koin", "web-angular"],
	},
	{
		term: "Modulo Koin",
		slug: "modulo-koin",
		definition: "Blocco module { } che raccoglie definizioni di oggetti per feature o livello e può includerne altri con includes, formando un grafo di dipendenze.",
		relatedTopicIds: ["backend-koin"],
	},
	{
		term: "Qualificatore Koin",
		slug: "qualificatore-koin",
		definition: "Nome associato a una definizione che permette di distinguere più istanze dello stesso tipo, ad esempio due cache con politiche diverse.",
		relatedTopicIds: ["backend-koin"],
	},
	{
		term: "MultiPart Form Data",
		slug: "multipart-form-data",
		definition: "Tipo media definito in RFC 7578 che divide il corpo della richiesta in parti delimitate da un boundary, ognuna con header propri, e che il browser usa per inviare file insieme ai campi di un form.",
		relatedTopicIds: ["backend-multer"],
	},
	{
		term: "MulterError",
		slug: "multer-error",
		definition: "Classe di errore di Multer che espone un codice stabile come LIMIT_FILE_SIZE o LIMIT_UNEXPECTED_FILE, oltre al campo e al nome del file coinvolti, per distinguere i rifiuti di parsing nel gestore degli errori.",
		relatedTopicIds: ["backend-multer"],
	},
	{
		term: "Storage engine",
		slug: "storage-engine",
		definition: "Componente di Multer che riceve lo stream di ogni file e decide dove salvarlo, implementando _handleFile e _removeFile; la libreria include DiskStorage e MemoryStorage e accetta engine custom.",
		relatedTopicIds: ["backend-multer"],
	},
	{
		term: "Container servlet",
		slug: "container-servlet",
		definition: "Runtime Java, come Tomcat, che gestisce socket, parsing HTTP e thread e invoca le servlet con richiesta e risposta già interpretate.",
		relatedTopicIds: ["backend-servlet"],
	},
	{
		term: "Ciclo di vita della servlet",
		slug: "ciclo-di-vita-servlet",
		definition: "Sequenza init, service e destroy che il container applica a una singola istanza di servlet per processo, condivisa da tutte le richieste.",
		relatedTopicIds: ["backend-servlet"],
	},
	{
		term: "Sessione HTTP",
		slug: "sessione-http",
		definition: "Stato lato server identificato da un cookie, come JSESSIONID, che associa più richieste dello stesso utente con un timeout dichiarato.",
		relatedTopicIds: ["backend-servlet"],
	},
	{
		term: "FileRoute",
		slug: "file-route",
		definition: "Regola dichiarativa di UploadThing che definisce tipi e dimensioni dei file ammessi, middleware di autorizzazione e callback di completamento di un endpoint di upload.",
		relatedTopicIds: ["backend-uploadthing"],
	},
	{
		term: "URL pre-firmata (presigned URL)",
		slug: "presigned-url",
		definition: "URL temporaneo con autorizzazione incorporata che consente di caricare o scaricare un oggetto senza esporre le credenziali di storage.",
		relatedTopicIds: ["backend-uploadthing"],
	},
	{
		term: "UTApi",
		slug: "utapi",
		definition: "Client server-side di UploadThing per caricare, elencare, firmare e cancellare file senza coinvolgere il browser.",
		relatedTopicIds: ["backend-uploadthing"],
	},
	{
		term: "PaymentIntent",
		slug: "paymentintent",
		definition: "Oggetto Stripe che rappresenta l'intenzione di incassare un importo in una valuta e ne traccia lo stato da requires_payment_method a succeeded o canceled.",
		relatedTopicIds: ["com-stripe"],
	},
	{
		term: "Webhook firmato",
		slug: "webhook-firmato",
		definition: "Notifica HTTP che Stripe invia al backend con header Stripe-Signature, un HMAC sul corpo grezzo verificabile con la chiave whsec_ prima di applicare qualsiasi effetto.",
		relatedTopicIds: ["com-stripe"],
	},
	{
		term: "Idempotenza",
		slug: "idempotenza",
		definition: "Proprietà per cui ripetere la stessa richiesta produce lo stesso risultato; in Stripe si ottiene con l'header Idempotency-Key, che per 24 ore restituisce la risposta originale senza duplicare l'operazione.",
		relatedTopicIds: ["com-stripe"],
	},
	{
		term: "Handshake di upgrade",
		slug: "handshake-di-upgrade",
		definition: "Scambio HTTP che converte una richiesta in una connessione WebSocket, tramite gli header Upgrade e Sec-WebSocket-Key e la risposta 101 Switching Protocols.",
		relatedTopicIds: ["com-websocket"],
	},
	{
		term: "Datagram",
		slug: "datagram",
		definition: "Messaggio inaffidabile e non ordinato inviato dentro una sessione WebTransport, adatto a stati che si aggiornano in fretta e che possono essere scartati se arrivano tardi.",
		relatedTopicIds: ["com-webtransport"],
	},
	{
		term: "Signal",
		slug: "signal",
		definition: "Primitiva reattiva Copy di Dioxus che contiene stato mutabile e notifica solo i componenti e gli hook che lo leggono durante il render.",
		relatedTopicIds: ["desktop-dioxus", "web-angular"],
	},
	{
		term: "RSX",
		slug: "rsx",
		definition: "Macro Dioxus con sintassi simile a HTML che dichiara l'albero di interfaccia e lo compila in template Rust efficienti per il diffing.",
		relatedTopicIds: ["desktop-dioxus"],
	},
	{
		term: "Hook",
		slug: "hook",
		definition: "Funzione Dioxus (use_signal, use_memo, use_effect, use_resource) che conserva stato o scope reattivo legato alla posizione del componente nell'albero.",
		relatedTopicIds: ["desktop-dioxus"],
	},
	{
		term: "Processo di rendering",
		slug: "processo-di-rendering",
		definition: "Renderer: processo Chromium che esegue una pagina dell'interfaccia senza accesso diretto a Node.js; in Electron ne esiste almeno uno per finestra e comunica con il processo principale tramite IPC.",
		relatedTopicIds: ["desktop-electron"],
	},
	{
		term: "contextBridge",
		slug: "contextbridge",
		definition: "API del preload di Electron che espone un oggetto specifico dalla funzione di preload al mondo JavaScript della pagina, mantenendo contextIsolation attivo e senza condividere l'intero ipcRenderer.",
		relatedTopicIds: ["desktop-electron"],
	},
	{
		term: "utilityProcess",
		slug: "utilityprocess",
		definition: "Processo Node separato avviato da Electron con utilityProcess.fork, usato per eseguire lavoro pesante o di rete senza bloccare il thread del processo principale.",
		relatedTopicIds: ["desktop-electron"],
	},
	{
		term: "Grafo della scena",
		slug: "grafo-della-scena",
		definition: "Albero di nodi JavaFX (Stage, Scene, controlli e layout) che il toolkit percorre per layout, stile e disegno di una finestra.",
		relatedTopicIds: ["desktop-javafx"],
	},
	{
		term: "JavaFX Application Thread",
		slug: "javafx-application-thread",
		definition: "Thread unico che crea, modifica e disegna i nodi JavaFX; ogni aggiornamento esterno alla UI deve passare da Platform.runLater o da un Task.",
		relatedTopicIds: ["desktop-javafx"],
	},
	{
		term: "Proprietà osservabile",
		slug: "proprieta-osservabile",
		definition: "Valore JavaFX (StringProperty, IntegerProperty, ObjectProperty) che notifica listener e binding quando cambia, alla base di controlli reattivi come TableView.",
		relatedTopicIds: ["desktop-javafx"],
	},
	{
		term: "WebView",
		slug: "webview",
		definition: "Componente di rendering HTML/CSS/JavaScript fornito dal sistema operativo (WebView2 su Windows, WKWebView su macOS, WebKitGTK su Linux) che un framework desktop usa per disegnare l'interfaccia invece di incorporare un browser completo.",
		relatedTopicIds: ["desktop-tauri"],
	},
	{
		term: "IPC",
		slug: "ipc",
		definition: "Inter-Process Communication: canale con cui processi separati si scambiano messaggi; nelle app desktop collega l'interfaccia web al processo che ha accesso a file, rete e sistema.",
		relatedTopicIds: ["desktop-tauri"],
	},
	{
		term: "Capability",
		slug: "capability",
		definition: "In Tauri 2, dichiarazione che concede un elenco di permessi a una finestra specifica, con eventuale scope sui percorsi; un'API di plugin installata non è utilizzabile dalla WebView finché il permesso non compare in una capability.",
		relatedTopicIds: ["desktop-tauri"],
	},
	{
		term: "Widget",
		slug: "widget",
		definition: "Descrizione immutabile e leggera di una porzione di interfaccia in Flutter: non tiene stato proprio, viene ricreata a ogni build e conserva dati mutabili solo tramite State.",
		relatedTopicIds: ["mobile-flutter-e-dart"],
	},
	{
		term: "Hot reload",
		slug: "hot-reload",
		definition: "Funzione della VM Dart in modalità debug che ricompila le modifiche e le riapplica all'app in esecuzione senza perdere lo stato, tranne quando cambiano campi di State, main o codice nativo.",
		relatedTopicIds: ["mobile-flutter-e-dart"],
	},
	{
		term: "Isolate",
		slug: "isolate",
		definition: "Unità di concorrenza di Dart con heap proprio e comunicazione per messaggi copiati, senza memoria condivisa: serve a spostare lavoro CPU fuori dal main isolate che disegna la UI.",
		relatedTopicIds: ["mobile-flutter-e-dart"],
	},
	{
		term: "cssInterop",
		slug: "cssinterop",
		definition: "Funzione di NativeWind che registra un componente di terze parti o nativo mappando la prop className su uno stile o su altre prop, per esempio per abilitare la risoluzione delle utility su librerie esterne.",
		relatedTopicIds: ["mobile-nativewind"],
	},
	{
		term: "CSS variables",
		slug: "css-variables",
		definition: "Valori di stile ereditati lungo l'albero dei componenti e reattivi quando cambiano; in NativeWind si impostano con vars() e si leggono dai figli anche nelle classi con sintassi bg-[--nome].",
		relatedTopicIds: ["mobile-nativewind"],
	},
	{
		term: "Password spraying",
		slug: "password-spraying",
		definition: "Attacco che prova poche password molto comuni su molti account diversi, in modo che nessun utente accumuli abbastanza fallimenti da attivare un lockout per account.",
		relatedTopicIds: ["sec-brute-force"],
	},
	{
		term: "Credential stuffing",
		slug: "credential-stuffing",
		definition: "Tentativo automatizzato di accesso con coppie utente-password rubate da altri servizi, che sfrutta il riuso delle password; si mitiga con MFA e liste di credenziali compromesse.",
		relatedTopicIds: ["sec-brute-force"],
	},
	{
		term: "Rate limiting",
		slug: "rate-limiting",
		definition: "Tecnica che conta le richieste su una chiave, come IP, account o coppia delle due, e rifiuta quelle oltre la soglia in una finestra di tempo, in genere con risposta 429 e header Retry-After.",
		relatedTopicIds: ["sec-brute-force"],
	},
	{
		term: "CSRF",
		slug: "csrf",
		definition: "Cross-Site Request Forgery: attacco in cui il browser della vittima invia a un sito autenticato una richiesta con effetti collaterali costruita dall'attaccante, che sfrutta l'invio automatico dei cookie di sessione.",
		relatedTopicIds: ["sec-csrf"],
	},
	{
		term: "SameSite",
		slug: "samesite",
		definition: "Attributo del cookie (Strict, Lax, None) che decide se il browser lo allega alle richieste cross-site; Lax è il valore predefinito nei browser moderni e non invia il cookie sulle POST provenienti da altri siti.",
		relatedTopicIds: ["sec-csrf"],
	},
	{
		term: "Token anti-CSRF",
		slug: "token-anti-csrf",
		definition: "Valore casuale legato alla sessione o firmato con HMAC che la pagina inserisce in un campo nascosto o in un header e il server confronta per dimostrare che la richiesta è stata costruita dall'interfaccia legittima e non da un altro sito.",
		relatedTopicIds: ["sec-csrf"],
	},
	{
		term: "Default deny",
		slug: "default-deny",
		definition: "Politica di un firewall in cui il traffico non previsto da una regola esplicita viene scartato (policy drop), invece di essere ammesso: la superficie esposta dipende solo dalle autorizzazioni scritte.",
		relatedTopicIds: ["sec-firewall"],
	},
	{
		term: "Connection tracking",
		slug: "connection-tracking",
		definition: "Meccanismo del firewall stateful che registra le connessioni attive (conntrack su Linux) e consente alle risposte di un flusso autorizzato di passare senza regole dedicate, con una tabella dalla dimensione limitata.",
		relatedTopicIds: ["sec-firewall"],
	},
	{
		term: "Stateful inspection",
		slug: "stateful-inspection",
		definition: "Modello di filtraggio in cui il firewall confronta ogni pacchetto con lo stato delle connessioni già autorizzate, distinguendo connessioni nuove, stabilite, correlate e invalid invece di valutare i pacchetti in isolamento.",
		relatedTopicIds: ["sec-firewall"],
	},
	{
		term: "Pseudonimizzazione",
		slug: "pseudonimizzazione",
		definition: "Trattamento dei dati personali in modo che non siano più attribuibili a un interessato senza informazioni aggiuntive, conservate separatamente e protette; i dati pseudonimizzati restano dati personali e richiedono una chiave o un segreto per essere ricondotti alla persona.",
		relatedTopicIds: ["sec-gdpr"],
	},
	{
		term: "Titolare del trattamento",
		slug: "titolare-del-trattamento",
		definition: "Soggetto che determina finalità e mezzi del trattamento dei dati personali e ne risponde verso gli interessati e l'autorità di controllo, anche quando affida l'esecuzione tecnica a responsabili esterni.",
		relatedTopicIds: ["sec-gdpr"],
	},
	{
		term: "Limitazione della conservazione",
		slug: "limitazione-della-conservazione",
		definition: "Principio per cui i dati personali sono conservati per un tempo non superiore a quello necessario alle finalità dichiarate: in pratica ogni tabella e ogni log devono avere una scadenza motivata e un processo che la applichi.",
		relatedTopicIds: ["sec-gdpr"],
	},
	{
		term: "Principal",
		slug: "principal",
		definition: "Identità Kerberos con nome strutturato nella forma nome@REALM o servizio/host@REALM, a cui il KDC associa una chiave a lungo termine usata per cifrare ticket e per il preauthentication.",
		relatedTopicIds: ["sec-kerberos"],
	},
	{
		term: "Ticket-granting ticket",
		slug: "ticket-granting-ticket",
		definition: "Ticket iniziale emesso dal servizio di autenticazione e cifrato con la chiave del principal krbtgt, che il client presenta al servizio di concessione dei ticket per ottenere service ticket verso i singoli servizi.",
		relatedTopicIds: ["sec-kerberos"],
	},
	{
		term: "Keytab",
		slug: "keytab",
		definition: "File che contiene le chiavi a lungo termine di uno o più principal di servizio, usato da un demone per accettare ticket Kerberos senza password e da proteggere come una credenziale permanente.",
		relatedTopicIds: ["sec-kerberos"],
	},
	{
		term: "WAF (Web Application Firewall)",
		slug: "waf",
		definition: "Intermediario che ispeziona il traffico HTTP decodificato e blocca o registra le richieste che corrispondono a firme di attacco note, senza modificare il codice dell'applicazione.",
		relatedTopicIds: ["sec-modsecurity"],
	},
	{
		term: "Regola ModSecurity",
		slug: "regola-modsecurity",
		definition: "Direttiva SecRule che combina una variabile (per esempio ARGS_POST), un operatore (@rx, @pm) e un insieme di azioni con id univoco e fase dichiarata, decidendo se una transazione prosegue o viene bloccata.",
		relatedTopicIds: ["sec-modsecurity"],
	},
	{
		term: "Connector",
		slug: "connector",
		definition: "Adattatore che collega un server HTTP alla libreria del motore di ispezione, come ModSecurity-nginx o mod_security2 per Apache, traducendo richieste e risposte nel formato atteso dal motore.",
		relatedTopicIds: ["sec-modsecurity"],
	},
	{
		term: "Server-side rendering",
		slug: "server-side-rendering",
		definition: "Tecnica in cui il server genera l'HTML completo di una pagina prima di inviarlo al browser, che si occupa solo di stili, immagini e script eventuali.",
		relatedTopicIds: ["web-angular", "web-jsp", "web-nuxt-js"],
	},
	{
		term: "Isola interattiva",
		slug: "isola-interattiva",
		definition: "Componente di framework idratato nel browser solo dove serve, mentre il resto della pagina resta HTML statico.",
		relatedTopicIds: ["web-astro"],
	},
	{
		term: "Server island",
		slug: "server-island",
		definition: "Frammento di pagina renderizzato su richiesta e inserito dopo il caricamento, con un fallback statico al suo posto.",
		relatedTopicIds: ["web-astro"],
	},
	{
		term: "Inertia.js",
		slug: "inertia-js",
		definition: "Protocollo e insieme di adattatori che collega un backend classico con routing e sessioni a un frontend a componenti, senza una API REST separata.",
		relatedTopicIds: ["web-inertia-js"],
	},
	{
		term: "Props di pagina",
		slug: "props-di-pagina",
		definition: "Dati serializzati che il controller Inertia passa al componente frontend insieme a component, url e version, condivisi o specifici per quella pagina.",
		relatedTopicIds: ["web-inertia-js"],
	},
	{
		term: "Visita parziale",
		slug: "visita-parziale",
		definition: "Richiesta Inertia che chiede al server solo un sottoinsieme delle props di pagina, mantenendo in memoria le altre e ricalcolando solo ciò che servono.",
		relatedTopicIds: ["web-inertia-js"],
	},
	{
		term: "Expression Language",
		slug: "expression-language",
		definition: "Linguaggio di espressioni in sola lettura usato nelle pagine JSP per cercare attributi negli scope, leggere proprietà dei bean e chiamare funzioni.",
		relatedTopicIds: ["web-jsp"],
	},
	{
		term: "Web application archive (WAR)",
		slug: "war",
		definition: "File ZIP con la struttura WEB-INF usata per distribuire una web application Java a un container Servlet.",
		relatedTopicIds: ["web-jsp"],
	},
	{
		term: "WebAssembly",
		slug: "webassembly",
		definition: "Formato binario portabile eseguito dal browser con compilazione in streaming, qui generato da Rust e usato da Leptos per eseguire i componenti in pagina.",
		relatedTopicIds: ["web-leptos"],
	},
	{
		term: "Funzione server",
		slug: "funzione-server",
		definition: "Funzione Rust annotata con #[server] che diventa un endpoint HTTP tipizzato sul server e un client di quella chiamata nella build WebAssembly del browser.",
		relatedTopicIds: ["web-leptos"],
	},
	{
		term: "cargo-leptos",
		slug: "cargo-leptos",
		definition: "Strumento di build che compila in parallelo il binario server e il WASM del client, gestisce CSS e asset e in watch ricompila su salvataggio.",
		relatedTopicIds: ["web-leptos"],
	},
	{
		term: "MDX",
		slug: "mdx",
		definition: "Formato che unisce Markdown e JSX, con espressioni JavaScript e import ed export ESM nello stesso documento.",
		relatedTopicIds: ["web-mdx"],
	},
	{
		term: "Plugin remark",
		slug: "plugin-remark",
		definition: "Trasformazione dell'albero sintattico Markdown eseguita prima della conversione in elementi HTML e JSX.",
		relatedTopicIds: ["web-mdx"],
	},
	{
		term: "Plugin rehype",
		slug: "plugin-rehype",
		definition: "Trasformazione dell'albero HTML generato da una pipeline Markdown o MDX, usata per aggiungere attributi, ID o componenti.",
		relatedTopicIds: ["web-mdx"],
	},
	{
		term: "DDP",
		slug: "ddp",
		definition: "Distributed Data Protocol: protocollo su WebSocket con cui Meteor invia documenti, aggiornamenti incrementali e chiamate ai Method tra client e server.",
		relatedTopicIds: ["web-meteor-js"],
	},
	{
		term: "Pubblicazione Meteor",
		slug: "pubblicazione-meteor",
		definition: "Funzione lato server che restituisce cursori e decide quali documenti, filtrati e limitati, di una collezione riceve ogni client iscritto.",
		relatedTopicIds: ["web-meteor-js"],
	},
	{
		term: "Minimongo",
		slug: "minimongo",
		definition: "Copia in memoria delle collezioni nel client, con un sottoinsieme dell'API di MongoDB, su cui agiscono query reattive e stubs dei Method.",
		relatedTopicIds: ["web-meteor-js"],
	},
	{
		term: "Nitro",
		slug: "nitro",
		definition: "Server engine di Nuxt che compila gli handler di server/api e server/routes in un runtime portabile, deployabile su Node, serverless o edge con preset diversi.",
		relatedTopicIds: ["web-nuxt-js"],
	},
	{
		term: "Payload",
		slug: "payload",
		definition: "Blocco di dati JSON che Nuxt serializza nell'HTML con i risultati di useAsyncData e useState, così il client idrata senza rieseguire le richieste fatte sul server.",
		relatedTopicIds: ["web-nuxt-js"],
	},
	{
		term: "Ripresa (resumability)",
		slug: "ripresa",
		definition: "Modello in cui l'applicazione serializzata dal server riprende l'esecuzione nel browser senza rieseguire i componenti, evitando l'idratazione e caricando il codice dei gestori solo quando servono.",
		relatedTopicIds: ["web-qwik"],
	},
	{
		term: "QRL",
		slug: "qrl",
		definition: "Riferimento serializzabile a una funzione racchiusa da $, che il compilatore estrae in un chunk separato e che il browser importa solo quando l'interazione lo richiede.",
		relatedTopicIds: ["web-qwik"],
	},
	{
		term: "Loader di rotta",
		slug: "loader-di-rotta",
		definition: "Funzione dichiarata con routeLoader$ che gira sul server durante il render e consegna dati serializzati nell'HTML, letti in modo sincrono dal componente.",
		relatedTopicIds: ["web-qwik"],
	},
	{
		term: "Redux",
		slug: "redux",
		definition: "Libreria per lo stato applicativo che conserva una singola sorgente di verità immutabile, modificabile solo tramite action e reducer puri, con un solo store osservabile.",
		relatedTopicIds: ["web-redux"],
	},
	{
		term: "Reducer",
		slug: "reducer",
		definition: "Funzione pura (state, action) => nuovoState che calcola il prossimo stato da quello attuale e da un'azione, senza effetti collaterali né mutazioni degli argomenti.",
		relatedTopicIds: ["web-redux"],
	},
	{
		term: "Redux Toolkit",
		slug: "redux-toolkit",
		definition: "Pacchetto ufficiale di Redux che fornisce configureStore, createSlice, createAsyncThunk e createEntityAdapter per ridurre il boilerplate e includere i controlli di sviluppo.",
		relatedTopicIds: ["web-redux"],
	},
	{
		term: "Mixin",
		slug: "mixin-sass",
		definition: "Blocco di dichiarazioni SCSS riutilizzabile con parametri e @content, incluso con @include per evitare di ripetere gruppi di proprietà.",
		relatedTopicIds: ["web-scss"],
	},
	{
		term: "Modulo Sass",
		slug: "modulo-sass",
		definition: "File SCSS caricato con @use che espone le proprie variabili e mixin sotto un namespace esplicito, sostituendo l'import globale.",
		relatedTopicIds: ["web-scss"],
	},
	{
		term: "Runa",
		slug: "runa-svelte",
		definition: "Primitiva di Svelte 5 riconosciuta dal compilatore, come $state e $derived, che dichiara in modo esplicito stato, valori derivati, effetti e props.",
		relatedTopicIds: ["web-svelte"],
	},
	{
		term: "Stato derivato",
		slug: "stato-derivato",
		definition: "Valore calcolato da altro stato con $derived, memoizzato e aggiornato quando cambiano le dipendenze, senza duplicare la fonte di verità.",
		relatedTopicIds: ["web-svelte"],
	},
	{
		term: "Compilazione dei componenti",
		slug: "compilazione-componenti-svelte",
		definition: "Trasformazione dei file .svelte in JavaScript che aggiorna il DOM con operazioni mirate, senza runtime di virtual DOM.",
		relatedTopicIds: ["web-svelte"],
	},
	{
		term: "Reattività",
		slug: "reattivita",
		definition: "Meccanismo per cui una modifica allo stato viene intercettata e propaga automaticamente l'aggiornamento delle viste o degli effetti che lo leggono; in Vue 3 si basa su Proxy (ref e reactive).",
		relatedTopicIds: ["web-vue"],
	},
	{
		term: "Composable",
		slug: "composable",
		definition: "Funzione il cui nome inizia per use che incapsula stato reattivo ed effetti riusabili tra componenti, con cleanup registrato in onScopeDispose.",
		relatedTopicIds: ["web-vue"],
	},
	{
		term: "Single-File Component",
		slug: "single-file-component",
		definition: "File .vue che raccoglie script setup, template e stili di un componente, compilato dal tooling Vue in componente JavaScript con DOM virtuale.",
		relatedTopicIds: ["web-vue"],
	},
	{
		term: "Redpanda",
		slug: "redpanda",
		definition: "Piattaforma di streaming distribuita in C++ costruita su Seastar, compatibile con l'API Kafka, con controller integrato nel cluster e senza JVM né coordinatore esterno.",
		relatedTopicIds: ["cloud-redpanda"],
	},
	{
		term: "Topic",
		slug: "topic-redpanda",
		definition: "Log append-only identificato da un nome e diviso in partizioni, in cui i producer scrivono record mantenuti secondo la retention o trasferiti su object storage con il Tiered Storage.",
		relatedTopicIds: ["cloud-redpanda"],
	},
	{
		term: "Tiered Storage",
		slug: "tiered-storage",
		definition: "Funzione di Redpanda che scarica i segmenti di log chiusi su object storage (S3, Azure ADLS, GCS) lasciando sul disco locale solo la parte recente, senza cambiare il protocollo dei client.",
		relatedTopicIds: ["cloud-redpanda"],
	},
	{
		term: "Partition key",
		slug: "partition-key",
		definition: "Colonna o gruppo di colonne di una tabella Cassandra il cui hash, il token, decide su quale nodo e su quali repliche viene memorizzata l'intera riga; insieme alla clustering key forma la chiave primaria.",
		relatedTopicIds: ["db-cql"],
	},
	{
		term: "Clustering key",
		slug: "clustering-key",
		definition: "Colonne che determinano l'ordine fisico delle righe dentro una partizione CQL, permettono range query sulla partizione e stabiliscono l'unico ordinamento che ORDER BY può usare.",
		relatedTopicIds: ["db-cql"],
	},
	{
		term: "ALLOW FILTERING",
		slug: "allow-filtering",
		definition: "Clausola CQL che autorizza il motore a filtrare righe al di fuori della chiave di partizione leggendo i dati nodo per nodo; su tabelle grandi diventa un full scan costoso e va evitata.",
		relatedTopicIds: ["db-cql"],
	},
	{
		term: "Database branch",
		slug: "database-branch",
		definition: "Copia copy-on-write dello stato di un database a un certo punto (LSN o istante), che condivide le pagine del genitore e ne salva solo quelle modificate: si crea in secondi indipendentemente dalla dimensione dei dati e serve per ambienti di anteprima, CI e prove di migrazione.",
		relatedTopicIds: ["db-neon"],
	},
	{
		term: "Scale to zero",
		slug: "scale-to-zero",
		definition: "Politica per cui il compute del database viene sospeso dopo un periodo di inattività e riavviato alla prima query: azzera il costo a ore inattive, ma si perde tutto lo stato di sessione e il primo accesso paga il tempo di avvio.",
		relatedTopicIds: ["db-neon"],
	},
	{
		term: "NewSQL",
		slug: "newsql",
		definition: "Categoria di database che unisce SQL e transazioni ACID multi-riga con la scalabilità orizzontale e la tolleranza ai guasti di un sistema distribuito, distribuendo i dati in shard replicati con consenso (CockroachDB, TiDB, YugabyteDB, Spanner).",
		relatedTopicIds: ["db-newsql"],
	},
	{
		term: "Consenso distribuito",
		slug: "consenso-distribuito",
		definition: "Accordo fra la maggioranza delle repliche di un dato su quale sia lo stato committato; nei database NewSQL si realizza con algoritmi come Raft o Paxos per ogni shard, e determina sia la durabilità sia la latenza di ogni scrittura.",
		relatedTopicIds: ["db-newsql"],
	},
	{
		term: "Prisma Client",
		slug: "prisma-client",
		definition: "Client TypeScript generato dallo schema Prisma che espone un namespace per modello con metodi come findMany e create e tipi derivati da modelli, relazioni e opzionalità.",
		relatedTopicIds: ["db-prisma"],
	},
	{
		term: "Prisma Migrate",
		slug: "prisma-migrate",
		definition: "Strumento che confronta schema Prisma e database, genera migrazioni SQL versionate in prisma/migrations e le applica in sviluppo o in produzione.",
		relatedTopicIds: ["db-prisma"],
	},
	{
		term: "Seed idempotente",
		slug: "seed-idempotente",
		definition: "Script di popolamento che può essere eseguito più volte senza creare duplicati né fallire sui vincoli, tipicamente tramite upsert su colonne uniche o chiavi composte.",
		relatedTopicIds: ["db-prisma"],
	},
	{
		term: "Deployment what-if",
		slug: "what-if",
		definition: "Anteprima delle modifiche che un template ARM o Bicep produrrebbe su Azure, usata per revisionare creazioni, modifiche e cancellazioni prima del deploy.",
		relatedTopicIds: ["devops-bicep"],
	},
	{
		term: "Parametro Bicep",
		slug: "parametro-bicep",
		definition: "Valore esterno dichiarato con `param` e tipizzato, regolato da decoratori come `@secure`, `@allowed` e `@minLength` e fornito tramite file `.bicepparam` o variabili d'ambiente.",
		relatedTopicIds: ["devops-bicep"],
	},
	{
		term: "Modulo Bicep",
		slug: "modulo-bicep",
		definition: "File `.bicep` richiamato con un blocco `module`, locale o pubblicato in un registry OCI, che espone solo parametri e output.",
		relatedTopicIds: ["devops-bicep"],
	},
	{
		term: "Plug-in Fluent Bit",
		slug: "plugin-fluent-bit",
		definition: "Modulo di input, filtro o output che Fluent Bit carica per leggere, modificare o consegnare i record della pipeline.",
		relatedTopicIds: ["devops-fluent-bit"],
	},
	{
		term: "Chunk",
		slug: "chunk",
		definition: "Gruppo di record bufferizzato dal motore Fluent Bit, di norma circa 2 MB, che può restare in memoria oppure essere mappato su filesystem.",
		relatedTopicIds: ["devops-fluent-bit"],
	},
	{
		term: "Backpressure",
		slug: "backpressure",
		definition: "Pressione che si crea quando i dati arrivano più velocemente di quanto l'output riesca a consegnarli, gestita con pause dell'input, storage su disco o scarto dei chunk più vecchi.",
		relatedTopicIds: ["devops-fluent-bit"],
	},
	{
		term: "Helm Chart",
		slug: "helm-chart",
		definition: "Pacchetto versionato di manifest Kubernetes parametrizzati, con metadati in Chart.yaml e valori di default in values.yaml.",
		relatedTopicIds: ["devops-helm"],
	},
	{
		term: "Release Helm",
		slug: "release-helm",
		definition: "Istanza nominata di un chart installata in un namespace, tracciata come revisioni successive con history, upgrade e rollback.",
		relatedTopicIds: ["devops-helm"],
	},
	{
		term: "Hook Helm",
		slug: "hook-helm",
		definition: "Risorsa annotata con helm.sh/hook che Helm applica in un momento preciso del ciclo di vita della release, come pre-upgrade per una migrazione.",
		relatedTopicIds: ["devops-helm"],
	},
	{
		term: "Rootless",
		slug: "container-rootless",
		definition: "Esecuzione di un container con lo stesso UID dell'utente che lo avvia, tramite namespace utente e UID subordinati, senza privilegi di root sull'host.",
		relatedTopicIds: ["devops-podman"],
	},
	{
		term: "Quadlet",
		slug: "quadlet",
		definition: "File di unità (`.container`, `.pod`, `.volume`) interpretato da un generatore systemd che avvia container Podman dichiarativi al boot.",
		relatedTopicIds: ["devops-podman"],
	},
	{
		term: "Stato Terraform",
		slug: "stato-terraform",
		definition: "File che associa le risorse dichiarate agli oggetti reali nel provider, usato per calcolare il piano e da conservare in un backend remoto con lock.",
		relatedTopicIds: ["devops-terraform"],
	},
	{
		term: "Piano di esecuzione",
		slug: "piano-terraform",
		definition: "Riepilogo delle azioni che Terraform propone (create, update, replace, destroy) ottenuto confrontando configurazione, stato e stato reale delle risorse.",
		relatedTopicIds: ["devops-terraform"],
	},
	{
		term: "Modulo Terraform",
		slug: "modulo-terraform",
		definition: "Directory di file `.tf` richiamata con un blocco `module`, con variabili in input e output come interfaccia riutilizzabile.",
		relatedTopicIds: ["devops-terraform"],
	},
	{
		term: "Codec",
		slug: "codec",
		definition: "Algoritmo che comprime e decomprime uno stream audio o video: H.264, HEVC e AV1 per il video, AAC e Opus per l'audio, con vincoli di compatibilità rispetto al container e al lettore.",
		relatedTopicIds: ["game-ffmpeg"],
	},
	{
		term: "CRF",
		slug: "crf",
		definition: "Constant Rate Factor, modo di encoding con qualità costante usato dagli encoder di FFmpeg come libx264: valori più bassi producono più qualità e file più grandi, valori intorno a 18-23 coprono la maggior parte dei casi.",
		relatedTopicIds: ["game-ffmpeg"],
	},
	{
		term: "ShaderLab",
		slug: "shaderlab",
		definition: "Linguaggio dichiarativo di Unity che avvolge i programmi HLSL di uno shader e descrive proprietà, tag, passaggi, stati di rendering e fallback, generando le varianti compilate per ogni piattaforma di destinazione.",
		relatedTopicIds: ["game-shaderlab"],
	},
	{
		term: "SubShader",
		slug: "subshader",
		definition: "Blocco di uno shader ShaderLab che raccoglie i passaggi compatibili con una famiglia di hardware; Unity usa il primo SubShader supportato dalla GPU e ignora gli altri.",
		relatedTopicIds: ["game-shaderlab"],
	},
	{
		term: "CBUFFER",
		slug: "cbuffer",
		definition: "Buffer costante dichiarato in HLSL con CBUFFER_START e CBUFFER_END; in URP le proprietà di un materiale devono stare in UnityPerMaterial perché lo shader resti compatibile con SRP Batcher.",
		relatedTopicIds: ["game-shaderlab"],
	},
	{
		term: "Modo operativo a blocchi",
		slug: "modo-operativo-a-blocchi",
		definition: "Modalità con cui un cifrario a blocchi come AES cifra dati più lunghi del blocco: CBC, CTR o AEAD come GCM, ciascuna con regole proprie su IV, nonce e integrità.",
		relatedTopicIds: ["sec-aes"],
	},
	{
		term: "AES-GCM",
		slug: "aes-gcm",
		definition: "Modalità AES autenticata in cui la cifratura e un tag di integrità di 128 bit proteggono insieme header e dati, ma solo se il nonce non viene mai riusato con la stessa chiave.",
		relatedTopicIds: ["sec-aes"],
	},
	{
		term: "Transazione Coraza",
		slug: "transazione-coraza",
		definition: "Oggetto monouso dell'API v3 di Coraza che rappresenta una singola richiesta HTTP, attraversa le fasi delle regole, accumula il punteggio di anomalia e restituisce eventuali interruzioni prima che la richiesta arrivi all'applicazione.",
		relatedTopicIds: ["sec-coraza"],
	},
	{
		term: "Interruzione (interruption)",
		slug: "interruption",
		definition: "Decisione di blocco restituita da Coraza quando una regola scatta: contiene l'azione, l'id della regola e il codice di stato da restituire al client, ed e distinta dagli errori di elaborazione del motore.",
		relatedTopicIds: ["sec-coraza"],
	},
	{
		term: "xcaddy",
		slug: "xcaddy",
		definition: "Strumento di build che compila un binario Caddy includendo moduli esterni, come coraza-caddy e il connettore CRS, con le versioni indicate nel comando.",
		relatedTopicIds: ["sec-coraza"],
	},
	{
		term: "Mutual TLS (certificato client)",
		slug: "mutual-tls-certificato-client",
		definition: "Configurazione TLS in cui anche il client presenta un certificato e ne dimostra il possesso della chiave privata, così il server autentica l'identità del chiamante prima di accettare richieste applicative.",
		relatedTopicIds: ["sec-mtls"],
	},
	{
		term: "Service mesh",
		slug: "service-mesh",
		definition: "Infrastruttura che intercetta il traffico tra servizi con proxy ausiliari e gestisce automaticamente mTLS, emissione, rotazione dei certificati e policy di accesso, senza modificare il codice delle applicazioni.",
		relatedTopicIds: ["sec-mtls"],
	},
	{
		term: "Certificate-bound token",
		slug: "certificate-bound-token",
		definition: "Access token legato crittograficamente al certificato TLS del client tramite il claim cnf della RFC 8705, che non può essere usato da chi presenta la stessa connessione con un certificato diverso o senza mTLS.",
		relatedTopicIds: ["sec-mtls"],
	},
	{
		term: "Identity Provider",
		slug: "identity-provider",
		definition: "Servizio che autentica gli utenti e rilascia asserzioni o token firmati usati dai servizi applicativi per creare sessioni locali, senza che questi vedano le credenziali.",
		relatedTopicIds: ["sec-sso"],
	},
	{
		term: "PKCE",
		slug: "pkce",
		definition: "Proof Key for Code Exchange: estensione di OAuth 2.0 per client pubblici in cui il codice di autorizzazione si scambia solo presentando un segreto effimero (code_verifier) coerente con l'impronta inviata all'inizio del flusso.",
		relatedTopicIds: ["sec-sso"],
	},
	{
		term: "Claim",
		slug: "claim",
		definition: "Informazione su un utente o su una sessione contenuta in un token OIDC o in un'asserzione SAML, come sub, aud, exp o groups, che il servizio verifica prima di considerare valida l'identità.",
		relatedTopicIds: ["sec-sso"],
	},
	{
		term: "CRS (Core Rule Set)",
		slug: "core-rule-set",
		definition: "Insieme di regole SecLang generiche mantenute da OWASP che rilevano categorie di attacco web note (SQL injection, XSS, LFI, bot) e le trasformano in un punteggio di anomalia per la decisione di blocco.",
		relatedTopicIds: ["sec-wasp-crs"],
	},
	{
		term: "Punteggio di anomalia",
		slug: "punteggio-di-anomalia",
		definition: "Valore accumulato dalle regole che scattano su una transazione, con pesi per severita (critical 5, error 4, warning 3, notice 2) e confrontato con una soglia che decide il blocco della richiesta.",
		relatedTopicIds: ["sec-wasp-crs"],
	},
	{
		term: "Livello di paranoia",
		slug: "livello-di-paranoia",
		definition: "Grado di aggressivita del CRS da 1 a 4 che seleziona quali regole vengono valutate: cresce la copertura degli attacchi e insieme il numero di falsi positivi da escludere.",
		relatedTopicIds: ["sec-wasp-crs"],
	},
	{
		term: "Passkey",
		slug: "passkey",
		definition: "Credenziale FIDO2 discoverable in cui l'autenticatore conserva la chiave privata e identifica l'utente senza username, sostituendo la password o affiancandola come secondo fattore ed essendo legata all'origine del sito.",
		relatedTopicIds: ["sec-yubikey"],
	},
	{
		term: "Autenticatore FIDO2",
		slug: "autenticatore-fido2",
		definition: "Dispositivo o componente di piattaforma che genera e custodisce coppie di chiavi legate a un'origine e firma le sfide WebAuthn solo dopo la verifica dell'utente, senza che la chiave privata sia esportabile.",
		relatedTopicIds: ["sec-yubikey"],
	},
	{
		term: "PIV",
		slug: "piv",
		definition: "Personal Identity Verification: profilo smart card con certificati X.509 e chiavi private custodite in slot del dispositivo, usato per SSH, VPN e firma con protezione tramite PIN e tocco.",
		relatedTopicIds: ["sec-yubikey"],
	},
	{
		term: "APISIX Route",
		slug: "apisix-route",
		definition: "Oggetto APISIX che dichiara le condizioni di matching di una richiesta (uri, host, metodo, indirizzo) e la associa a un service o upstream e a un insieme di plugin.",
		relatedTopicIds: ["srv-apisix"],
	},
	{
		term: "etcd",
		slug: "etcd",
		definition: "Archivio chiave-valore distribuito e coerente usato come fonte di verità per la configurazione; in APISIX conserva route, upstream e plugin che le istanze leggono tramite watcher e copiano in memoria.",
		relatedTopicIds: ["srv-apisix"],
	},
	{
		term: "Leaky bucket",
		slug: "leaky-bucket",
		definition: "Algoritmo di limitazione in cui il traffico entra in un secchio che perde a velocità costante: ammette una rate media stabile con una capacità di burst, usato dal plugin limit-req di APISIX.",
		relatedTopicIds: ["srv-apisix"],
	},
	{
		term: "API gateway",
		slug: "api-gateway",
		definition: "Componente che espone API interne ai client applicando instradamento, autenticazione, quote e osservabilità in un punto unico, così che i backend si occupino solo della logica di business.",
		relatedTopicIds: ["srv-kong"],
	},
	{
		term: "Consumer Kong",
		slug: "consumer-kong",
		definition: "Entità di Kong che rappresenta un soggetto autenticato (utente, applicazione, partner); i plugin di autenticazione associano una credenziale a un consumer e le quote si possono contare per consumer.",
		relatedTopicIds: ["srv-kong"],
	},
	{
		term: "Upstream Kong",
		slug: "upstream-kong",
		definition: "Raggruppamento di istanze backend (target) con peso, algoritmo di bilanciamento e health check attivi o passivi, a cui un service Kong delega le richieste.",
		relatedTopicIds: ["srv-kong"],
	},
	{
		term: "Pod",
		slug: "pod",
		definition: "Unita minima eseguibile di Kubernetes: uno o piu container che condividono rete e volumi e vengono pianificati insieme su un nodo; e effimero e viene ricreato dai controller, non riparato.",
		relatedTopicIds: ["devops-kubernetes"],
	},
	{
		term: "Reconcile loop",
		slug: "reconcile-loop",
		definition: "Ciclo con cui i controller di Kubernetes confrontano lo stato desiderato con quello osservato e agiscono per ridurre la differenza, ripetendolo a ogni cambiamento o periodicamente.",
		relatedTopicIds: ["devops-kubernetes"],
	},
	{
		term: "Readiness probe",
		slug: "readiness-probe",
		definition: "Controllo periodico che stabilisce se un Pod puo ricevere traffico: finche fallisce l'indirizzo del Pod resta fuori dagli EndpointSlice del Service senza riavviare il container.",
		relatedTopicIds: ["devops-kubernetes"],
	},
	{
		term: "Swapchain",
		slug: "swapchain",
		definition: "Insieme di immagini destinato alla presentazione, il cui numero cresce con il buffer count, creato da Vulkan a partire dalla surface e da ricostruire quando la finestra cambia dimensione o il driver lo richiede.",
		relatedTopicIds: ["game-vulkan"],
	},
	{
		term: "SPIR-V",
		slug: "spir-v",
		definition: "Rappresentazione binaria intermedia degli shader standardizzata da Khronos che Vulkan carica nei moduli shader; il driver la converte in istruzioni native della GPU ed è prodotta a build time da compilatori come glslang.",
		relatedTopicIds: ["game-vulkan"],
	},
	{
		term: "Validation layer",
		slug: "validation-layer",
		definition: "Layer del Khronos Validation SDK che intercetta le chiamate a Vulkan e segnala parametri errati o uso scorretto di oggetti con codici VUID, attivo nell'API core attraverso l'estensione VK_EXT_debug_utils.",
		relatedTopicIds: ["game-vulkan"],
	},
	{
		term: "Padding OAEP",
		slug: "padding-oaep",
		definition: "Schema di padding casuale di RSA PKCS#1 che rende sicura la cifratura con RSA e limita il messaggio a modulo meno due hash meno due byte; senza di esso RSA è malleabile e deterministico.",
		relatedTopicIds: ["sec-rsa"],
	},
	{
		term: "Secure by default",
		slug: "secure-by-default",
		definition: "Approccio per cui una configurazione minima esegue già le misure di sicurezza essenziali (filtro WAF, header, redirect, limiti) invece di richiedere di attivarle una per una, riducendo i sistemi esposti con protezioni disattivate.",
		relatedTopicIds: ["srv-bunkerweb"],
	},
	{
		term: "Bad behavior",
		slug: "bad-behavior",
		definition: "Meccanismo di BunkerWeb che conta le risposte con codici problematici per un client (per esempio 400, 403, 404, 429) e, superata una soglia, banna temporaneamente l'indirizzo IP.",
		relatedTopicIds: ["srv-bunkerweb"],
	},
	{
		term: "Antibot BunkerWeb",
		slug: "antibot-bunkerweb",
		definition: "Feature di BunkerWeb che impone a un client sospetto una challenge (per esempio basata su cookie) prima di accedere alla risorsa, con pagina di sfida su un URI dedicato impostato in ANTIBOT_URI.",
		relatedTopicIds: ["srv-bunkerweb"],
	},
	{
		term: "Caddyfile",
		slug: "caddyfile",
		definition: "Formato di configurazione leggibile di Caddy in cui ogni blocco è un sito e le direttive sono applicate in un ordine stabilito dal server; viene adattato alla configurazione JSON nativa prima di essere caricato.",
		relatedTopicIds: ["srv-caddy"],
	},
	{
		term: "ACME",
		slug: "acme",
		definition: "Protocollo automatizzato per l'emissione e il rinnovo dei certificati TLS, con challenge HTTP-01, TLS-ALPN o DNS-01; Caddy lo usa per default con autorità pubbliche come Let's Encrypt e ZeroSSL.",
		relatedTopicIds: ["srv-caddy"],
	},
	{
		term: "TLS on-demand",
		slug: "tls-on-demand",
		definition: "Modalità in cui il certificato viene richiesto all'autorità al primo handshake per un hostname non elencato in configurazione, lasciando a un endpoint ask la decisione sul dominio: senza allowlist consente a chiunque di far emettere certificati.",
		relatedTopicIds: ["srv-caddy"],
	},
	{
		term: "lua_shared_dict",
		slug: "lua-shared-dict",
		definition: "Zona di memoria condivisa da tutti i worker Nginx dichiarata in OpenResty, esposta in Lua come ngx.shared.NOME con operazioni atomiche (incr, set, get, ttl) usata per contatori, rate limit e cache.",
		relatedTopicIds: ["srv-openresty"],
	},
	{
		term: "Cosocket",
		slug: "cosocket",
		definition: "API di socket non bloccante di ngx_lua integrata con la coroutine della richiesta: la lettura o scrittura sospende il Lua senza bloccare il worker, purché la fase la supporti.",
		relatedTopicIds: ["srv-openresty"],
	},
	{
		term: "Fase della richiesta",
		slug: "fase-richiesta-openresty",
		definition: "Passaggio del ciclo di elaborazione Nginx (init_worker, rewrite, access, content, header_filter, body_filter, log) a cui si aggancia una direttiva *_by_lua; la fase scelta determina quali API possono sospendere la coroutine.",
		relatedTopicIds: ["srv-openresty"],
	},

];

export const glossaryBySlug = new Map(
  glossary.map((term) => [term.slug, term]),
);
