Un firewall è un punto di controllo del traffico di rete: confronta ogni pacchetto o connessione con un insieme di regole ordinate e decide se lasciarlo passare, scartarlo o respingerlo con una notifica. Non è un prodotto unico ma una famiglia di meccanismi che vivono su livelli diversi dello stack: filtri stateless sul kernel Linux, stateful inspection su apparati e cloud security group, proxy applicativi che leggono fino all'HTTP. In questa lezione impari a collocare ogni tipo di firewall nel punto giusto e a leggere una politica come un contratto verificabile.

## Obiettivi

- Distinguere firewall stateless, stateful e proxy applicativi e sapere dove agisce ciascuno.
- Leggere una regola come tupla di criteri più azione, con ordine di valutazione esplicito.
- Collegare il modello a zone e default deny ai criteri di policy del firewall di Windows.
- Capire perché il firewall da solo non è un perimetro e cosa aggiungono IDS, EDR e zero trust.

## Tre famiglie di firewall

Il firewall stateless applica regole a ogni pacchetto in isolamento: vede indirizzi, protocolli, porte e flag TCP, ma non sa se quel pacchetto appartiene a una connessione già consentita. Per questo richiede due regole per ogni flusso bidirezionale. Il firewall stateful tiene una tabella delle connessioni (`conntrack` in Linux, session table su router e apparecchiature di sicurezza): la prima regola autorizza il flusso, le risposte sono ammesse automaticamente perché corrispondono a una sessione stabilita.

Il proxy applicativo va oltre: termina la connessione, interpreta il protocollo e applica regole sul contenuto, per esempio metodo, host o dimensione del corpo HTTP. È più potente e più lento; nelle architetture moderne questo ruolo è spesso ricoperto da reverse proxy e WAF davanti ai backend.

| Famiglia | Cosa vede | Livello | Costo | Uso tipico |
| --- | --- | --- | --- | --- |
| Stateless | header IP/TCP, frammenti | 3–4 | minimo | ACL di router, regole nftables per il traffico host |
| Stateful | pacchetto più stato di connessione | 3–4 con tabella | medio | perimetro aziendale, security group, host firewall |
| Proxy / WAF | payload del protocollo | 7 | alto | esposizione web, filtro HTTP, ispezione TLS |
| NGFW | tutto quanto sopra più identità utente e Intelligence | 3–7 | molto alto | perimetro con applicativi e utenti |

Un NGFW (next-generation firewall) aggiunge riconoscimento applicativo e associazione fra utente e indirizzo: la regola "il gruppo `dev` può raggiungere `git.example.com:443`" sostituisce il vecchio elenco di IP.

## Anatomia di una regola

Ogni regola è una tupla di criteri e un'azione. I criteri tipici sono zona di ingresso, interfaccia, sorgente, destinazione, protocollo e porta; l'azione è `accept`/`allow`, `drop` (scarto silenzioso, il client aspetta) oppure `reject` (risposta con ICMP di porte irraggiungibile o TCP RST). La differenza conta: `drop` rallenta gli scanner, `reject` accelera la diagnostica.

```nft
# /etc/nftables.conf — policy default deny sull'input
table inet filtro {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept      # risposte dei flussi già ammessi
    iif "lo" accept                          # loopback locale
    ip protocol icmp icmp type echo-request limit rate 10/second accept
    tcp dport { 22, 443 } accept
    ct state invalid drop
  }
}
```

La riga `policy drop` è la scelta più importante: ciò che non è esplicitamente consentito non passa. Le regole vengono valutate in ordine e la prima che corrisponde decide; `ct state established,related` deve stare in alto, altrimenti le risposte dei flussi legittimi finiscono in fondo e vengono scartate. In nftables ogni regola ha un `handle` numerico che permette di modificare o cancellare una singola riga senza riscrivere il file.

| Azione | Effetto sul client | Quando usarla |
| --- | --- | --- |
| `accept` | connessione prosegue | traffico autorizzato e atteso |
| `drop` | timeout, nessuna risposta | esterni non fidati, scansioni |
| `reject` | RST o ICMP, errore immediato | reti interne, diagnostica |
| `log` + `drop` | viene registrata la tupla | eccezioni da monitorare |

## Zone, segmentazione e default deny

Il firewall perimetrale da solo non basta: la rete piatta fa sì che un host compromesso raggiunga connessioni dirette verso tutte le macchine interne, senza attraversare il controllo. La segmentazione in zone (utenti, server, OT/IoT, DMZ) riduce il raggio d'azione di un incidente e rende le regole leggibili in termini di intento. I cloud security group sono lo stesso concetto applicato a un'istanza: allow espliciti per porta e CIDR, nessun default aperto.

Il firewall di Windows riflette la stessa struttura: profili separati per dominio, rete privata e pubblica, azioni predefinite per connessioni in entrata e in uscita, regole più specifiche che hanno precedenza. Su un portatile la distinzione conta, perché connettersi alla rete di un bar deve spegnere in automatico l'esposizione pensata per l'ufficio.

```powershell
# Stato dei profili (Windows 11)
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction

# Consenti RDP solo da una sottorete e solo in ingresso
New-NetFirewallRule -DisplayName "RDP solo admin" -Direction Inbound -Protocol TCP `
  -LocalPort 3389 -RemoteAddress 10.20.0.0/24 -Action Allow
```

## Cosa il firewall non fa

Il firewall filtra il traffico in base a indirizzi e porte: non sa se il pacchetto è legittimo. Un attacco su 443 verso un'applicazione vulnerabile attraversa qualunque regola `allow`. Per questo si affianca gli altri controlli: WAF per gli applicativi, IDS/IPS per le anomalie di rete, EDR sugli endpoint, autenticazione forte per chi accede all'amministrazione. Il modello zero trust porta la logica oltre il perimetro: la policy si applica per ogni richiesta in base a identità e dispositivo, non alla posizione in rete.

## Errori comuni

- **Aprire "temporaneamente" una porta per qualsiasi sorgente**: le regole temporanee che restano sono la prima causa di esposizione non voluta.
- **Nessuna regola di default deny in uscita**: un malware esfiltra dati su 443 verso qualsiasi dominio; l'uscita controllata riduce l'effetto.
- **Confondere drop e reject in un test**: una regola `drop` fa sembrare rotto il servizio, mentre `reject` dà un errore chiaro.
- **Firewall perimetrale con rete piatta interna**: una volta entrato, l'attaccante ha accesso diretto a tutto.
- **Log senza periodo di conservazione**: senza log delle decisioni, non si può ricostruire un incidente né dimostrare la messa in campo dei controlli.

## In sintesi

Un firewall è una funzione di decisione: regole ordinate, azioni esplicite, default deny. Stateless, stateful e proxy corrispondono a livelli di visibilità crescenti, con costi e complessità crescenti. La segmentazione in zone e la policy in uscita trasformano il filtro in un vero perimetro interno, e solo l'affiancamento ad altri controlli copre l'applicazione e non soltanto la rete.

## Fonti

- [netfilter - documentazione](https://www.netfilter.org/documentation/)
- [nftables Wiki](https://wiki.nftables.org/wiki-nftables/index.php/Main_Page)
- [NIST SP 800-41r1 - Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final)
- [Microsoft Learn - Windows Firewall](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/)
