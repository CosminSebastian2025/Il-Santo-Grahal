In un realm reale il protocollo è la parte semplice: il lavoro sta nella configurazione, nella delega tra servizi e nel riconoscere gli attacchi che sfruttano come i ticket vengono emessi. In questa lezione costruiamo il file `krb5.conf`, studiamo i flag del ticket e i principali attacchi di Kerberos, e chiudiamo con le contromisure che un amministratore applica davvero: account sensibili protetti, delegazione vincolata, Kerberos armoring di Windows e registro degli eventi.

## Obiettivi

- Scrivere un `krb5.conf` con realm, KDC, name mapping e ricerca DNS.
- Usare i flag del ticket: forwardable, proxiable, renewable e postdated.
- Riconoscere Kerberoasting, AS-REP Roasting, golden ticket e silver ticket.
- Applicare contromisure e sapere quali eventi di Windows cercare nei log.

## Configurazione del client e del KDC

Il client legge la configurazione da `/etc/krb5.conf` su sistemi Unix o dalla cache del sistema su Windows, e scopre il KDC in due modi: record `SRV` in DNS oppure indirizzo esplicito nel file. Il record DNS sotto `_kerberos` costa poco e riduce le configurazioni divergenti tra host.

```ini
[libdefaults]
    default_realm = EXAMPLE.IT
    dns_lookup_realm = false
    dns_lookup_kdc = true
    default_ccache_name = FILE:/tmp/krb5cc_%{uid}
    permitted_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    rdns = false
    clockskew = 300

[realms]
    EXAMPLE.IT = {
        kdc = kdc1.example.it:88
        kdc = kdc2.example.it:88
        admin_server = kdc1.example.it:749
    }

[domain_realm]
    .example.it = EXAMPLE.IT
```

`rdns = false` e un valore esplicito di `clockskew` sono due scelte che evitano problemi difficili da diagnosticare: la prima impedisce che i nomi dei servizi cambino forma per una risoluzione inversa, la seconda rende prevedibile la finestra di tolleranza degli orologi. Il MIT krb5 1.21 usa UDP con fallback a TCP quando la risposta di `AS-REP` supera la dimensione di un datagramma.

Lato Windows la configurazione vive nella policy di dominio: l'elenco dei controller di dominio, il tempo massimo di vita dei ticket e la politica di cifratura sono gestiti tramite GPO. Un'incoerenza tra il `krb5.conf` di un server Linux e la policy del dominio è la causa tipica dei ticket che si ottengono ma non si usano.

| Flag del ticket | Significato | Rischio operativo |
| --- | --- | --- |
| forwardable | il TGT può essere delegato a un altro host | il servizio può agire come l'utente |
| proxiable | si può emettere un ticket per un altro indirizzo | uso da un host diverso |
| renewable | il ticket si rinnova fino a un limite | credenziale lunga sulla cache |
| postdated | il ticket è valido da un momento futuro | uso non immediato |
| anonymous | ticket per principal anonimo (RFC 6112) | accesso senza identità |

## Delegazione

Un servizio composto da più strati, per esempio un portale web che deve leggere un file per conto dell'utente, ha bisogno di un service ticket emesso per agire come l'utente. Tre varianti si sono susseguite: la delega non vincolata, in cui il servizio riceve un TGT forwardable e può chiedere qualsiasi ticket; la delega vincolata, in cui può chiedere solo ticket per i servizi elencati nella propria configurazione; la delega vincolata con transizione di protocollo, in cui la richiesta è legata a un utente che ha effettuato il login in un altro modo, come un certificato o un form applicativo.

```text
portale -> utente: login con form applicativo
portale -> KDC:   TGS-REQ per cifs/file01 con "protocol transition"
KDC -> portale:   ticket con dati di autorizzazione che indicano l'utente
portale -> file01: AP-REQ tipico, il servizio non vede il passaggio applicativo
```

La delega non vincolata è la più pericolosa: un servizio compromesso ottiene tutte le credenziali degli utenti che lo hanno usato. In Active Directory si concede solo se serve, e si preferisce la delega vincolata su specifiche coppie `servizio/host`. Nel Linux con GSSAPI si controlla con la configurazione del keytab e con le opzioni di `kinit -f`, sapendo che un client che chiede sempre `forwardable` estende il raggio d'azione di un furto di cache.

## Gli attacchi che contano

**Kerberoasting** sfrutta un service ticket: chiunque abbia un TGT valido può chiedere un ticket per un principal di servizio che usa una password, ricevere materiale cifrato con la chiave del servizio e decifrarlo offline. La difesa è una password lunga e casuale (o un account `gMSA` in Active Directory) per gli account di servizio, sapendo che la rotazione è la sola cosa che riduce il valore del materiale già catturato.

**AS-REP Roasting** colpisce gli account senza preauthentication abilitata: il KDC risponde con il materiale cifrato anche senza dimostrazione di identità, e chiunque può raccoglierlo e tentare offline. La contromisura è banale ma spesso dimenticata: preauthentication attiva su tutti gli account, insieme a password ad alta entropia.

**Golden ticket** presuppone la compromissione della chiave di `krbtgt`: l'attaccante forgia un TGT con qualsiasi identità e validità e il KDC lo accetta come proprio. Si contiene con la rotazione della password di `krbtgt` due volte a distanza di almeno la durata massima dei ticket, e con l'isolamento dei controller di dominio.

