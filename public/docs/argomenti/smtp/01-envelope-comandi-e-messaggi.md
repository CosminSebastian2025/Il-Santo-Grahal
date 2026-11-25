SMTP è il protocollo con cui una macchina consegna posta a un'altra: un dialogo testuale su TCP, porta 25 per il traffico tra server, 587 per la sottomissione autenticata, 465 per TLS implicito. La cosa più utile da capire subito è che in un messaggio SMTP esistono due indirizzi diversi, quello della busta e quello dell'header, e il server decide la consegna guardando solo il primo. In questa lezione segui un messaggio dall'header `From` fino alla busta che lo tiene nelle code di posta.

## Obiettivi

- Distinguere envelope e header di un messaggio e capire chi legge ciascuno.
- Riconoscere i comandi del dialogo SMTP e le risposte numerate.
- Leggere un messaggio MIME con header di trasporto e corpo.
- Capire il ruolo di HELO, EHLO e delle estensioni annunciate.
- Sapere perché la risposta 250 dopo `DATA` non significa ancora consegna.

## Envelope contro header

L'header `From:` è una riga del messaggio scritta dal client di posta e, nel caso più comune, indica il mittente che l'utente vede. La busta (`MAIL FROM` e `RCPT TO`) è invece ciò che il protocollo mette in scena durante il dialogo: il server la usa per decidere dove consegnare, che codice di ritorno inviare e quali controlli applicare. I due livelli possono divergere senza errori.

```text
Header del messaggio                    Busta SMTP
---------------------------             -----------------------------
From: Mario Rossi <mario@a.example>     MAIL FROM:<mario@a.example>
To: assistenza@b.example                RCPT TO:<assistenza@b.example>
Subject: Prova
```

| Livello | Chi lo scrive | Chi lo legge | Effetto |
| --- | --- | --- | --- |
| `MAIL FROM` | client mittente | MX del destinatario | ritorni d'errore (DSN) |
| `RCPT TO` | client mittente | server di destinazione | destinatari reali |
| `From:` | autore | client di posta | visualizzazione |
| `Return-Path:` | server finale | server finale | traccia della busta |
| `Received:` | ogni server | analisi e filtri | percorso e ritardi |

Il server di destinazione aggiunge `Return-Path` e `Received` quando riceve il messaggio; sono header di trasporto che il client non può impostare. Un `From` falsificato è quindi facile, mentre la busta è ciò che il dominio ricevente verifica oggi con SPF, DKIM e DMARC.

## Il dialogo e i comandi

Il client si presenta con `EHLO`, il server risponde con la lista delle estensioni supportate, poi il client dichiara mittente e destinatari e infine il contenuto. Ogni riga del server inizia con un codice a tre cifre: `2xx` successo, `3xx` attesa di altro input, `4xx` errore temporaneo, `5xx` errore permanente.

```text
S: 220 mx.b.example ESMTP
C: EHLO posta.a.example
S: 250-mx.b.example
S: 250-8BITMIME
S: 250 STARTTLS
C: MAIL FROM:<mario@a.example>
S: 250 2.1.0 Ok
C: RCPT TO:<assistenza@b.example>
S: 250 2.1.5 Ok
C: DATA
S: 354 End data with <CR><LF>.<CR><LF>
C: From: Mario Rossi <mario@a.example>
C: To: assistenza@b.example
C: Subject: Prova
C:
C: Ciao, questo è il corpo.
C: .
S: 250 2.0.0 Ok: queued as 4Xy9
C: QUIT
S: 221 2.0.0 Bye
```

`DATA` termina con una riga composta da un solo punto, e ogni riga del messaggio che inizia con un punto viene raddoppiata: è il dot-stuffing, l'unica trasformazione che il protocollo applica al contenuto. Il codice `250 queued as` conferma che il messaggio è stato accettato e messo in coda, non che sia arrivato: da lì in poi l'esito è asincrono e arriva con un rimbalzo. Un `4xx` invita a riprovare più tardi, un `5xx` chiude la strada per quel destinatario.

```bash
# dialogo minimo a mano: utile per capire quali risposte arrivano prima di DATA
openssl s_client -connect mx.example.org:25 -quiet
EHLO client.example.org
MAIL FROM:<mario@a.example>
RCPT TO:<utente-inesistente@b.example>
QUIT
```

## Messaggio MIME e header di trasporto

Un messaggio moderno è MIME: le parti sono delimitate da un boundary scelto dal client, le intestazioni dei campi non ASCII sono codificate con la sintassi `=?UTF-8?B?...?=`, e l'header `Message-ID` assegna un'identità usata per deduplicare.

```text
MIME-Version: 1.0
Date: Mon, 09 Nov 2026 10:12:00 +0100
From: Mario Rossi <mario@a.example>
To: assistenza@b.example
Subject: =?UTF-8?Q?Report_mensile?=
Message-ID: <20261109101200.1@a.example>
Content-Type: multipart/alternative; boundary="bnd42"

--bnd42
Content-Type: text/plain; charset=utf-8

Versione testuale.
--bnd42
Content-Type: text/html; charset=utf-8

<p>Versione HTML.</p>
--bnd42--
```

Il RFC 5322 definisce la sintassi degli header, il RFC 2045 e seguenti quella MIME. Un client che deve riconoscere lo spam, applicare filtri o restituire errori guarda soprattutto gli header e la busta: il corpo è solo una delle parti della prova.

```bash
# invio completo da terminale: -f è la busta, gli header restano nel file
swaks --server mx.example.org:587 --tls --auth PLAIN \
  --auth-user mario@a.example --auth-password "$PASS" \
  --from mario@a.example --to assistenza@b.example --header 'Subject: prova'
```

L'opzione `--from` di `swaks` imposta `MAIL FROM` insieme all'header, ma i client veri possono divergere: un test che modifica solo `--from` diventa uno spam test utile per misurare SPF e DMARC. Un messaggio rifiutato per frode di mittente riceve `550` e il dialogo lo dice, senza differire la decisione alla coda.

## Errori comuni

- **Credere che `From:` decida la consegna**: il server usa `RCPT TO` e `MAIL FROM`, non l'header visibile.
- **Assumere che un `250` dopo `DATA` sia una consegna riuscita**: il messaggio è solo in coda, l'esito arriva come DSN.
- **Dimenticare il punto finale o il dot-stuffing**: il server resta in attesa del terminatore o tronca il corpo.
- **Usare la porta 25 dal laptop dell'utente**: quasi tutti i provider la bloccano; la sottomissione passa dalla 587 con STARTTLS.
- **Scrivere header UTF-8 senza codifica**: le righe del messaggio non sono UTF-8 per contratto e i client le mostrano corrotte.

## In sintesi

SMTP trasporta messaggi usando due indirizzi distinti: la busta per il routing e gli header per le persone. Il dialogo è lineare, HELO o EHLO, mittente, destinatari, `DATA`, e ogni passo ha un codice numerico con un significato preciso. Il messaggio è MIME, con boundary e header di trasporto aggiunti strada facendo. Il `250` finale parla della coda, non della casella, e il riscontro arriva più tardi.

## Fonti

- [RFC 5321 — Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321.html)
- [RFC 5322 — Internet Message Format](https://www.rfc-editor.org/rfc/rfc5322.html)
- [RFC 2045 — MIME Part One: Format of Internet Message Bodies](https://www.rfc-editor.org/rfc/rfc2045.html)
- [Postfix — Documentazione ufficiale](https://www.postfix.org/documentation.html)
- [Postfix — Basic Configuration Readme](https://www.postfix.org/BASIC_CONFIGURATION_README.html)
