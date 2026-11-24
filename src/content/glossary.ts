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
    relatedTopicIds: ["backend-spring-boot", "backend-node-js", "backend-ktor"],
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
    relatedTopicIds: ["db-redis"],
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
    relatedTopicIds: ["ling-c", "ling-cpp"],
  },
  {
    term: "Concorrenza",
    slug: "concorrenza",
    definition:
      "Esecuzione di più attività che progrediscono nello stesso intervallo di tempo, condividendo risorse.",
    relatedTopicIds: ["ling-java"],
  },
  {
    term: "Container",
    slug: "container",
    definition:
      "Ambiente isolato e riproducibile che contiene un'applicazione e le sue dipendenze.",
    relatedTopicIds: ["devops-docker", "devops-kubernetes"],
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
    relatedTopicIds: ["db-sql", "db-newsql"],
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
    relatedTopicIds: ["web-react", "backend-spring-boot"],
  },
  {
    term: "Frontend",
    slug: "frontend",
    definition:
      "Parte di un'applicazione con cui l'utente interagisce direttamente, di solito nel browser o su mobile.",
    relatedTopicIds: ["web-html", "web-react", "mobile-react-native"],
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
    relatedTopicIds: ["mobile-react-native", "mobile-kotlin-multiplatform"],
  },
  {
    term: "Modulo",
    slug: "modulo",
    definition:
      "Unità di codice autonoma che espone funzioni o valori e nasconde i dettagli interni.",
    relatedTopicIds: ["ling-javascript", "ling-typescript"],
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
    relatedTopicIds: ["ling-java", "ling-cpp", "ling-c-sharp"],
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
    relatedTopicIds: ["ling-javascript", "ling-java"],
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
    relatedTopicIds: ["db-sql"],
  },
  {
    term: "Stato",
    slug: "stato",
    definition:
      "Insieme dei dati che in un dato momento determinano ciò che un'interfaccia mostra e permette.",
    relatedTopicIds: ["web-react", "mobile-jetpack-compose"],
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
    relatedTopicIds: ["ling-c", "ling-javascript"],
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
    relatedTopicIds: ["com-websocket"],
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
    relatedTopicIds: ["web-css", "web-tailwind-css"],
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
    relatedTopicIds: ["web-tailwind-css", "web-css"],
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
    relatedTopicIds: ["web-next-js", "com-http-https"],
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
    relatedTopicIds: ["devops-docker-compose", "devops-docker"],
  },
  {
    term: "Healthcheck",
    slug: "healthcheck",
    definition:
      "Controllo periodico che verifica se un servizio è sano e permette di riavviarlo o escluderlo dal traffico.",
    relatedTopicIds: ["devops-docker-compose", "devops-docker"],
  },
  {
    term: "Servizio Compose",
    slug: "servizio-compose",
    definition:
      "Unità di Docker Compose che descrive immagine, comando, dipendenze e configurazione di un container.",
    relatedTopicIds: ["devops-docker-compose", "devops-docker"],
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
    relatedTopicIds: ["sec-xss", "sec-cybersecurity"],
  },
];

export const glossaryBySlug = new Map(
  glossary.map((term) => [term.slug, term]),
);
