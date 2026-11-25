In questo laboratorio metti in sicurezza un server Postfix pensato per la sola sottomissione e lo provi dall'esterno, alternando `openssl s_client`, `swaks` e i log. L'obiettivo non è inviare una mail ma verificare che il server rifiuti quello che deve rifiutare: AUTH in chiaro, relay verso terzi e sottomissione anonima. È il test che un revisore farebbe prima di dichiarare il servizio pronto.

## Obiettivi

- Scrivere una configurazione Postfix di sottomissione con AUTH solo in TLS.
- Verificare STARTTLS e il certificato presentato con `openssl s_client`.
- Provare AUTH, invio legittimo e tentativo di relay con `swaks`.
- Leggere `mail.log` e tradurre un rifiuto in una regola precisa.
- Convincere un client a usare la 465 con TLS implicito.

## Configurazione di partenza

La macchina del laboratorio ha Postfix installato e Dovecot presente solo per SASL. La configurazione parte da `postconf -n`, che mostra solo i parametri non predefiniti: se qualcosa non compare, vale il default.

| Parametro | Valore nel lab | Effetto |
| --- | --- | --- |
| `smtpd_tls_security_level` | `may` | TLS opportunistica |
| `smtpd_tls_auth_only` | `yes` | niente AUTH in chiaro |
| `smtpd_sasl_type` | `dovecot` | SASL tramite socket Dovecot |
| `mynetworks` | `127.0.0.0/8 [::1]/128` | nessuna rete fidata larga |
| `home_mailbox` | `Maildir/` | consegna locale in Maildir |
| `smtpd_recipient_restrictions` | `permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination` | relay solo a chi è autorizzato |

```bash
postconf -n | sort                      # confronta con la tabella
postfix check                            # verifica sintassi e permessi
systemctl reload postfix
ss -ltnp | grep -E ':(25|587|465)\b'    # chi ascolta davvero
```

## Core: handshake e AUTH

Il primo test è la cifratura. `openssl s_client` mostra la catena e il risultato della verifica; verifica con l'hostname che i client useranno, non con l'IP.

```bash
openssl s_client -starttls smtp -connect mail.lab.example:587 \
  -servername mail.lab.example -verify_return_error </dev/null 2>&1 \
  | grep -E 'subject=|Verify return code|Protocol|Cipher'
```

Poi l'autenticazione e l'invio con `swaks`, che stampa l'intero dialogo. `--auth PLAIN` richiede che il server annunci quel meccanismo, e con `--tls-optional` il client accetta anche un canale chiaro: è il test da fare per vedere il rifiuto.

```bash
swaks --server mail.lab.example:587 --tls \
  --auth PLAIN --auth-user mario@lab.example --auth-password 'segreto-demo' \
  --from mario@lab.example --to assistenza@lab.example --header 'Subject: prova lab' \
  --body 'messaggio di test'

# il caso negativo: senza TLS il server deve rifiutare AUTH
swaks --server mail.lab.example:587 --tls --auth-optional \
  --from mario@lab.example --to assistenza@lab.example 2>&1 | grep -i 'auth\|530\|538'
```

Il test di relay usa l'utente autenticato per un destinatario esterno e lo stesso comando da una macchina fuori da `mynetworks`: il primo deve andare in coda, il secondo deve ricevere `554 5.7.1 Relay access denied`. Infine `s_client` diretto sulla 465 serve per il client che non parla STARTTLS: qui il saluto arriva solo dopo il TLS.

```bash
openssl s_client -connect mail.lab.example:465 -quiet </dev/null 2>&1 | head -3
grep -E 'smtpd|sasl|SASL|relay|Relay' /var/log/mail.log | tail -20
```

## Esercizi

1. Con `postconf -n`, trova i parametri che differiscono dal default e spiega quale di essi ha effetto sul relay.
2. Dimostra che `smtpd_tls_auth_only = no` consente `AUTH` in chiaro, poi ripristina `yes` e documenta il messaggio di errore.
3. Calcola il rischio di una `mynetworks` con `10.0.0.0/8` in un ufficio con Wi-Fi guest condiviso.
4. Abilita MTA-STS per `lab.example` con una policy in `_mta-sts` e verifica che il client la scarichi.
5. Collega un client che usa solo la 465 e verifica nel log che il TLS sia stato negoziato prima di `EHLO`.
6. Costruisci un test riproducibile che fallisca se il relay anonimo risulta aperto, e collega il suo esito alla supervisione.

<details>
<summary>Soluzione</summary>

1. `postconf -n` è già la lista dei non default; il parametro decisivo per il relay è `smtpd_recipient_restrictions`, perché `reject_unauth_destination` scarta chi non è autenticato né in `mynetworks`.

2. Con `no`, `swaks --tls --auth-optional` completa il dialogo `AUTH` prima di `MAIL FROM`; con `yes` il server risponde `530 5.7.0 Must issue a STARTTLS command first` e il dialogo richiede prima STARTTLS.

3. Chiunque nel Wi-Fi guest entra in `10.0.0.0/8` e ottiene `permit_mynetworks`: il server diventa un relay aperto verso internet per tutta la rete ospite. Il rimedio è `mynetworks` minimale e `smtpd_sasl_auth_enable` con account separati.

4. La policy si pubblica su `https://mta-sts.lab.example/.well-known/mta-sts.txt` con `version: STSv1`, `mode: testing` o `enforce`, `mx: mail.lab.example` e `max_age`; il record DNS TXT su `_mta-sts` punta alla policy.

5. Nel log la riga di connessione mostra `TLS started` o `TLS auth only` senza passaggio SMTP prima: la connessione arriva già cifrata e `smtpd_tls_wrappermode=yes` lo conferma.

6. Uno script con `swaks` senza credenziali verso un dominio esterno deve ricevere `554`; l'esito va letto con `grep` e trasformato in codice di uscita 1, così un check di supervisione può lanciarlo ogni ora.

</details>

## Errori comuni

- **Testare con l'IP invece dell'hostname**: il certificato è valido per il nome, e `s_client` senza `-servername` presenta al client una catena non affine al nome.
- **Interpretare `250` di `swaks` come consegna**: l'invio è in coda; solo `Maildir/new` o il `Received` sul server finale provano la consegna.
- **Lasciare `mynetworks` ampio per comodità «tanto è la LAN»**: ogni host raggiungibile è un mittente privilegiato.
- **Confondere `smtpd_tls_security_level` con `smtp_tls_security_level`**: il primo riguarda chi si connette, il secondo il server che invia verso altri.
- **Non verificare la porta 465**: un servizio `smtps` non annunciato in `master.cf` lascia i client senza fallback.

## In sintesi

Il laboratorio produce una configurazione verificabile: TLS opportunistica sulla 587, AUTH solo dentro TLS, relay chiuso a chi non è autenticato. `s_client` mostra certificato e cifrari, `swaks` rivela il dialogo reale e i rifiuti attesi, `mail.log` li spiega. La 465 va provata a parte perché negozia il TLS prima di SMTP. Il test di relay anonimo è quello che vale la pena automatizzare.

## Fonti

- [RFC 3207 — SMTP Service Extension for Secure SMTP over TLS](https://www.rfc-editor.org/rfc/rfc3207.html)
- [RFC 6409 — Message Submission for Mail](https://www.rfc-editor.org/rfc/rfc6409.html)
- [Postfix — SASL Readme](https://www.postfix.org/SASL_README.html)
- [Postfix — TLS Readme](https://www.postfix.org/TLS_README.html)
- [Postfix — Standard Configuration Readme](https://www.postfix.org/STANDARD_CONFIGURATION_README.html)
