Questo laboratorio mette in pratica la CLI di Cisco IOS su un dispositivo reale o simulato: non imparerai nuove configurazioni, ma il metodo per costruirle, verificarle e documentarle. Lavora sempre in un ambiente di test, mai su apparati in produzione, e usa una topologia minima di cui conosci ogni cavo. Al termine avrai una configurazione di base verificata, un backup e una procedura ripetibile.

## Obiettivi

- Costruire una configurazione minima funzionante in ordine logico.
- Verificare l'effetto di ogni blocco con il comando di stato adatto.
- Copiare la configurazione su un supporto esterno e ripristinarla.
- Distinguere un errore di sintassi da un errore di progettazione.
- Documentare la configurazione con una scheda riproducibile.

## Esercizi

1. **Sessione di prima configurazione.** Entra in modalità privilegiata, imposta il nome, un indirizzo di gestione su un'interfaccia e attivala. Dopo ogni blocco esegui un comando di stato e annota la differenza rispetto al blocco precedente.

```text
Router> enable
Router# configure terminal
Router(config)# hostname LAB-R1
LAB-R1(config)# interface GigabitEthernet0/0
LAB-R1(config-if)# no shutdown
LAB-R1(config-if)# ip address 10.10.10.2 255.255.255.252
LAB-R1(config-if)# end
```

2. **Modalità e prompt.** Dimostra con comandi la differenza tra `exit` ed `end` da una sottomodale e scrivi una tabella con prompt di partenza, comando e prompt di arrivo.

3. **Filtri di output.** Con configurazioni di almeno venti righe, confronta il risultato di `show running-config | include`, `| section` e `| begin` su una stessa parola e spiega in quali casi ciascuno è più utile.

4. **Backup e ripristino.** Salva la configurazione, modifica un valore, ripristina la copia salvata e verifica se la modifica è scomparsa. Annota cosa resta e perché.

5. **Errore di sintassi contro errore di progetto.** Prova un comando con una parola inesistente e poi una configurazione sintatticamente corretta ma logicamente sbagliata. Distingui i segnali dei due casi.

6. **Scheda del dispositivo.** Scrivi una scheda da mezza pagina con modello, ruolo nel lab, interfacce con indirizzi, VLAN o rotte configurate, data dell'ultimo backup e criterio di ripristino.

<details>
<summary>Soluzione</summary>

1. L'ordine conta: `hostname` è in modalità globale, `interface` apre una sottomodale e le righe successive agiscono solo su quella porta. Dopo `no shutdown` lo stato può restare non collegato se il cavo manca: la configurazione è accettata ma la porta non è attiva, ed è una distinzione che i comandi di stato rendono visibile. L'indirizzo `/30` è tipico dei link punto-punto e lascia due host utili.

2. Da `LAB-R1(config-if)#`, `exit` porta a `(config)#`, un livello su; `end` porta a `LAB-R1#`. Annotalo perché spiegare questa differenza evita di digitare comandi di interfaccia in modalità globale.

3. `include` mostra le righe che corrispondono, `section` i blocchi introdotti dalla parola, `begin` da una certa riga in poi. `include` è il più preciso per una riga singola, `section` il più utile per un'interfaccia o un protocollo, `begin` comodo per leggere tutto lo stato da un certo punto in poi, ma produce output lungo.

4. Dopo il salvataggio, il ripristino da `startup-config` riporta il valore precedente se il valore modificato esisteva già nella copia salvata. Se invece la modifica ha aggiunto una nuova riga, quella riga non viene rimossa. È il motivo per cui il ripristino va verificato con un confronto e non dato per scontato.

5. Il comando con parola inesistente viene rifiutato con un messaggio di sintassi e non entra nella configurazione in esecuzione. La configurazione formalmente valida viene accettata senza errori ma produce un esito sbagliato nel test di funzionamento: la verifica di progetto si fa con `ping` e con i comandi di stato, non con l'occhio sulla sintassi.

6. Una scheda efficace contiene ciò che serve a ricostruire la macchina: modello, ruolo, porte e indirizzi, oggetti configurati, data del backup e criterio di ripristino. Se la scheda non basta a ricostruire il lab, non è una scheda ma un appunto.

</details>

## Procedura di verifica

La configurazione minima va verificata con una sequenza fissa, ripetibile su qualsiasi dispositivo. I nomi esatti dei comandi di stato variano per piattaforma e versione: qui sono indicati per funzione.

| Passo | Domanda | Comando di osservazione |
| --- | --- | --- |
| 1 | la macchina ha la configurazione attesa? | elenco delle righe della configurazione in esecuzione |
| 2 | le interfacce sono attive e con indirizzo? | riepilogo di interfacce e protocolli |
| 3 | la configurazione è salvata? | confronto tra esecuzione e avvio |
| 4 | il vicino è raggiungibile? | ping verso l'indirizzo del vicino |
| 5 | la copia esterna è allineata? | elenco della copia sul server |

La sequenza è deliberatamente noiosa: il valore sta nella ripetizione. Salvataggio dimenticato, porta spenta e copia esterna vecchia sono i tre guasti più frequenti a fine lab.

```bash
# esempio di sequenza in modalità privilegiata, su un dispositivo simulato
show running-config | section interface
show ip interface brief
show startup-config | include hostname
ping 10.10.10.1
```

## Criterio di uscita

Hai finito quando sai ricostruire senza appunti una configurazione minima con indirizzo di gestione, spiegare perché un ripristino non è un reset e produrre una scheda che un collega potrebbe usare per riprendere il lavoro: è la parte di IOS che si usa ogni giorno.

## Errori comuni

- **Attivare un'interfaccia senza aver capito se è spenta l'interfaccia o il cavo**: la configurazione viene accettata ma lo stato resta inattivo, e la causa va cercata nel livello fisico.
- **Salvare la configurazione solo alla fine del lab**: se ti interrompi a metà, il lavoro non è recuperabile.
- **Ripristinare `startup-config` come fosse un reset**: le righe aggiunte solo nella copia in esecuzione restano attive.
- **Considerare un errore di sintassi uguale a un errore di progetto**: il primo è rifiutato subito, il secondo è accettato e si vede solo nel funzionamento.
- **Documentare il lab con la sola configurazione**: senza modello, porte e data del backup la configurazione non è ricostruibile.

## In sintesi

Il laboratorio IOS serve a costruire un metodo: ordine dei comandi, verifica a ogni blocco, salvataggio, backup, scheda. La verifica si basa sui comandi di stato, non sulla memoria di ciò che si è digitato. Il ripristino ha regole precise e non equivale a un reset. Il criterio di uscita è l'autonomia nella ricostruzione di una configurazione minima.

## Fonti

- Cisco IOS & NX-OS Networking Software Support — https://www.cisco.com/c/en/us/support/ios-nx-os-software/index.html
- Configure IP Access Lists — https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- Cisco IOS Security Command Reference: Commands A to C — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/security/a1/sec-a1-cr-book.html
- Cisco Modeling Labs — https://developer.cisco.com/modeling-labs/
- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
