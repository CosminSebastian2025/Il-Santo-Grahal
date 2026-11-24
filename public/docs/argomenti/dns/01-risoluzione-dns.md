Il DNS traduce i nomi che scrivi nel browser nei numeri che le macchine usano per parlarsi. È un sistema distribuito, gerarchico e con cache: nessun server conosce tutta la rete, ognuno conosce il proprio pezzo. In questa lezione segui il percorso completo di una query, dal tuo computer fino al server che custodisce l'indirizzo.

## Obiettivi

Al termine saprai:

- distinguere nome e indirizzo, e spiegare perché la risoluzione è a più livelli;
- descrivere il ruolo di root, server TLD, server autoritativi e resolver ricorsivo;
- differenziare risoluzione ricorsiva e iterativa;
- leggere una risposta di `dig` con i flag `qr`, `aa`, `rd`, `ra`.

## Perché esiste

Gli indirizzi IP sono comodi per le macchine e scomodi per le persone: `93.184.216.34` cambia con i provider, `www.example.com` resta. DNS è il database distribuito che collega i due, definito nelle RFC 1034 e 1035 e aggiornato da decine di RFC successive.

La parola chiave è **distribuito**: la zona `example.com` è gestita da chi possiede il dominio, non da un'autorità centrale. I server root sanno solo quali server gestiscono `com`, e i server `com` sanno solo chi gestisce `example.com`. Nessuno memorizza l'intero albero.

## Gli attori

| Attore | Cosa sa | Cosa fa |
| --- | --- | --- |
| Stub resolver | il resolver di sistema, definito in `/etc/resolv.conf` | riceve la richiesta dell'applicazione e la inoltra |
| Resolver ricorsivo | cache e collegamenti verso l'esterno | lavora fino a trovare la risposta e la consegna |
| Server root | 13 indirizzi logici (a.root-servers.net …) | indica i server del TLD |
| Server TLD | i delegati di `com`, `org`, `it` | indica i server autoritativi del dominio |
| Server autoritativo | la zona del dominio | risponde con i record reali, `AA = 1` |

Il resolver ricorsivo può essere il tuo ISP, quello del provider della VPN, un pubblico come `1.1.1.1` o `8.8.8.8`, oppure un `unbound`/`dnsmasq` sulla rete locale.

## Ricorsivo e iterativo

Le due parole indicano **chi fa la fatica**.

- **Query ricorsiva**: il client chiede "dammi la risposta finale" e il resolver si assume tutto il lavoro. È quella che fai tu con `dig example.com`.
- **Query iterativa**: il server interrogato non cerca oltre, se la risposta non è nella sua zona; indica il server da contattare dopo. Il resolver ricorsivo usa query iterative verso root, TLD e autoritativi.

Il flusso tipico per `www.example.com`:

1. il browser chiede al resolver di sistema;
2. il resolver controllo la cache: se ha il record con TTL valido, risponde subito;
3. altrimenti chiede a un server root: "chi gestisce `com`?";
4. chiede al server `com`: "chi gestisce `example.com`?";
5. chiede al server autoritativo di `example.com`: "quale è l'indirizzo di `www.example.com`?";
6. riceve la risposta, la copia in cache per il tempo del TTL e la consegna al client.

Puoi vedere questi passaggi in azione con `dig +trace`, che invece di delegare la ricorsione invia tutte le query iterative da solo.

```bash
dig +trace www.example.com
```

L'output inizia con i server root, elenca i delegati `com` e finisce con la risposta autoritativa. Ogni blocco riporta il server interrogato nella riga `;; Received N bytes from …`. È l'esercizio più utile per capire la gerarchia, perché non c'è alcuna cache che nasconde i passaggi.

## Leggere una risposta di `dig`

```bash
dig example.com A
```

```text
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 43118
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;example.com.			IN	A

;; ANSWER SECTION:
example.com.		86400	IN	A	93.184.215.14
```

- `status: NOERROR`: la query è andata a buon fine. `NXDOMAIN` significa che il nome non esiste, `SERVFAIL` che un server autoritativo non ha risposto o ha risposto male.
- `qr`: è una risposta, non una richiesta. `rd`: il client chiede la ricorsione. `ra`: il server la offre. `aa` compare quando la risposta viene dalla zona autoritativa.
- Il numero `86400` nell'ANSWER è il **TTL residuo**: quanto manca alla scadenza della copia in cache.
- Il punto finale (`example.com.`) indica il nome assoluto; `example.com` senza punto è un nome relativo e `dig` aggiunge il dominio di ricerca.

## Le basi: `/etc/hosts`, `search`, `ndots`

Prima di qualsiasi query di rete, il resolver di sistema consulta `/etc/hosts` (su Windows `C:\Windows\System32\drivers\etc\hosts`). Una riga come:

```text
127.0.0.1   localhost
192.168.1.20 api.local
```

risolve `api.local` senza mai contattare un server DNS. Attenzione: `getent hosts api.local` lo vede, ma `dig api.local` no — `dig` bypassa `/etc/hosts`, quindi i due strumenti possono dare risposte diverse.

Il file `/etc/resolv.conf` decide chi interrogare:

```text
nameserver 192.168.1.1
search lan.example.com
options ndots:1
```

`nameserver` è l'indirizzo del resolver (massimo tre di solito), `search` elenca i suffissi provati per i nomi non assoluti, `ndots` stabilisce quanti punti deve avere un nome per essere provato così com'è prima dei suffissi. Sistemi con `systemd-resolved` o NetworkManager possono sovrascrivere il file: modificalo dalla configurazione del servizio, non a mano.

## Errori comuni

- **Confondere `dig` con il resolver dell'applicazione.** `dig` parla direttamente con il server DNS; `curl`, `ping` e il browser usano `getaddrinfo`, che consulta prima `/etc/hosts` e `nsswitch.conf`. Se il browser va e `dig` no, il problema è nella cache del browser o in `/etc/hosts`.
- **Prendere una risposta in cache per la verità.** Un `NOERROR` con TTL quasi a zero può essere la copia di un record appena modificato. Ripeti la query addosso all'autoritativo per confrontare.
- **Ignorare il punto finale.** `dig example.com` e `dig example.com.` possono dare risultati diversi se `search` contiene suffissi locali.
- **Pensare che `dig` provi tutti i record.** Senza tipo chiede `A`; `AAAA`, `MX`, `TXT` vanno chiesti esplicitamente.

## In sintesi

- DNS è un albero di deleghe: root → TLD → dominio → eventuali sottodomini.
- Il resolver ricorsivo fa il lavoro con query iterative; tu chiedi ricorsione.
- I server autoritativi rispondono con `AA`; le cache rispondono con TTL ridotto.
- `dig +trace` mostra la catena reale, `dig` mostra la risposta che arriva al tuo client.

## Fonti

- RFC 1034 — Domain names: concepts and facilities: https://www.rfc-editor.org/rfc/rfc1034.html
- RFC 1035 — Domain names: implementation and specification: https://www.rfc-editor.org/rfc/rfc1035.html