**Silver ticket** usa la chiave di un servizio per forgiare un ticket valido solo per quel servizio. Non passa dal KDC, quindi non produce eventi `4769`; si scopre confrontando la cache di authenticator e i log del servizio.

Per il monitoraggio servono correlazioni, non singoli eventi: un `4769` con `Ticket Encryption Type` debole è il segnale classico del Kerberoasting, un `4768` con `Pre-Authentication Type` a zero quello dell'AS-REP Roasting, una vita del ticket superiore alla policy quello del golden ticket. Un SIEM che aggrega per utente e per servizio entro una finestra di dieci minuti trova quello che un `grep` sui log non trova.

| Attacco | Materiale necessario | Evento tipico | Contromisura principale |
| --- | --- | --- | --- |
| Kerberoasting | TGT valido | `4769` con cifratura debole | password robuste, `gMSA`, monitoraggio |
| AS-REP Roasting | solo l'elenco utenti | `4768` senza preauth | preauthentication obbligatoria |
| golden ticket | chiave `krbtgt` | `4768` con vita oltre la policy | rotazione doppia, isolamento DC |
| silver ticket | chiave del servizio | nessun evento sul KDC | rigenerazione della password del servizio |

## Contromisure nella pratica

Active Directory offre meccanismi attivi: la flag `ADS_UF_NOT_DELEGATED` sugli account privilegiati impedisce la delega e protegge anche dagli abusi di delega, la group policy "sensitive accounts cannot be delegated" copre i gruppi, e Kerberos armoring (FAST, RFC 6113) protegge i messaggi preauthentication da attacchi di downgrade e da tentativi offline su materiale catturato, perché il canale è protetto dalla chiave del KDC. Gli account che non devono poter essere usati con delega verso altri servizi vanno marcati, non solo esclusi a voce.

| Controllo | Effetto | Dove si imposta |
| --- | --- | --- |
| account non delegabile | nessun TGT forwardable per quel principal | attributo utente o GPO sul gruppo |
| delega vincolata | solo i servizi in elenco | proprietà dell'oggetto computer |
| armoring (FAST) | preauthentication protetta da un canale KDC | policy di dominio recente |
| cifratura minima AES | niente RC4 richiesto per i principal | `msDS-SupportedEncryptionTypes` |
| rotazione `krbtgt` | invalida i golden ticket emessi | due rotazioni, distanziate |

Sul piano operativo conviene fissare parametri espliciti anche lato servizio: durata massima del TGT (in genere dieci ore in Active Directory), durata massima del rinnovo (sette giorni) e finestra di tolleranza dell'orologio dovrebbero essere scritti nella documentazione del dominio, perché sono le stesse cifre che servono per interpretare un `klist` e per decidere quando un incidente è chiuso.

Sul versante della cifratura, un dominio che conserva RC4 ha un problema costante: ogni utente con password debole produce materiale decifrabile offline anche con AES abilitato, perché la chiave RC4 può ancora essere richiesta. L'inventario delle cifrature per principal si costruisce da eventi `4768` e `4769` e dalle impostazioni della policy `msDS-SupportedEncryptionTypes`.

```powershell
# PowerShell, solo su un lab o nel tuo dominio con permessi di lettura
Get-ADUser -Filter {ServicePrincipalName -like "*"} -Properties ServicePrincipalName |
  Select-Object SamAccountName, ServicePrincipalName
Get-ADUser -Identity svc_backup -Properties msDS-SupportedEncryptionTypes |
  Select-Object SamAccountName, msDS-SupportedEncryptionTypes
```

Il terzo pilastro è il tempo: nessuna policy di cifratura sostituisce la sincronizzazione NTP, e nessun monitoraggio funziona se i log dei controller si chiudono troppo presto. Le contromisure non sono un elenco di interruttori, ma un ciclo: inventario, riduzione delle credenziali con vita lunga, verifica periodica tramite i log.

## Errori comuni

- **Concedere la delega "perché il portale non funziona"**: quasi sempre il problema è un principal di servizio errato, non la delega mancante.
- **Ruotare `krbtgt` una volta sola**: i ticket emessi appena prima restano validi con la vecchia chiave finché non scadono.
- **Disattivare preauthentication per comodità di un vecchio client**: apre l'intero account ad AS-REP Roasting.
- **Leggere gli eventi senza conoscere i codici**: `4625` è il fallimento generico, `4768`/`4769` sono la parte Kerberos e i codici di stato specifici stanno nel campo `Status`.
- **Dimenticare i servizi con password su host non gestiti**: nessun controllo sul KDC rileva una chiave del servizio compromessa fuori dal dominio.

## In sintesi

La configurazione dice al client come trovare il KDC e quale finestra temporale accettare, i flag del ticket decidono quanto si propaga un TGT, i tre attacchi principali colpiscono materiale cifrato con chiavi a lungo termine o la chiave `krbtgt`. Le difese sono concrete: password di servizio ad alta entropia o credenziali gestite, preauthentication sempre attiva, delega vincolata, rotazione e monitoraggio degli eventi Kerberos.

## Fonti

- [MIT Kerberos 1.21 Documentation - Kerberos realm configuration](https://web.mit.edu/kerberos/krb5-1.21/doc/admin/realm_config.html)
- [RFC 6113 - A Generalized Framework for Kerberos Pre-Authentication](https://www.rfc-editor.org/rfc/rfc6113)
- [RFC 6784 - Kerberos Options for DHCPv6](https://www.rfc-editor.org/rfc/rfc6784)
- [Microsoft Learn - Kerberos authentication overview](https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview)
