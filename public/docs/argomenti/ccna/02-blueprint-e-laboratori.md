Il CCNA è largo e il tempo è poco: un esame da 120 minuti copre indirizzamento, switching, instradamento, servizi e sicurezza. Il modo più efficiente di prepararsi non è accumulare lezioni, ma misurare cosa sai e cosa non sai, usando il blueprint come indice e gli output del laboratorio come verifiche di apprendimento.

## Obiettivi

- Scomporre il blueprint in competenze misurabili con un criterio di verifica.
- Ordinare lo studio seguendo i prerequisiti e non l'indice dei libri.
- Progettare una check-list di verifica per ogni lab.
- Trascrivere l'esito di un esercizio in dati confrontabili nel tempo.
- Ricavare argomenti deboli dalle risposte errate invece di ripassare tutto.

## Dal blueprint a un piano pesato

Un piano efficace parte dalla classificazione delle competenze per costo. Alcune si verificano in pochi minuti (indirizzi su un'interfaccia), altre richiedono una topologia (routing tra VLAN, ACL ordinate). Se non tieni conto del costo, riempirai la settimana di esercizi brevi e arriverai al lab di routing senza previsione.

| Competenza | Costo di verifica | Prerequisito |
| --- | --- | --- |
| indirizzamento IPv4 e maschere | basso, carta e `ping` | binario di base |
| configurazione di host e interfacce | basso | indirizzamento |
| VLAN, access e trunk | medio | switching di base |
| instradamento statico | medio | indirizzamento |
| instradamento dinamico | alto | tabella di routing |
| servizi (DHCP, NAT, NTP, DNS) | medio | indirizzamento |
| ACL e sicurezza di base | alto | flusso dei pacchetti |
| automazione e gestione | medio | accesso CLI |

L'ordine di studio migliore segue i prerequisiti più che le sezioni: se salti la tabella di routing, il lab DHCP sembrerà magia.

```text
settimane 1-2   subnetting a mano, indirizzi su una piattaforma
settimana 3     switching di base, VLAN, trunk, indirizzo di gestione
settimana 4     instradamento statico tra VLAN e verso l'esterno
settimana 5     routing dinamico e lettura della tabella
settimana 6     servizi: DHCP, NAT, NTP, DNS di base
settimane 7-8   ACL, gestione, backup e mini test integrato
```

Il dettaglio dei pesi per dominio è nel documento ufficiale degli obiettivi del CCNA: prima di fissare le settimane, rileggilo e segna le percentuali nelle tue note.

## Diagnostica come verifica

Ogni lab può produrre un output che funziona da valutazione. In una rete Cisco l'apparecchio racconta il proprio stato attraverso comandi `show` e attraverso i messaggi di sistema che compaiono sulla console. Imparare a leggerli è il modo più diretto per verificare se una configurazione ha avuto l'effetto previsto.

```text
domanda di verifica                     output che la risponde
-----------------------------------------------------------------
la VLAN esiste?                         elenco delle VLAN
la porta è access o trunk?              stato delle porte, VLAN nativa
il vicino è raggiungibile?              tabella di routing, ARP
il client ha ricevuto un indirizzo?     output DHCP o indirizzo del client
la ACL blocca il traffico?              contatori delle regole
```

Il trucco didattico è trasformare l'output in una regola di lettura: "se la porta è in stato collegato, l'incapsulamento è attivo". Scrivi la domanda prima dell'output, così la verifica resta valida anche su un'altra piattaforma.

```bash
printf 'id;domanda;esito\n' > verifiche.csv
printf '1;VLAN presente?;ok\n' >> verifiche.csv
printf '2;porta trunk?;no\n' >> verifiche.csv
awk -F';' 'NR>1 && $3=="no" {print "Da rivedere: " $2}' verifiche.csv
```

Il passaggio con `awk` è il nucleo metodologico: registri gli esiti e generi la lista da rivedere, così il ripasso è mirato invece di essere una rilettura completa.

## Un annuario di laboratori

Il laboratorio del CCNA è fatto di ripetizioni: lo stesso tema rivisto a distanza di giorni resiste molto più di una lezione guardata due volte.

```text
Lab 02 | VLAN e trunk | soglia: ping tra VLAN 10 e 20 via router
Topologia: PC-A VLAN10 - SW1 - gi0/1 trunk - R1 - SW2 - PC-B VLAN20
Errori incontrati: porta lasciata access sul trunk, default gateway sbagliato
Ripasso previsto: +3 giorni, +10 giorni
```

Tre elementi fanno la differenza: la soglia di successo, la topologia con le porte, gli errori incontrati. L'errore è il dato più prezioso, perché dice dove il modello mentale è sbagliato. Tieni conto anche della piattaforma: quando la simulazione rifiuta un comando, spesso manca una feature; controlla la documentazione prima di riscriverlo dieci volte.

## Misurare e scegliere cosa ripassare

Un test di 20 domande scritte da te vale più di un quiz generico, a patto che ogni domanda abbia un esito binario. Ripassa il dominio con il rapporto errori/domande più alto, non quello con più errori in assoluto.

| Esito | Interpretazione | Azione |
| --- | --- | --- |
| corretta subito | competenza stabile | ripasso a 14 giorni |
| corretta dopo esitazione | competenza fragile | ripasso a 3 giorni e nuovo lab |
| sbagliata ma riconosciuta | lacuna puntuale | nota di una riga e micro-lab |
| sbagliata e non riconosciuta | misconoscimento | riparti dal prerequisito |

Nessun dominio passa al ripasso lungo finché non ha un lab superato in autonomia, senza guardare appunti: l'obiettivo del CCNA è saper fare, non saper riconoscere.

## Errori comuni

- **Pesare il piano sulle pagine invece che sulle competenze**: un capitolo lungo non vale più di un lab breve che rivela una lacuna.
- **Ripassare tutto prima di ogni test**: la rilettura crea familiarità, non memoria operativa, e nasconde le aree deboli.
- **Non annotare gli errori dei lab**: senza il registro degli sbagli ripeti le stesse configurazioni sbagliate.
- **Trattare simulatori e apparati come intercambiabili**: una feature assente nella simulazione non dice nulla sul prodotto reale.
- **Fissare le settimane senza leggere gli obiettivi aggiornati**: pesi e domini cambiano tra le versioni dell'esame.

## In sintesi

Il piano del CCNA si costruisce sulle competenze e sui prerequisiti, non sull'indice dei manuali. Ogni lab ha una soglia di verifica, una topologia annotata con le porte e un registro degli errori. Gli output del laboratorio diventano criteri di valutazione se scrivi la domanda prima di leggerli. Il ripasso si sceglie in base al rapporto errori/domande per dominio e un dominio è stabile solo dopo un lab superato in autonomia.

## Fonti

- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
- CCNA Certification and Training — https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html
- Cisco Networking Academy — https://www.netacad.com/
- Cisco Modeling Labs — https://developer.cisco.com/modeling-labs/
- Configure IP Addresses and Unique Subnets — https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html
