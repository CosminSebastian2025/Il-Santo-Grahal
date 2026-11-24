Un record DNS è una riga di informazione dentro una zona: un nome, un tipo, un valore e un TTL. Capire i tipi ti permette di leggere la configurazione di un dominio come se fosse un file di testo. Qui vedi quali record servono per un sito, per la posta, per la verifica di proprietà e per autorizzare le autorità di certificazione.

## Obiettivi

- Riconoscere i tipi `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `CAA` e sapere quando usarli.
- Capire cosa sono una zona e una delega.
- Spiegare come il TTL governa cache e propagazione.
- Interrogare i record con `dig` e leggerne i campi.

## Zona, deleghe e file di zona

Una **zona** è la porzione di dominio per cui un server è autoritativo. `example.com` è una zona; `blog.example.com` può essere delegata a un altro server con record `NS`, diventando zona a parte. Il file di zona ha direttive e record:

```text
$ORIGIN example.com.
$TTL 3600

@       IN  SOA  ns1.example.com. admin.example.com. (
                     2026110701 ; serial
                     7200       ; refresh
                     3600       ; retry
                     1209600    ; expire
                     300 )      ; minimum
        IN  NS   ns1.example.com.
        IN  NS   ns2.example.com.
@       IN  A    93.184.215.14
www     IN  A    93.184.215.14
```

`@` è il nome della zona stessa, `$TTL` il valore predefinito. Il dominio di esempio appartiene all'IANA: puoi usarlo in documentazione e test senza rischiare di colpire un sito reale.

## I tipi che incontrerai sempre

| Tipo | Funzione | Esempio |
| --- | --- | --- |
| `A` | nome → IPv4 | `www 300 IN A 93.184.215.14` |
| `AAAA` | nome → IPv6 | `www 300 IN AAAA 2606:2800:21f:cb07::1` |
| `CNAME` | alias verso un altro nome | `blog IN CNAME example.com.` |
| `MX` | server di posta, con priorità | `@ IN MX 10 mail.example.com.` |
| `TXT` | testo libero, usato per verifiche e policy | `@ IN TXT "v=spf1 -all"` |
| `NS` | delegati della zona | `@ IN NS ns1.example.com.` |
| `SOA` | metadati della zona | serial, refresh, retry, expire, minimum |
| `CAA` | quali CA possono emettere certificati | `@ IN CAA 0 issue "letsencrypt.org"` |

### A e AAAA

Sono gli indirizzi finali. Un nome può avere più `A` (round-robin tra più server) e i client provano in ordine, con ritorno al secondo se il primo non risponde. IPv6 oggi non è un extra: se il dominio non ha `AAAA`, un client IPv6-only deve ricorrere a NAT64 o proxy.

### CNAME e la regola d'oro

Un `CNAME` dice "usa i record di quel nome". Serve per puntare `www` a un CDN o a un servizio gestito e cambiare destinazione senza toccare i client. Due vincoli contano:

1. **Un `CNAME` non può convivere con altri record sullo stesso nome.** Quindi non puoi mettere `CNAME` sull'apice della zona (`@`) dove vivono `NS`, `SOA` e `MX`, a meno di usare meccanismi del provider (spesso chiamati "CNAME flattening" o "ALIAS").
2. **Un alias è risolto dal client**, quindi il client deve emettere una seconda query. Nel resolver ricorsivo costa poco, nella zona autoritativa non è un "redirect" trasparente.

### MX e priorità

```bash
dig +short MX example.com
```

```text
0 .
```

Un'organizzazione senza posta pubblica risponde con il **null MX** (`0 .`), che dichiara "questo dominio non accetta email". Più record `MX` hanno priorità numeriche: valori bassi sono preferiti, quelli alti fanno da riserva.

### TXT: verifiche e policy

I record `TXT` sono stringhe libere con limiti di 255 caratteri per segmento (un valore lungo viene spezzato). Li usano:

- la verifica di proprietà per servizi e CA;
- SPF per autorizzare server di posta (`v=spf1 …`);
- DKIM per le chiavi di firma dei messaggi;
- DMARC per la policy antiphishing (`v=DMARC1; p=reject`).

```bash
dig +short TXT example.com
```

```text
"v=spf1 -all"
```

### SOA: i parametri della zona

Il `SOA` contiene il `serial`, che i server secondari confrontano per capire se la zona è cambiata. `refresh` è ogni quanto il secondario controlla, `retry` l'attesa dopo un errore, `expire` dopo quanto rinuncia se il primario non risponde, `minimum` il TTL minimo per le risposte negative. Se aggiorni una zona e non incrementi il serial, i secondari non se ne accorgono.

```bash
dig +short SOA example.com
```

```text
ns.icann.org. noc.dns.icann.org. 2025116027 7200 3600 1209600 3600
```

### CAA: chi può emettere certificati

```text
@ IN CAA 0 issue "letsencrypt.org"
@ IN CAA 0 iodef "mailto:security@example.com"
```

Una CA conforme controlla il `CAA` prima di emettere. Se il record esiste e non elenca la CA, la richiesta deve essere rifiutata. È una difesa contro certificati emessi per errore su un dominio che non gestisci più.

## TTL: il parametro che decide la propagazione

Il TTL è in secondi e dice ai resolver "puoi tenere questa copia per N secondi". Non esiste un'operazione "propaga ora": quando cambi un record, la vecchia copia resta valida nelle cache fino alla scadenza del **suo** TTL.

Implicazioni pratiche:

- TTL bassi (60-300) rendono rapidi i cambi, ma aumentano query e latenza.
- TTL alti (86400) riducono il carico, ma un cambio arriva dopo un giorno.
- Se stai pianificando un cambio critico, **abbassa il TTL prima** (almeno per una durata pari al vecchio TTL) e rialzalo dopo il cambio.
- Alcuni resolver applicano comunque TTL minimi o massimi propri: il numero nella zona non è una garanzia assoluta.

```bash
dig www.example.com A
```

La colonna `86400` nella sezione ANSWER è il TTL residuo.

## Errori comuni

- **`CNAME` sull'apice della zona**: la zona diventa invalida o i record `MX`/`NS` spariscono. Usa `A`/`AAAA` all'apice.
- **Non incrementare il serial del `SOA`**: i secondari servono dati vecchi per giorni.
- **Aspettarsi propagazione immediata**: la cache del tuo resolver è una sola delle tante, cliente per cliente.
- **`TXT` senza virgolette**: in `dig` non le vedi, ma nei file di zona le stringhe vanno tra virgolette.
- **Alias verso un nome che poi cambia idea**: un `CNAME` verso il provider sbagliato è un errore che si scopre solo quando il servizio è irraggiungibile.

## In sintesi

- `A`/`AAAA` sono gli indirizzi veri; `CNAME` è un alias che non deve convivere con altri record.
- `MX`, `TXT`, `CAA` raccontano quasi tutto della posta e della sicurezza di un dominio.
- `SOA` e `NS` definiscono la zona e la sua catena di deleghe.
- Il TTL è il vero responsabile dei tempi di propagazione.

## Fonti

- RFC 1035 — Sezioni 3.6 e 3.7 sui tipi di record e il trasporto: https://www.rfc-editor.org/rfc/rfc1035.html
- RFC 8659 — DNS Certification Authority Authorization (CAA): https://www.rfc-editor.org/rfc/rfc8659.html
