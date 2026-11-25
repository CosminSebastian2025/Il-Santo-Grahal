La CLI di Cisco IOS è una shell molto diversa da quella di un sistema Unix: niente pipe tra programmi, niente script in un linguaggio generale, ma un vocabolario enorme e comandi che cambiano significato in base alla modalità. Per questo il lavoro quotidiano si fa con gli strumenti che IOS mette a disposizione: help inline, scorciatoie, filtri sull'output, copia verso un server esterno e sessioni di configurazione. In questa lezione impari questi strumenti come si imparerebbe il tab di completamento di una shell.

## Obiettivi

- Usare help inline e scorciatoie per esplorare il vocabolario senza documentazione.
- Filtrare l'output di un comando con le espressioni di ricerca di IOS.
- Copiare la configurazione verso un file esterno e ricaricarla.
- Organizzare una sessione di configurazione con commenti e sequenze riutilizzabili.
- Riconoscere gli output che indicano che un comando è stato accettato.

## Help, scorciatoie e cronologia

Il `?` è il dizionario della CLI. Senza spazi mostra le parole ammesse nella posizione corrente, con uno spazio mostra la descrizione. Un errore di battitura produce una risposta immediata che indica la posizione approssimativa del problema: è il compilatore della configurazione, e va letto come si legge un errore di compilazione.

| Operazione | Tasti o comando | Nota |
| --- | --- | --- |
| completare una parola | Tab | solo se il prefisso è univoco |
| elenco delle opzioni | `?` | con spazio mostra la descrizione |
| scorrere un output lungo | barra spaziatrice | una pagina per volta |
| richiamare l'ultimo comando | `Ctrl+P` o freccia su | cronologia di sessione |
| tornare alla privilegiata | `end` | da qualunque modalità di configurazione |
| cancellare la riga | `Ctrl+U` | la riga non viene inviata |

Queste scorciatoie non sono folklore: sono ciò che rende possibile lavorare su un dispositivo senza consultare un manuale a ogni riga. Imparale presto, perché abbattono la differenza tra un laboratorio lento e uno scorrevole.

## Filtrare l'output

Una configurazione reale è lunga centinaia di righe e un `show` completo scorre via. IOS consente di filtrare l'output con una barra e un'espressione di ricerca, che agisce sulle righe stampate.

```bash
show running-config | include ip route    # solo le righe che contengono la stringa
show running-config | section interface   # blocchi a partire dalla riga che contiene la parola
show ip interface brief                   # riepilogo di indirizzi e stato
show version | include uptime             # una sola informazione dal dettaglio sistema
```

Il filtro agisce su testo, non su struttura: `include ip route` trova anche righe che contengono la stringa per caso. Per questo la forma più robusta è unire un comando `show` già mirato a un filtro minimo, invece di filtrare un output enorme con una parola generica. Il comando `section` è utile per isolare un blocco di configurazione di un'interfaccia o di un protocollo.

Un dettaglio pratico: il filtro non modifica il dispositivo ed è quindi sicuro in sola lettura. Per questo `show ... | include ...` è una delle sequenze più digitate su IOS.

## Copia, backup e ripristino

La configurazione in esecuzione può essere copiata su un supporto esterno o su un server. La sintassi cambia con il protocollo del server, quindi si scrive la coppia sorgente/destinazione:

```bash
# dalla memoria del dispositivo al server remoto
copy running-config tftp:
copy running-config startup-config

# ripristino: la configurazione esterna viene applicata a quella in esecuzione
copy tftp: running-config
```

La copia su `tftp:` richiede una rete funzionante e un server disponibile: se la rete è rotta, il backup non parte. Meglio salvare `startup-config` appena una configurazione funziona e conservare una copia esterna quando la macchina è raggiungibile dalla rete di gestione.

| Operazione | Sorgente | Destinazione | Rischio |
| --- | --- | --- | --- |
| salvataggio locale | `running-config` | `startup-config` | nessuno, sovrascrive la copia vecchia |
| backup esterno | `running-config` | server TFTP/FTP/SCP | la rete deve funzionare |
| ripristino | server o `startup-config` | `running-config` | modifica immediata, non annulla righe extra |

Il ripristino è la parte delicata. Riportare `startup-config` in `running-config` non è un reset: le righe presenti solo nella copia in esecuzione restano attive, quindi il risultato può essere un ibrido. Se l'obiettivo è ripartire da zero, la strada corretta è cancellare la configurazione di avvio e riavviare, sapendo che la macchina tornerà allo stato iniziale e che potrebbe servire un accesso fisico.

## Sessioni e ordine delle operazioni

IOS esegue i comandi nell'ordine in cui li riceve, e questo crea dipendenze: un indirizzo su un'interfaccia inesistente non ha effetto, una rotta verso una rete non ancora attiva resta inattiva. Prima di incollare una configurazione scrivila nell'ordine giusto: nome, credenziali, interfacce, protocolli, verifica.

```text
1. impostare il nome e leggere la versione
2. configurare le credenziali di console e vty
3. assegnare indirizzi alle interfacce
4. verificare lo stato con i comandi di riepilogo
5. salvare in startup-config
```

Per le configurazioni lunghe incollare è una pratica comune. Il limite è che gli errori stampati durante l'incollaggio si perdono nello scorrimento: dopo un incollaggio massivo confronta `show running-config` con quello atteso, riga per riga.

## Errori comuni

- **Filtrare con una parola troppo generica**: l'espressione agisce su testo e produce righe fuori contesto; usa un filtro stretto insieme a un comando già mirato.
- **Ripristinare `startup-config` aspettandosi un reset**: le righe presenti solo nella copia in esecuzione restano, quindi il risultato è un ibrido.
- **Fare backup solo al riavvio**: la verifica del backup va fatta consultando la copia esterna, non assumendo che sia riuscita.
- **Incollare senza controllare l'output**: gli errori scorrono via e la configurazione risulta incompleta in modo silenzioso.
- **Affidarsi al Tab senza verificare**: se il prefisso è ambiguo la CLI non completa e la riga successiva viene interpretata altrove.

## In sintesi

La CLI di IOS si esplora con `?` e scorciatoie, e si naviga filtrando gli output. La configurazione si salva localmente e si copia su un server, ma il ripristino non è un reset. L'ordine dei comandi conta, e un incollaggio va verificato con un confronto della configurazione attiva. Chi domina questi strumenti passa meno tempo a cercare comandi e più a leggere il dispositivo.

## Fonti

- Cisco IOS & NX-OS Networking Software Support — https://www.cisco.com/c/en/us/support/ios-nx-os-software/index.html
- Cisco IOS Security Command Reference: Commands A to C — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/a1/sec-a1-cr-book.html
- Configure IP Access Lists — https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- TCP/IP Overview — https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13769-5.html
- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
