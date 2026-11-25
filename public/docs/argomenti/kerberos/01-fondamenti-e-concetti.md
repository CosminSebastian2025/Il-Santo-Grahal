Kerberos è il protocollo di autenticazione che Windows, Active Directory, NFS, SSH e molti servizi interni usano da decenni per dimostrare l'identità degli utenti su una rete che non è considerata affidabile. L'idea di fondo è un terzo di fiducia, il Key Distribution Center, che distribuisce biglietti cifrati invece di password: il client non manda mai la propria chiave sulla rete e ogni servizio verifica un ticket senza dover consultare il KDC. In questa lezione impari i nomi, il formato dei ticket e la sequenza AS, TGS e AP che sta dietro a un semplice `kinit` seguito da un accesso a un file server.

## Obiettivi

- Spiegare il ruolo di principal, realm e KDC in un ambiente Kerberos.
- Ricostruire i tre scambi AS, TGS e AP con i messaggi coinvolti.
- Leggere il contenuto di un ticket e distinguere TGT da service ticket.
- Capire il preauthentication e la tolleranza sugli orologi.

## Principal, realm e KDC

Kerberos descrive le identità con un nome strutturato, il *principal*, nella forma `utente@REALM` oppure `servizio/host@REALM`, per esempio `mario@EXAMPLE.IT` e `HTTP/web.example.it@EXAMPLE.IT`. Il realm è un dominio amministrativo di autenticazione e, per convenzione, coincide con il dominio DNS scritto in maiuscolo, come `AD.EXAMPLE.IT` per un dominio Active Directory.

| Concetto | Forma | Esempio |
| --- | --- | --- |
| principal utente | `name@REALM` | `mario@EXAMPLE.IT` |
| principal servizio | `service/host@REALM` | `cifs/file01.example.it@EXAMPLE.IT` |
| realm | DNS in maiuscolo | `EXAMPLE.IT` |
| KDC | host con database dei principal e chiavi | `kdc.example.it` |
| TGS | principal `krbtgt/REALM@REALM` | `krbtgt/EXAMPLE.IT@EXAMPLE.IT` |

Il KDC custodisce per ogni principal una chiave a lungo termine, che nel caso di una persona è derivata dalla password tramite una funzione di *string-to-key* specifica del tipo di cifratura. Il database contiene anche il principal speciale `krbtgt`, la cui chiave cifra i ticket-granting ticket: è il segreto che tiene in piedi l'intero realm, e la sua compromissione equivale alla compromissione di tutte le identità.

```bash
# MIT krb5 su Linux/macOS
kinit mario@EXAMPLE.IT            # AS-REQ + AS-REP, poi il TGT in /tmp/krb5cc_<uid>
klist                             # vedi realm, principal, scadenza e cache
klist -e                          # mostra i tipi di cifratura del ticket
kvno cifs/file01.example.it       # richiede un service ticket per quel servizio
```

Sul client i ticket sono in una *credential cache*: un file o un socket con accesso limitato all'utente. Chi legge quella cache può impersonare l'utente fino alla scadenza, quindi permessi `0600` non sono un dettaglio.

## AS, TGS, AP: i tre scambi

Kerberos funziona con tre scambi distinti, e la prima richiesta è la sola in cui il client dimostra di conoscere la chiave derivata dalla password.

```text
AS-REQ  client -> KDC      "sono mario, voglio un TGT"
AS-REP  KDC -> client      TGT cifrato con la chiave di krbtgt
                           chiave di sessione TGT cifrata con la chiave di mario
TGS-REQ client -> KDC      TGT + authenticator + "voglio cifs/file01"
TGS-REP KDC -> client      service ticket cifrato con la chiave di cifs/file01
                           chiave di sessione servizio cifrata con la chiave TGT
AP-REQ  client -> server   ticket + authenticator cifrato con la chiave di sessione
AP-REP  server -> client   (opzionale) mutua autenticazione
```

Il *preauthentication* è la parte che rende utile il primo scambio: senza di esso il KDC risponderebbe con materiale cifrato che chiunque può catturare e provare a decifrare offline con password dal dizionario. Con PA-ENC-TIMESTAMP il client cifra un timestamp con la propria chiave a lungo termine, e il KDC verifica prima di emettere il ticket. Il meccanismo è descritto e generalizzato in RFC 6113; nel dominio Active Directory è attivo per default.

