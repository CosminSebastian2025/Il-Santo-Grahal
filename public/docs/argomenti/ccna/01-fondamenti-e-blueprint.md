Il CCNA non è una tecnologia ma un percorso di certificazione: un esame ufficiale Cisco, un insieme di obiettivi pubblicati e un modo condiviso di leggere una rete. Studiarlo significa imparare a configurare e diagnosticare una rete di piccole e medie dimensioni, e anche a riconoscere quale competenza stai mettendo alla prova quando fai un esercizio.

## Obiettivi

- Riconoscere la differenza tra certificazione, esame e rinnovo.
- Leggere il blueprint del CCNA come elenco di competenze verificabili.
- Collocare in un dominio i comandi e i concetti di un lab.
- Ricostruire una giornata di studio con orari, verifiche e gap tracciati.
- Distinguere un'informazione dedotta da un lab e un dato ufficiale Cisco.

## La certificazione, l'esame e il rinnovo

Il CCNA è una certificazione associate di Cisco. Per ottenerla devi superare l'esame associato, oggi identificato con il codice **200-301 CCNA**: la pagina ufficiale riporta due versioni dell'esame, `200-301 CCNA v1` e `200-301 CCNA v2`, ed entrambe hanno una durata di **120 minuti** e una valutazione di tipo superato/non superato. Le domande non sono commentate: al termine ricevi solo il risultato e una ripartizione percentuale per area quando non superi l'esame.

Il CCNA scade dopo **tre anni**. Puoi rinnovarlo superando l'esame CCNA corrente, un esame di certificazione Cisco di livello superiore oppure raccogliendo **30 crediti di Continuing Education** attraverso corsi ed eventi approvati.

| Elemento | Dato | Cosa significa per lo studio |
| --- | --- | --- |
| esame | 200-301 CCNA, 120 minuti | larghezza più che profondità |
| esito | superato/non superato, punteggio per area | attenzione alle aree deboli |
| validità | 3 anni | calendario di rinnovo già ora |
| rinnovo | esame o 30 crediti CE | il laboratorio continua anche dopo |
| prerequisiti | nessuno formale | conta l'esperienza pratica |

## Il blueprint come indice di studio

La pagina ufficiale elenca le aree del CCNA v1: fondamentali di rete, accesso alla rete, connettività IP, servizi IP, fondamenti di sicurezza, automazione e programmabilità. La descrizione del CCNA v2 allarga il perimetro a instradamento IP, switching e accesso, servizi e sicurezza, infrastruttura, intelligenza artificiale e gestione operativa. Le percentuali precise per dominio sono nel documento di dettaglio degli obiettivi pubblicato da Cisco Learning Network, non nella pagina di marketing: leggilo sempre dal portale ufficiale, perché cambia con le versioni.

Il modo pratico di usarlo è ribaltare l'ordine. Invece di partire dai comandi, parti dall'obiettivo e chiediti cosa sapresti dimostrare:

```text
Obiettivo (esempio)              Cosa devi saper fare
-------------------------------------------------------------
indirizzamento IPv4              proposta di un piano di subnet verificato in lab
VLAN e trunk                     spiegare 802.1Q e separare due reti con un router
routing statico e dinamico       verificare la tabella di routing passo per passo
servizi DHCP, NAT, NTP, DNS      configurare e leggere i debug associati
sicurezza di base                applicare una ACL e prevederne l'effetto
automazione                      generare configurazioni ripetibili
```

Il dominio non dice quali comandi digitare: quello lo decide la piattaforma. Un obiettivo su VLAN si dimostra allo stesso modo su un router con sottinterfacce e su uno switch con SVI, ma i comandi sono diversi. Tieni separate le due colonne in un foglio di studio: obiettivo a sinistra, comando della piattaforma a destra.

