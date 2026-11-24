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
    relatedTopicIds: ["devops-ci-cd", "auto-github-actions"],
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
];

export const glossaryBySlug = new Map(
  glossary.map((term) => [term.slug, term]),
);
