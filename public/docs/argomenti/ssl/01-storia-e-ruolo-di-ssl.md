SSL 2.0 e SSL 3.0 sono protocolli deprecati e insicuri: non vanno assolutamente usati. Oggi, quando qualcuno dice "SSL", intende quasi sempre **TLS**, il successore progettato per sostituirlo. Questa lezione ricostruisce la storia, spiega cosa è rimasto nel linguaggio comune e ti dice dove studiare la parte moderna.

## Obiettivi

- Collocare SSL 2.0 e 3.0 nella storia e spiegare perché sono insicuri.
- Distinguere SSL da TLS e riconoscere i nomi storici rimasti (porta 443, `https`, librerie).
- Spiegare cosa offriva SSL e come lo offre oggi TLS.
- Collegarsi a TLS per i dettagli moderni senza duplicare il contenuto.

## Come è organizzato il percorso

Prima di entrare nel merito, chiarisci un punto che genera confusione: "SSL" è rimasto come termine commerciale e storico, mentre il protocollo effettivamente in uso si chiama TLS. Nel resto del percorso troverai:

- certificati e catena, che valgono identici per SSL e TLS;
- errori di configurazione e diagnosi, utili per qualsiasi servizio HTTPS;
- laboratorio con `openssl`, che parla TLS.

Per handshake, versioni e cipher suite moderne, la lezione di riferimento è **TLS 1.3 (RFC 8446)** e il relativo percorso TLS: qui non la riscrivo.

## Breve storia

SSL fu sviluppato da Netscape a metà degli anni '90.

| Versione | Anno | Stato |
| --- | --- | --- |
| SSL 1.0 | mai pubblicata | — |
| SSL 2.0 | 1995 | deprecata, vietata (RFC 6176) |
| SSL 3.0 | 1996 | deprecata, vietata (RFC 7568) |
| TLS 1.0 | 1999 | deprecata (RFC 8996) |
| TLS 1.1 | 2006 | deprecata (RFC 8996) |
| TLS 1.2 | 2008 | in uso, RFC 5246 |
| TLS 1.3 | 2018 | attuale, RFC 8446 |

TLS 1.0 è in sostanza SSL 3.0 con correzioni: per questo SSL 3.0 si trova ancora nel codice come base delle prime versioni TLS. Il nome TLS esiste per due motivi: cambiare nome dopo che SSL era "di Netscape" e marcare una rottura netta con il passato.

## Perché SSL 2.0 e 3.0 sono insicuri

- **SSL 2.0** non ha protezione contro il downgrade del protocollo, usa MAC deboli e non ha meccanismi per gestire in modo coerente gli errori. Il browser del tempo non aveva alternative, oggi un server che accetta SSL 2.0 è vulnerabile.
- **SSL 3.0** è stato compromesso da POODLE (2014): un attaccante in grado di manipolare il traffico può decifrare dati attraverso ripetute richieste e analisi del padding. La mitigazione completa è non accettare SSL 3.0.
- Le versioni SSL non supportano correttamente i limiti e le verifiche che TLS ha ereditato: non c'è modo di "configurarle bene".

Per questo le RFC 6176 e 7568 vietano l'uso di SSL 2.0 e 3.0 nei protocolli internet. TLS 1.0 e 1.1 sono deprecate dalla RFC 8996.

## Cosa è rimasto

Il nome sopravvive in tre campi:

1. **nel linguaggio**: "certificato SSL", "SSL sulla porta 443", "passa a SSL". In tutti questi casi si intende HTTPS con TLS.
2. **nei prodotti**: `ssl` in OpenSSL è il nome del comando e della libreria che implementano TLS; `libssl` è la libreria TLS di riferimento; i servizi e i parametri `.ssl` restano per compatibilità.
3. **nei file**: estensioni `.crt`, `.pem`, `.key` non dicono nulla sulla versione del protocollo.

