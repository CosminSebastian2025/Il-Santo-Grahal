In questo laboratorio monti un realm Kerberos con MIT krb5 su una macchina sola, senza Active Directory e senza servizi esterni, usando `127.0.0.1` come host del KDC e un realm `LAB.EXAMPLE.IT`. Alla fine hai un KDC con database creato da zero, un principal utente, un principal di servizio con keytab, ticket ottenuti e ispezionati con `klist`, e una prova concreta che il preauthentication e la tolleranza sugli orologi fanno la differenza. Tutto quello che serve al laboratorio è locale e reversibile.

## Obiettivi

- Inizializzare un database Kerberos con `kdb5_util` e un ACL minimale per `kadmin`.
- Creare principal utente e di servizio, esportare un keytab e proteggerlo.
- Ottenere TGT e service ticket, leggerne tipo di cifratura e flag con `klist -e -f`.
- Provocare e riconoscere un errore di sfasamento dell'orologio.

## Prerequisiti e inizializzazione del KDC

Servono i pacchetti MIT krb5 (`krb5-kdc`, `krb5-admin-server` su Debian e Ubuntu, `krb5-server` su derivati Fedora) e Python per lo script di prova. Se lavori su Windows, il laboratorio gira in WSL o in una VM Linux: è importante che il percorso di configurazione sia quello canonico `/etc/krb5.conf`, perché molti client lo cercano lì.

```bash
sudo apt install krb5-kdc krb5-admin-server krb5-user
sudo dpkg-reconfigure krb5-kdc   # realm LAB.EXAMPLE.IT, KDC localhost, admin server localhost
```

Poi si scrive la configurazione del KDC, poi si crea il database. Il realm va scritto in maiuscolo, e la password del master key va custodita: senza quella il database non si apre più.

```ini
# /etc/krb5kdc/kdc.conf
[kdcdefaults]
    kdc_ports = 88
    kdc_tcp_ports = 88

[realms]
    LAB.EXAMPLE.IT = {
        database_name = /var/lib/krb5kdc/principal
        admin_keytab = FILE:/etc/krb5kdc/kadm5.keytab
        acl_file = /etc/krb5kdc/kadm5.acl
        key_stash_file = /etc/krb5kdc/stash
        max_life = 10h
        max_renewable_life = 7d
        supported_enctypes = aes256-cts-hmac-sha1-96:normal aes128-cts-hmac-sha1-96:normal
    }
```

```bash
sudo kdb5_util create -s -r LAB.EXAMPLE.IT
# risponde con la master key due volte

echo '*/admin@LAB.EXAMPLE.IT *' | sudo tee /etc/krb5kdc/kadm5.acl
sudo kadmin.local -q "addprinc admin/admin"     # chiederà una password
sudo systemctl restart krb5-kdc krb5-admin-server
```

L'ACL `*/admin@LAB.EXAMPLE.IT *` permette a qualsiasi principal con componente `admin` di gestire tutto il realm. In un realm reale sarebbe troppo permissiva, nel laboratorio è il minimo per poter creare principal da remoto con `kadmin`.

## Principal, keytab e ticket

Ora si crea `mario@LAB.EXAMPLE.IT` con una password nota, e un principal di servizio `host/lab.example.it` il cui keytab viene letto da un processo. Il servizio non ha una password utile: la sua chiave è solo nel keytab e nel database del KDC.

```bash
sudo kadmin.local -q "addprinc -pw 'Lab-Password-2026!' mario"
sudo kadmin.local -q "addprinc -randkey host/lab.example.it"
sudo kadmin.local -q "ktadd -k /tmp/lab.keytab host/lab.example.it"
sudo chown "$USER" /tmp/lab.keytab && chmod 600 /tmp/lab.keytab

sudo kadmin.local -q "listprincs"
```

Il passaggio successivo è il primo scambio AS. Con `kinit` il client cifra il timestamp di preauthentication con la chiave derivata dalla password e riceve il TGT. `klist` mostra che cosa contiene la cache, e gli flag `-e` e `-f` rivelano il degrado che altrimenti resta invisibile.

```bash
kinit mario
klist -e -f
# Valid starting ...  Expires ...  Service principal
# 25/11/2026 10:14  25/11/2026 20:14  krbtgt/LAB.EXAMPLE.IT@LAB.EXAMPLE.IT
# renew until ..., Flags: Ff, Etype (skey, tkt): aes256-cts-hmac-sha1-96
kvno host/lab.example.it
klist
```

`kvno` chiede al TGS un ticket per `host/lab.example.it` e lo mette in cache. Il ticket può essere ispezionato con `klist` e la cache può essere esportata per l'analisi, ma non si può leggere la parte cifrata: è il punto del protocollo, il servizio è l'unico in grado di decifrarla. Un tentativo di usare lo stesso service ticket contro un servizio diverso viene respinto perché la chiave di sessione non coincide con quella attesa dal server.

Un secondo comando utile è `kadmin.local -q "getprinc host/lab.example.it"`: mostra la voce del database con i tipi di chiave e la data dell'ultimo cambio di password, che è l'informazione da confrontare con i log del servizio quando si sospetta un silver ticket. In un dominio reale lo stesso dato si legge dagli attributi dell'oggetto, non dal KDC.

