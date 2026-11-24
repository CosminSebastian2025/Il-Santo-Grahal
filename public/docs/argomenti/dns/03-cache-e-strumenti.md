Una risposta DNS può essere stale, incompleta o arrivare dal posto sbagliato perché sei passato attraverso tre o quattro cache diverse. Qui impari dove vivono quelle cache e quali strumenti interrogare per capire da dove arriva il dato che stai guardando. `dig`, `nslookup` e `getent` non sono intercambiabili: rispondono a domande diverse.

## Obiettivi

- Mappare i livelli di cache tra applicazione e server autoritativo.
- Usare `dig`, `nslookup` e `getent` scegliendo lo strumento giusto.
- Svuotare e verificare la cache del resolver di sistema.
- Distinguere un problema DNS da un problema di rete.

## Dove viene memorizzato un record

Dal browser al server autoritativo, una copia del record può esistere in parallelo in:

1. **cache dell'applicazione**: browser (spesso con TTL interni non configurabili), runtime Java/Node con la loro cache interna;
2. **resolver di sistema**: `systemd-resolved`, `nscd`, `dnsmasq`, il resolver del router; di solito è qui che `getaddrinfo` guarda;
3. **resolver ricorsivo**: il server a cui il tuo sistema inoltra le query, con la sua cache condivisa;
4. **server autoritativi secondari**: replicano la zona dal primario e servono TTL pieni.

Il TTL decide per quanto ogni copia resta valida. Non puoi forzare la scadenza delle cache che non controlli.

## Svuotare la cache locale

**Linux con systemd-resolved**

```bash
sudo resolvectl flush-caches
sudo resolvectl statistics
```

`statistics` mostra il numero di hit e miss: se le hit sono alte, quasi tutto viene dalla cache.

**macOS**

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

**Windows (PowerShell o cmd)**

```powershell
ipconfig /flushdns
ipconfig /displaydns
```

`displaydns` elenca i record attualmente in cache sul sistema.

## `dig`: interrogare un server specifico

`dig` è lo strumento di riferimento perché parla DNS puro, senza passare dal resolver di sistema nella configurazione predefinita: usa i `nameserver` di `/etc/resolv.conf`, ma puoi forzarne uno.

```bash
dig example.com A
dig example.com MX
dig +short example.com A
dig @8.8.8.8 example.com A           # chiedi a un resolver pubblico
dig @ns.icann.org example.com A      # chiedi direttamente all'autoritativo
dig +noall +answer www.example.com CNAME
```

Il flag `@server` è il più importante in fase di diagnosi: chiedendo allo stesso nome a resolver diversi e all'autoritativo vedi se il disallineamento è nella cache o nella zona.

Altre combinazioni utili:

- `+short` stampa solo i valori, comodo negli script;
- `+noall +answer` mostra solo la sezione ANSWER;
- `+tcp` forza il trasporto TCP;
- `+trace` esegue tutte le query iterative da solo;
- `+norecurse` invia una query iterativa (usalo verso gli autoritativi, non verso il tuo resolver).

## `nslookup`: disponibile ovunque

`nslookup` c'è anche su Windows e ha una modalità interattiva utile per cambiare server senza riscrivere il comando.

```bash
nslookup example.com
nslookup -type=MX example.com 1.1.1.1
```

```text
Server:		1.1.1.1
Address:	1.1.1.1#53

Non-authoritative answer:
example.com	mail exchanger = 0 .
```

`Non-authoritative answer` significa che la risposta arriva da una cache, non dalla zona. È un segnale, non un errore. In modalità interattiva `server 8.8.8.8` cambia il resolver corrente e `set type=AAAA` cambia il tipo di record.

Su Windows va notato un dettaglio: `nslookup` interroga il server DNS direttamente e non riflette sempre lo stato della cache cliente, quindi può mostrare un record diverso rispetto a `ping` o al browser.

## `getent`: ciò che vede l'applicazione

`getent hosts` usa lo stesso meccanismo delle applicazioni (`getaddrinfo` tramite `nsswitch.conf`): consulta `/etc/hosts`, poi mDNS e DNS, con la configurazione del sistema.

```bash
getent hosts example.com
```

```text
93.184.215.14   example.com
```

Confronta i tre livelli:

```bash
getent hosts api.local      # può risolvere da /etc/hosts
dig api.local A             # quasi certamente NXDOMAIN
dig @127.0.0.53 example.com # interroga il resolver locale di systemd
```

Se `getent` funziona ma l'applicazione no, il problema è nella cache dell'applicazione o nella configurazione dell'applicazione stessa. Se `getent` fallisce ma `dig @8.8.8.8` funziona, il problema è nel resolver configurato (o nella rete verso di lui), non nel dominio.

Su macOS il comando equivalente è `dscacheutil -q host -a name example.com`, su Windows `Resolve-DnsName example.com` in PowerShell.

## Sicurezza: DNS non è cifrato per definizione

Le query DNS in chiaro passano da router, ISP e Wi-Fi pubblici, e chi le vede può raccogliere informazioni o tentare avvelenamenti di cache. Due risposte pratiche:

- **DoH/DoT** (DNS over HTTPS / TLS) cifra il trasporto tra client e resolver, RFC 8484 e 7858;
- **DNSSEC** firma i dati nella zona autoritativa, così il resolver può verificare che la risposta non sia stata manomessa, RFC 4033-4035.

Le due cose sono indipendenti: DoH nasconde la query, DNSSEC garantisce l'integrità della risposta. Se il resolver aziendale non valida DNSSEC, un record manomesso può arrivare intatto fino a te.

## Errori comuni

- **Diagnosticare solo con il browser**: la cache del browser non è svuotabile in modo affidabile dal tuo codice. Usa `dig` per la zona e un `curl -v` per l'applicazione.
- **Dimenticare `@server`**: se chiedi sempre al resolver locale, vedi sempre la cache.
- **Interpretare `SERVFAIL` come "dominio inesistente"**: `SERVFAIL` può indicare una zona malformata, un DNSSEC rotto o un autoritativo irraggiungibile. `NXDOMAIN` è l'unico "non esiste".
- **Considerare `dig` una prova definitiva**: `dig` bypassa `/etc/hosts` e `nsswitch.conf`, quindi non è il comportamento dell'applicazione.
- **Svuotare cache su un server condiviso senza preavviso**: aumenti il carico sugli autoritativi e perdi l'effetto protettivo nei picchi di traffico.

## In sintesi

- Un record può essere copiato in browser, sistema, resolver e autoritativo, ognuno con il proprio TTL.
- `dig @server` confronta livelli; `+trace` ricostruisce la catena; `getent` mostra la vista dell'applicazione.
- `nslookup` è il minimo comune denominatore multipiattaforma; `Resolve-DnsName` è l'equivalente PowerShell.
- DNS in chiaro è osservabile e modificabile: DoH/DoT cifrano il trasporto, DNSSEC firma i dati.

## Fonti

- `getent(1)` su man7.org — comportamento del resolver di sistema: https://man7.org/linux/man-pages/man1/getent.1.html
- RFC 4034 — Resource Records for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4034.html
