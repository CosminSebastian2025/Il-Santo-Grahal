Un server SMTP aperto è una risorsa da chiudere in fretta: le porte 25 esposte vengono scansionate e usate per inviare spam in poche ore. La configurazione moderna di un mail server ruota quindi attorno a tre elementi: cifratura del canale con STARTTLS o TLS implicito, autenticazione del client prima della sottomissione, e relay limitato a chi ne ha diritto. In questa lezione li tratti insieme, con le direttive che Postfix usa davvero.

## Obiettivi

- Distinguere STARTTLS, TLS implicito sulla 465 e TLS tra server (MTA-STS).
- Usare `AUTH PLAIN` e `LOGIN` sapendo dove finiscono le credenziali.
- Configurare un relay Postfix che accetta solo client autenticati o fidati.
- Separare il ruolo di submission da quello di ricezione sulla porta 25.
- Diagnosticare un rifiuto di relay leggendo il codice di risposta e il log.

## STARTTLS e implicito

Con STARTTLS il canale inizia in chiaro, il client invia `STARTTLS`, il server risponde `220`, e da quel punto il dialogo riparte dentro TLS. Il comando è annunciato in `EHLO`, quindi un server senza STARTTLS si riconosce subito dalla lista delle estensioni. Sulla 465 il TLS è invece negoziato prima che il client parli SMTP: si chiama SMTPS o TLS implicito ed è il caso tipico dei client di posta.

| Modalità | Porta tipica | Quando il TLS inizia | Note |
| --- | --- | --- | --- |
| STARTTLS | 25, 587 | dopo `EHLO` e `STARTTLS` | RFC 3207, upgrade in banda |
| TLS implicito | 465 | prima del saluto `220` | RFC 8314 |
| MTA-STS | 25 | politica pubblicata in DNS | RFC 8461 |
| DANE | 25 | associazione TLSA in DNS | RFC 7672 |

RFC 3207 definisce STARTTLS e RFC 8314 raccomanda TLS implicito per la sottomissione dei client, considerandolo la configurazione attesa. In Postfix le direttive di riferimento sono `smtpd_tls_security_level` e `smtp_tls_security_level`: `may` cifra quando possibile, `encrypt` obbliga il client a cifrare, `verify` aggiunge la verifica del certificato dell'altro lato. Per un canale che non deve mai partire in chiaro si usa `smtpd_tls_wrappermode = yes` sulla 465, dove il server parla TLS prima del saluto SMTP.

## Autenticazione cliente

RFC 4954 definisce `AUTH` come estensione di SMTP: il server annuncia i meccanismi, il client ne sceglie uno e invia le credenziali. `PLAIN` invia `\0utente\0password` in base64, `LOGIN` le invia in due passi; in entrambi i casi la protezione reale viene dal TLS sottostante, e un `AUTH` senza cifratura equivale a pubblicare la password.

```bash
# Solo su una connessione cifrata: AUTH è in base64, non cifrato da sé
openssl s_client -starttls smtp -connect mx.example.org:587 -quiet
# dentro la sessione: il server saluta, poi si scrive a mano
EHLO client.example.org
STARTTLS
# ...negoziazione TLS...
EHLO client.example.org
AUTH PLAIN AG1hcmlvAHNlZ3JldG8=
QUIT
```

Su una connessione già cifrata Postfix attende `EHLO`, `STARTTLS`, il nuovo `EHLO` e solo allora `AUTH PLAIN`.

Postfix non implementa SASL da solo: si appoggia a Cyrus SASL o a Dovecot, e accetta solo i meccanismi annunciati in `smtpd_sasl_mechanism_filter`. Dopo `AUTH`, il server può annunciare `AUTH=...` nella risposta a `EHLO` per indicare che il client è ora autenticato; il log registra l'utente, e la policy di relay può usarlo come credenziale.

## Relay e ruoli

Accettare posta per un dominio diverso dal proprio è il relay: senza regole, chiunque potrebbe usare il server come trampolino. Postfix applica `relay_domains`, le classi di mittenti e destinatari di `main.cf`, e `smtpd_recipient_restrictions` con `permit_sasl_authenticated`, `permit_mynetworks` e `reject_unauth_destination`.

```text
# /etc/postfix/main.cf — estratto di una configurazione di sottomissione
smtpd_tls_security_level = may
smtpd_tls_auth_only = yes          # AUTH solo dopo STARTTLS
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot          # SASL delegato a Dovecot
smtpd_tls_cert_file = /etc/ssl/mail/fullchain.pem
smtpd_tls_key_file = /etc/ssl/mail/privkey.pem
mynetworks = 127.0.0.0/8 [::1]/128 # only localhost: niente fiducia larga
```

Con `smtpd_tls_auth_only = yes` il server non accetta `AUTH` prima di TLS, e le credenziali non viaggiano mai in chiaro. Per una porta 465 si usa il servizio `smtps` in `master.cf`, dove TLS è nativo: `465 inet n - y - - smtpd -o smtpd_tls_wrappermode=yes`. Infine, annunciare TLS e autenticazione in DNS con MTA-STS e DANE evita che un attaccante sulla rete faccia scendere il client a una connessione in chiaro.

## Errori comuni

- **Chiedere `AUTH` sulla 25 senza TLS**: le credenziali finiscono in chiaro nel log di un eventuale sniffer.
- **Aprire il relay a una rete intera**: `mynetworks` ampio trasforma il server in un open relay appena qualcuno entra nella rete.
- **Confondere `may` con `encrypt`**: `may` cifra quando riesce, ma un client non cifrato viene comunque servito.
- **Dire che il TLS implicito è il vecchio `smtps` deprecato**: RFC 8314 lo raccomanda come modalità per i client.
- **Diagnosticare un relay rifiutato guardando solo il client**: il codice `554 5.7.1 Relay access denied` e `/var/log/mail.log` dicono quale regola ha scartato il messaggio.

## In sintesi

TLS e autenticazione non sono optional per SMTP moderno: senza, è solo posta in chiaro con un relay aperto. STARTTLS aggiorna una sessione già iniziata, il TLS implicito sulla 465 protegge la sottomissione dei client. `AUTH` trasporta credenziali che valgono solo dentro TLS. Il relay si limita con autenticazione, reti fidate esplicite e domicili dichiarati, e MTA-STS o DANE rendono la cifratura obbligatoria anche tra server.

## Fonti

- [RFC 3207 — SMTP Service Extension for Secure SMTP over TLS](https://www.rfc-editor.org/rfc/rfc3207.html)
- [RFC 4954 — SMTP Service Extension for Authentication](https://www.rfc-editor.org/rfc/rfc4954.html)
- [RFC 6409 — Message Submission for Mail](https://www.rfc-editor.org/rfc/rfc6409.html)
- [Postfix — TLS Readme](https://www.postfix.org/TLS_README.html)
- [Postfix — SASL Readme](https://www.postfix.org/SASL_README.html)