| Verifica | Comando | Risultato atteso |
| --- | --- | --- |
| TGT presente | `klist` | una riga `krbtgt/LAB.EXAMPLE.IT` |
| cifratura | `klist -e` | `aes256-cts-hmac-sha1-96` |
| flag forwardable | `klist -f` | `F` maiuscola in `Flags` |
| service ticket | `kvno host/lab...` | `host/lab.example.it: kvno = 1` |
| login senza password | `kinit -k -t /tmp/lab.keytab host/lab.example.it` | nessuna richiesta di password |

## Sfasamento dell'orologio e preauthentication

Due prove rendono tangibili gli errori più frequenti. La prima: spostare l'orologio della macchina di dieci minuti e ripetere `kinit`. Il KDC rifiuta l'authenticator perché il timestamp esce dalla finestra di tolleranza, e il client riporta un errore di clock skew. Questo è esattamente l'errore che in produzione si vede quando un host non ha NTP.

```bash
kdestroy
sudo date -s "$(date -d '+10 minutes')"
kinit mario
# kinit: Clock skew too great while getting initial credentials
sudo date -s "$(date -d '-10 minutes')"   # ripristina prima di proseguire
```

La seconda: verificare che il preauthentication sia attivo e che senza di esso il KDC esponga materiale cifrato. In MIT krb5 un principal senza preauthentication restituisce un `AS-REP` cifrato con la chiave dell'utente anche a chi non ha dimostrato nulla, ed è la base dell'AS-REP Roasting. L'elenco dei tipi di preauthentication non accettati si controlla nella configurazione del KDC.

```bash
sudo kadmin.local -q "getprinc mario"
# Requires preauth: True
```

Il test da fare con `pytest` o con un piccolo script è quello del flusso completo usando GSSAPI, ed è utile come regressione per un servizio che deve accettare solo ticket validi. Un server di prova può essere un processo che chiama `gss_accept_sec_context` con il keytab e rifiuta ticket con `svc` diverso. Un test più semplice ma utile isola i messaggi: la libreria `minikerberos` di Python permette di inviare un `AS-REQ`, leggere il codice di errore e verificare che il KDC chieda preauthentication invece di rispondere con il materiale cifrato.

## Pulizia e criteri di uscita

Il laboratorio termina con la rimozione delle credenziali di test. Lasciare una cache con un TGT valido su una macchina condivisa o un keytab in `/tmp` dopo l'esercizio è il tipo di errore che in un'audit pesa più di un errore di configurazione.

```bash
kdestroy                      # elimina la cache
sudo kadmin.local -q "delprinc -force mario"
sudo kadmin.local -q "delprinc -force host/lab.example.it"
sudo kdb5_util destroy -r LAB.EXAMPLE.IT   # distrugge il database del lab
rm -f /tmp/lab.keytab
```

Il criterio di uscita è un elenco corto, tutto verificabile a mano: `klist -e` mostra solo AES, `kinit` senza password riesce con `-k`, `kvno` produce un ticket per il servizio atteso e lo sfasamento di dieci minuti viene rifiutato con un errore esplicito. Se anche solo uno di questi punti fallisce, la causa va cercata nella configurazione del KDC o nell'orologio, non nel client.

## Esercizi

1. Aggiungi un terzo principal di servizio con `aes128-cts-hmac-sha1-96` e verifica con `klist -e` che il ticket per quel servizio usi la cifratura che hai dichiarato.
2. Crea un principal utente con `-requires_preauth` e uno senza, poi confronta la risposta di `kinit` con e senza password.
3. Esporta la cache con `klist -c` e riapri la stessa cache con un `KRB5CCNAME` diverso: che cosa cambia per il client?
4. Ruota la chiave del servizio con `kadmin` (`cpw` o `ktadd -norandkey`) e verifica che i vecchi ticket nella cache non siano più accettati.
5. Aggiungi una riga all'ACL che combacia con il principal e controlla con `kadmin` che non abbia permessi su altri realm.

## Errori comuni

- **Realm in minuscolo**: i confronti sono case-sensitive e il principal non viene trovato, con un errore generico su autenticazione fallita.
- **Keytab leggibile da altri utenti**: chiunque può impersonare il servizio; `chmod 600` e la proprietà del processo sono obbligatori.
- **Dimenticare di ripristinare l'orologio dopo la prova**: il laboratorio successivo sembra rotto e la causa è invisibile.
- **Riavviare solo il client e non il servizio KDC** dopo aver modificato `kdc.conf`: la nuova politica di cifratura non entra in vigore.
- **Usare la password del principal di servizio come una password utente**: il keytab esiste per questo, la chiave a lungo termine non deve mai essere digitata.

## In sintesi

Un realm Kerberos si costruisce in tre pezzi: configurazione di client e KDC, database con principal e ACL, e gestione delle chiavi con keytab. La pratica mostra la differenza tra un TGT e un service ticket, fa vedere il tipo di cifratura in `klist -e` e dimostra con un errore reale perché la sincronizzazione dell'orologio fa parte del protocollo. Il laboratorio chiude con la distruzione del database, perché anche un realm di test è credenziale operativa.

## Fonti

- [MIT Kerberos - Install, configure, and run a KDC](https://web.mit.edu/kerberos/krb5-latest/doc/admin/install_kdc.html)
- [MIT Kerberos - kdc.conf](https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/kdc_conf.html)
- [MIT Kerberos - kinit](https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/kinit.html)
- [MIT Kerberos - klist](https://web.mit.edu/kerberos/krb5-latest/doc/user/user_commands/klist.html)