```bash
mkdir -p ccna-studio && cd ccna-studio
printf 'area;obiettivo;laboratorio;stato\n' > piano.csv
printf 'network-access;VLAN e trunk;switch virtuale;da fare\n' >> piano.csv
cat piano.csv
```

## Il laboratorio è parte della certificazione

Il CCNA è stato scritto per chi deve toccare una rete, e le domande verificano spesso il risultato di una configurazione. Un laboratorio con nodi virtuali ha senso perché la pagina ufficiale della certificazione indica l'apprendimento pratico tra i percorsi consigliati, e Cisco documenta simulatori di rete come Cisco Modeling Labs. Se usi un simulatore libero, controlla che supporti i comandi della versione che stai studiando: un comando rifiutato in un emulatore non è un dato sul prodotto reale.

Un buon ciclo di lab è breve e ripetibile:

1. scrivi l'obiettivo in una frase verificabile ("ping tra due VLAN passa dal router");
2. disegna la topologia con indirizzi e porte;
3. configura senza aiuto, da zero;
4. rompi qualcosa di proposito e diagnostica;
5. salva la configurazione e annota i comandi che hanno risolto.

```text
[PC-A] --- [SW1] --- [R1] --- [PC-B]
 10.1.10.0/24   802.1Q   10.1.20.0/24
 VLAN 10                VLAN 20
```

Lo schema è il codice sorgente di un lab di rete: senza indirizzi, VLAN e interfacce annotate, la sequenza di comandi non è riproducibile. Il commento più utile è quello che spiega perché un link è trunk e l'altro è access.

## Concetti didattici e dati ufficiali

Le certificazioni attirano materiale non ufficiale: video, blog, banche di domande. Impara a classificare le informazioni che usi:

| Fonte | Affidabilità | Uso consigliato |
| --- | --- | --- |
| pagina ufficiale Cisco della certificazione | alta, aggiornata | codici d'esame, durata, rinnovo |
| documenti sugli obiettivi (Cisco Learning Network) | alta | perimetro e pesi delle aree |
| documentazione di prodotto Cisco | alta | sintassi, comandi, versioni |
| corso Cisco Networking Academy | alta | percorso guidato con lab |
| tutorial e appunti personali | variabile | utile per spiegazioni, non come riferimento |

Un errore ricorrente è prendere un appunto per una regola: se un comando non compare nella documentazione ufficiale della piattaforma, prima di memorizzarlo verificalo. Allo stesso modo, l'esito di un lab vale per la topologia che hai costruito, non come regola generale.

## Errori comuni

- **Studiare per tecnologia e non per obiettivo**: studiare OSPF in modo enciclopedico senza collegarlo a un obiettivo del blueprint produce conoscenza larga ma non verificabile.
- **Memorizzare comandi senza il contesto della modalità**: lo stesso nome si comporta diversamente tra configurazione globale, interfaccia e protocollo.
- **Confondere la pagina di marketing con gli obiettivi**: la pagina ufficiale riassume i domini, i pesi dettagliati stanno nel documento degli obiettivi.
- **Ignorare il rinnovo**: tre anni passano molto in fretta e un piano di crediti CE va avviato con mesi di anticipo.
- **Prendere un lab per una regola**: una configurazione che funziona nella tua topologia può nascondere dipendenze di versione o hardware.

## In sintesi

Il CCNA è una certificazione a scadenza con un esame unico e un perimetro pubblicato, che cambia tra le versioni. Il blueprint si usa come indice di competenze, non come elenco di comandi. Il laboratorio è la forma naturale di studio, perché le domande verificano il risultato di una configurazione. Distingui sempre la fonte ufficiale dall'appunto personale.

## Fonti

- CCNA Certification and Training — https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html
- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
- Cisco Networking Academy — https://www.netacad.com/
- Cisco Modeling Labs — https://developer.cisco.com/modeling-labs/
- Cisco IOS & NX-OS Software Support — https://www.cisco.com/c/en/us/support/ios-nx-os-software/index.html