L'*authenticator* è un record con l'identità del client, un timestamp e un checksum, cifrato con la chiave di sessione. Il ticket da solo è riutilizzabile da chi lo intercetta, perché è cifrato per il servizio e non legato alla richiesta; l'authenticator invece prova che l'ultimo messaggio arriva da qualcuno che possiede la chiave di sessione in questo momento. Il servizio tiene una cache degli authenticator recenti per respingere il replay nella finestra di tolleranza.

| Fase | Cifrato con | Chi può leggere |
| --- | --- | --- |
| parte del TGT (EncTicketPart) | chiave di `krbtgt` | KDC |
| chiave di sessione TGT (EncASRepPart) | chiave utente (da password) | client |
| service ticket | chiave del servizio | servizio |
| chiave di sessione servizio | chiave di sessione TGT | client |
| authenticator | chiave di sessione | servizio |

## Ticket, tempo e cifrature

Un ticket contiene il principal del client, il principal del servizio, i tempi di validità, una copia della chiave di sessione, gli indirizzi opzionali, le opzioni del ticket (forwardable, renewable, proxiable, postdated) e i dati di autorizzazione. Una volta emesso, il servizio lo verifica in locale: Kerberos separa autenticazione da autorizzazione, e il servizio deve consultare i propri elenchi per decidere cosa il principal può fare.

Il tempo è parte del protocollo. Il timestamp dell'authenticator deve cadere dentro una finestra di tolleranza, storicamente di cinque minuti, e anche le richieste TGS vengono rifiutate se gli orologi divergono troppo. Questo rende la sincronizzazione degli orologi un requisito operativo: in Active Directory il dominio si sincronizza con l'ora del controller che detiene il ruolo PDC Emulator, che a sua volta punta a un server NTP esterno. Un client sfasato produce `KRB_AP_ERR_SKEW` e nessuna possibilità di login.

Le cifrature contano quanto le chiavi. RC4-HMAC e DES sono stati deprecati in RFC 6649 e RFC 8429, AES è lo standard (RFC 3962), mentre AES-SHA2 è specificato in RFC 8009 per i nuovi deployment. Un KDC che negozia `aes256-cts-hmac-sha1-96` con una chiave utente rimasta su RC4 continua a funzionare, ma con un degrado silenzioso che i controlli periodici di `klist -e` rendono visibile.

```bash
ktutil                # gestione del keytab: elenco e rotazione delle chiavi
ktutil -k /etc/krb5.keytab list
kdestroy              # elimina la cache dei ticket alla chiusura della sessione
```

Un *keytab* contiene chiavi a lungo termine dei principal di servizio ed è il motivo per cui un demone può accettare ticket senza che sia digitata una password. Va protetto come una password, perché da lì si può firmare qualsiasi cosa per conto del servizio.

## Errori comuni

- **Confondere TGT e service ticket**: il TGT vale solo verso il TGS, il service ticket solo verso un servizio preciso; riusare il TGT per accedere a un host non funziona.
- **Trascurare lo sfasamento degli orologi**: `KRB_AP_ERR_SKEW` non dipende dalle credenziali ed è il primo sospetto quando il login fallisce su un host solo.
- **Lasciare cifrature RC4 nel realm**: la rotazione richiede un coordinamento con i servizi, ma rimandarla è la causa più comune di debolezza residua.
- **Credere che il ticket conceda permessi**: l'autorizzazione resta nel servizio, nel KDC solo i dati che il servizio è disposto a fidarsi.
- **Copiare keytab e cache su share di rete**: equivale a distribuire credenziali senza scadenza.

## In sintesi

Kerberos è un protocollo a tre scambi con un terzo di fiducia: il KDC emette un TGT dopo il preauthentication, il TGS lo converte in ticket di servizio, il server verifica il ticket e l'authenticator usando solo chiavi condivise e una tolleranza di orologio. Il realm definisce chi è amministrativo, il keytab custodisce le chiavi dei servizi, la cache dei ticket è la credenziale pratica dell'utente. Comprendere chi cifra cosa rende leggibili sia i log di autenticazione sia gli attacchi che ne derivano.

## Fonti

- [RFC 4120 - The Kerberos Network Authentication Service (V5)](https://www.rfc-editor.org/rfc/rfc4120)
- [MIT Kerberos Documentation](https://web.mit.edu/kerberos/krb5-latest/doc/)
- [Microsoft Learn - Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
- [RFC 6649 - Deprecate DES, RC4-HMAC-EXP, and Other Weak Cryptographic Algorithms in Kerberos](https://www.rfc-editor.org/rfc/rfc6649)
