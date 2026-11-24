SSH (Secure Shell) è il modo standard per aprire una shell su una macchina remota senza mandare password o comandi in chiaro sulla rete. Non è un singolo programma: è un protocollo con tre strati, definiti nelle RFC 4251–4254, che separa trasporto cifrato, autenticazione dell'utente e multiplazione dei canali. Capire questa separazione rende leggibili i messaggi di errore e le opzioni di `ssh`, che altrimenti sembrano un elenco casuale.

## Obiettivi

- Descrivere i tre strati del protocollo SSH e che cosa fa ciascuno.
- Spiegare come il client verifica l'identità del server con la host key.
- Distinguere autenticazione del server e autenticazione dell'utente.
- Capire perché una sola connessione può trasportare shell, comandi e tunnel insieme.
- Diagnosticare i due errori più frequenti: host key cambiata e permessi sbagliati.

## Tre strati, tre responsabilità

Il **transport layer** (RFC 4253) negozia algoritmi, esegue lo scambio di chiavi e cifra tutto ciò che segue. Il **user authentication layer** (RFC 4252) verifica chi sei: password, chiave pubblica, keyboard-interactive o altro. Il **connection layer** (RFC 4251) apre canali logici sopra il trasporto: una sessione interattiva, un comando singolo, un inoltro di porta o più cose insieme.

Questa divisione spiega un dettaglio pratico: il tunnel SSH funziona anche senza fare login interattivo, perché il trasporto e l'autenticazione sono già avvenuti e il connection layer apre solo un canale di inoltro. Analogamente, un server può permettere l'inoltro delle porte ma negare la shell, tramite opzioni tipo `no-pty` o `command=`.

## Lo scambio di chiavi

All'apertura della connessione client e server eseguono un key exchange, oggi di norma ECDHE su curve come X25519 o curve NIST. Il risultato è un segreto condiviso da cui derivano le chiavi di cifratura e di integrità dei due sensi di marcia. Il segreto non viaggia mai sulla rete e cambia a ogni connessione: è lo stesso principio di forward secrecy visto in TLS.

Durante lo scambio il server si autentica con la propria **host key**. Il client la confronta con quella salvata in `~/.ssh/known_hosts`. Se è la prima volta, `ssh` mostra l'impronta e chiede conferma; se la chiave è diversa da quella memorizzata, blocca la connessione con un avviso di possibile man-in-the-middle. Non è un errore da ignorare: o il server è stato reinstallato, o qualcuno sta intercettando il traffico.

```bash
ssh -v utente@example.com
```

L'output di `-v` elenca versione del protocollo, algoritmi negoziati, chiave host ricevuta e metodo di autenticazione. Con `-vvv` vedi anche i pacchetti e i tentativi di chiave, ed è il primo strumento da usare quando il login fallisce.

## Autenticazione dell'utente

Dopo il trasporto, il client dimostra la propria identità. Il metodo più comune è la chiave pubblica: il client possiede la chiave privata, il server ha quella pubblica in `~/.ssh/authorized_keys`. Il client firma una richiesta con la privata e il server verifica la firma con la pubblica; la privata non lascia mai il computer del client.

L'autenticazione con password esiste ancora, ma è più debole: viaggia dentro il tunnel cifrato, però è soggetta a tentativi ripetuti e a riuso delle credenziali. In produzione conviene disattivarla e usare chiavi con passphrase protette da `ssh-agent`.

## Una connessione, molti canali

Il connection layer assegna un identificatore a ogni canale. Una sessione `ssh host` apre un canale per la shell; `ssh host comando` ne apre uno per il comando e chiude alla fine; `ssh -L` apre un canale di inoltro. Tutti i canali condividono la stessa connessione cifrata, quindi il costo dell'handshake si paga una volta sola.

Il multiplexing è anche il motivo per cui `ControlMaster` funziona: la prima connessione crea un socket locale, le successive lo riusano e saltano handshake e autenticazione. È comodo, ma va usato con consapevolezza, perché il socket diventa una credenziale di lunga durata.

## Sicurezza: non indebolire la verifica

La tentazione al primo collegamento è disattivare il controllo della host key: non farlo, equivale a usare un tubo cifrato collegato "a chi risponde". Se devi automatizzare, popola `known_hosts` in provisioning con una chiave verificata (o `ssh-keyscan` su un canale fidato, mai su una rete non fidata) e tratta un cambio di fingerprint come un evento da investigare.

## Errori comuni

- **`WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED`**: la host key non corrisponde. Verifica l'impronta sul server, non cancellare la riga da `known_hosts` senza controlli.
- **`Permission denied (publickey)`**: il server non riconosce la chiave. Controlla `authorized_keys`, i permessi di `~/.ssh` (700) e dei file (600), e l'utente giusto nel path.
- **`Bad owner or permissions on ~/.ssh/config`**: SSH rifiuta file di configurazione scrivibili da altri. Correggi i permessi invece di usare `-F /dev/null` come scorciatoia.
- **Credere che SSH cifri i file sul server**: SSH cifra il transito, non i dati a riposo. Per quelli servono cifratura del disco o dei singoli file.

## Esercizi

1. Esegui `ssh -v` verso un host che amministri e individua nell'output la riga con la versione del protocollo e quella con la chiave host.
2. Confronta l'impronta mostrata da `ssh-keygen -lf ~/.ssh/known_hosts` con quella pubblicata dall'amministratore del server.
3. Prova `ssh host 'echo ok && uname -a'` e spiega perché non viene aperta una shell interattiva.
4. Osserva con `ssh -vvv` un tentativo fallito e indica in quale strato si ferma: trasporto, autenticazione o connessione.
5. Verifica i permessi con `ls -ld ~/.ssh ~/.ssh/*` e correggi quelli non conformi su una macchina di laboratorio.

## In sintesi

- Il trasporto cifra e verifica, l'autenticazione identifica l'utente, il connection layer apre canali logici multipli sulla stessa sessione cifrata.
- La host key identifica il server: un cambio di impronta va investigato con `ssh-keygen -F`/`ssh-keygen -R`, mai ignorato.
- `ssh -v`/`-vvv` trasformano i sintomi in una riga precisa della catena (trasporto, autenticazione, canale).
- Shell, comando singolo e tunnel sono canali diversi dello stesso tubo.
- Non disattivare la verifica delle host key: è la base su cui poggia tutto il resto.

## Fonti

- RFC 4251 — The Secure Shell (SSH) Protocol Architecture: https://www.rfc-editor.org/rfc/rfc4251.html
- RFC 4252 — The Secure Shell (SSH) Authentication Protocol: https://www.rfc-editor.org/rfc/rfc4252.html
- RFC 4253 — The Secure Shell (SSH) Transport Layer Protocol: https://www.rfc-editor.org/rfc/rfc4253.html
- OpenSSH manual: https://www.openssh.com/manual.html