Nota che TLS 1.3 ha rimosso altro dal modello SSL: niente handshake con cifrari a chiave statica RSA (solo schemi con segreto efimero come ECDHE), niente compressione, niente renegotiation. La cifratura moderna è AEAD, non "cifratura + MAC separati".

## Cosa offriva SSL e offre TLS oggi

Indipendentemente dal nome, lo scopo è lo stesso:

- **riservatezza**: nessuno in mezzo legge i dati;
- **integrità**: nessuno in mezzo modifica i dati senza che i due estremi se ne accorgano;
- **autenticazione del server**: il client sa di parlare con chi possiede un certificato valido per quel nome.

L'autenticazione del client è opzionale (mutual TLS). Oggi si aggiungono la protezione contro il downgrade, la separazione delle chiavi per dominio (SNI), il forward secrecy obbligatorio in TLS 1.3 e cifrari autenticati.

## Dove si vede in pratica

```bash
openssl version
```

```text
OpenSSL 3.2.1 30 Jan 2024 (Library: OpenSSL 3.2.1 30 Jan 2024)
```

Con `openssl s_client` vedi la versione negoziata:

```bash
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | grep -E "Protocol|Cipher"
```

Un output `Protocol: TLSv1.3` conferma che il server parla TLS. Se vedi `TLSv1.2`, ancora accettabile; se vedi `SSLv3` su un server esposto, hai trovato un problema serio.

Puoi vedere quali versioni il tuo OpenSSL supporta e ottenere un errore negoziando una versione vecchia:

```bash
openssl ciphers -v 'DEFAULT' | head -5
echo | openssl s_client -connect example.com:443 -tls1_1 2>&1 | grep -iE "error|alert|no protocols"
```

Il secondo comando, se il server è moderno, fallisce con un alert o un handshake failure: è il comportamento desiderato.

## Sicurezza

- **Non abilitare mai SSL 2.0/3.0** e non abilitare TLS 1.0/1.1 su servizi nuovi. La configurazione sicura parte da TLS 1.2 in su.
- **Non usare "SSL" come sinonimo di "sicuro"**: un servizio con SSL 3.0 accettato ha una crittografia rotta, anche se il certificato è valido.
- **Non implementare TLS da zero**: usa OpenSSL, libsodium o la libreria di piattaforma, più aggiornata e analizzata.
- **Aggiorna le librerie**: le vulnerabilità storiche (Heartbleed in OpenSSL, POODLE, BEAST) sono tutte falle di implementazione o di protocollo vecchio.

## Errori comuni

- **Chiedersi "SSL o TLS?" come se fossero alternative**: il protocollo da usare è TLS; "SSL" è il nome storico.
- **Configurare "SSLv3" nel server per compatibilità**: crea una vulnerabilità attiva. Le versioni sono state rimosse proprio per questo.
- **Confondere certificato e protocollo**: il certificato dice "chi" e "per quale nome"; il protocollo dice "come" si cifra. Un certificato moderno non salva un protocollo vecchio.
- **Ritardare l'aggiornamento di client vecchi**: la soluzione non è tenere SSL 3.0, è aggiornare il client o isolarlo dietro un proxy che termina TLS moderno.

## In sintesi

- SSL 2.0 e 3.0 sono deprecati e insicuri; RFC 6176 e 7568 ne vietano l'uso.
- Oggi il protocollo è TLS, in versione 1.3 (RFC 8446); "SSL" resta nel linguaggio e nel nome di librerie e comandi.
- Gli obiettivi (riservatezza, integrità, autenticazione) sono gli stessi; TLS li raggiunge con handshake, cifrari e regole diverse.
- Per la parte moderna, studia il percorso TLS: qui trovi la storia, i certificati e la diagnosi.

## Fonti

- RFC 6101 — The Secure Sockets Layer (SSL) Protocol Version 3.0: https://www.rfc-editor.org/rfc/rfc6101.html
- RFC 7568 — Deprecating Secure Sockets Layer Version 3.0: https://www.rfc-editor.org/rfc/rfc7568.html
