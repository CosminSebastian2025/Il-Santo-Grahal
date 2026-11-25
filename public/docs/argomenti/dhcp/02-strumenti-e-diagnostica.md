Un server DHCP che funziona in ufficio può fallire in modo spettacolare in produzione: il servizio parte, nessun client riceve un indirizzo e il log non dice nulla di utile. In questa lezione configuri un server ISC `dhcpd`, lo interroghi con il client `dhclient`, riservi indirizzi a host noti e impari a leggere i log che servono davvero. L'obiettivo non è memorizzare la sintassi, ma sapere dove guardare quando un client resta su `169.254.x.x`.

## Obiettivi

- Scrivere un `dhcpd.conf` valido con subnet, range, opzioni e riserve.
- Assegnare indirizzi fissi con `host` e `fixed-address` e capire quando preferire una prenotazione.
- Usare `dhclient -1`, `-r` e `-v` per negoziare, rilanciare e diagnosticare.
- Verificare il servizio con `ss`, `journalctl` e `dhcpd -t`.
- Adottare configurazioni adatte a sistemi che gestiscono la rete con `systemd-networkd` o NetworkManager.

## Scrivere un dhcpd.conf

La configurazione ISC è una sequenza di dichiarazioni globali e blocchi. `ddns-update-style none;` disattiva gli aggiornamenti DNS dinamici, `default-lease-time` e `max-lease-time` danno la durata, `option` imposta i parametri standard. Dentro `subnet` si dichiara la rete con `netmask` e il `range` da distribuire.

```text
default-lease-time 3600;     # lease di 1 ora
max-lease-time 7200;         # oltre 2 ore non si concede, anche se richiesto
authoritative;               # il server decide e nega richieste sbagliate
ddns-update-style none;

subnet 192.168.10.0 netmask 255.255.255.0 {
  range 192.168.10.100 192.168.10.199;
  option routers 192.168.10.1;
  option subnet-mask 255.255.255.0;
  option domain-name "lan.example.it";
  option domain-name-servers 192.168.10.1, 1.1.1.1;
}
```

`option routers` e `option domain-name-servers` accettano una lista: il client prova i valori nell'ordine. Il range non deve includere la `.1` del gateway, gli indirizzi dei server né le riserve, e lo spazio compreso tra `.200` e `.254` resta libero per i `host` fissi.

Le riserve usano il blocco `host`, con `hardware ethernet` per il MAC e `fixed-address` per l'IP. Il filtro `host` è di solito preferibile a un `if` manuale: si applica solo a un MAC noto e permette di forzare opzioni diverse.

```text
host nas-sala-riunioni {
  hardware ethernet 00:11:22:33:44:55;
  fixed-address 192.168.10.20;
}

# Un client che deve usare un server DNS diverso dagli altri
subnet 192.168.10.0 netmask 255.255.255.0 {
  range 192.168.10.100 192.168.10.199;
  option routers 192.168.10.1;
  host portatile-dev {
    hardware ethernet 52:54:00:a1:b2:c3;
    fixed-address 192.168.10.50;
    option domain-name-servers 192.168.10.53;
  }
}
```

Quando il client invia il client identifier (opzione 61), `dhcpd` abbina la riserva al CID prima che al MAC. È questa la proprietà che rende le riserve stabili su VM e portatili con dongle di rete.

## Il client: dhclient in pratica

`dhclient` negozia, scrive il lease in `/var/lib/dhcp/dhclient.leases` e chiama `dhclient-script`, che applica indirizzo, rotte e resolver al sistema operativo. Su Debian e Ubuntu lo script usa `ifconfig`, `ip` o comandi specifici: se il sistema non ha le utilità previste, il lease si ottiene ma l'indirizzo non viene applicato.

| Comando | Effetto | Quando usarlo |
| --- | --- | --- |
| `dhclient -v eth0` | negozia e mostra ogni passo | prima diagnosi |
| `dhclient -1 eth0` | termina se non ottiene un lease | script e test automatici |
| `dhclient -r eth0` | invia DHCPRELEASE e libera l'indirizzo | cambiare rete o pulire |
| `dhclient -4 eth0` | solo IPv4 | host con IPv6 | 

```bash
# Test completo con un timeout breve
sudo dhclient -1 -v eth0; echo "exit: $?"

# Cosa è stato applicato davvero
ip -4 addr show dev eth0
ip route show default

# Il lease ricevuto, con CID e le date in UTC
cat /var/lib/dhcp/dhclient.leases

# Libertà di negoziare da capo
sudo dhclient -r eth0 && sleep 1 && sudo dhclient -v eth0
```

L'opzione `-1` è preziosa negli script: senza di essa `dhclient` resta in attesa in background e l'exit code non dice nulla. Con `-1`, un exit diverso da zero indica che nessuna offerta è arrivata entro il timeout, così una pipeline di provisioning può interrompersi invece di continuare senza rete.

La scelta della durata del lease è un compromesso: un lease lungo riduce il traffico e resiste a un server irraggiungibile per ore, ma riempie il pool con indirizzi di macchine spente da giorni. In una rete di ufficio con postazioni mobili conviene un lease di poche ore, in una rete stabile di server un lease di giorni. Se il pool si esaurisce, il sintomo è un `DISCOVER` senza `OFFER`, e il server risponde comunque a chi rinnova un lease esistente: il pool conta i lease attivi, non i client collegati.

## Diagnosi: dove guardare

Il primo segnale è sempre l'indirizzo: `169.254.x.x` è link-local, cioè nessuna risposta DHCP. Il secondo è il log. `dhcpd` scrive su syslog, e con systemd si legge con `journalctl -u isc-dhcp-server -f`.

| Sintomo | Prima ipotesi | Verifica |
| --- | --- | --- |
| `169.254.x.x` | nessun OFFER ricevuto | `tcpdump` sulla porta 67, stato del servizio |
| lease cambiato ogni ora | due server o due gestori di rete | `ss -ulpn`, `systemctl status` |
| lease ottenuto, nessuna rotta | `dhclient-script` non applica i parametri | `ip route`, log dello script |
| solo alcuni client falliscono | pool esaurito o MAC duplicato | `dhcpd.leases`, numero di lease attivi |

```bash
# Validare la sintassi prima di riavviare
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Il servizio è in ascolto sulla porta 67?
sudo ss -ulpn | grep ':67'

# Il servizio ha un'interfaccia assegnata?
systemctl status isc-dhcp-server --no-pager
grep -n DHCPD_INTERFACES /etc/default/isc-dhcp-server 2>/dev/null

# Errori e negoziazioni recenti
journalctl -u isc-dhcp-server --since "10 minutes ago" --no-pager
```

Su sistemi Debian la causa più frequente di "servizio attivo ma nessun lease" è `INTERFACESv4=""` nel file `/etc/default/isc-dhcp-server`: `dhcpd` parte, non si lega a nessuna interfaccia e non riceve i broadcast. Il log `Not configured to listen on any interfaces!` è la firma di questo errore.

## systemd-networkd, NetworkManager e dhclient

Due gestori di rete non devono competere per la stessa interfaccia. Su sistemi moderni si sceglie un solo proprietario: `systemd-networkd` con `DHCP=yes`, NetworkManager con un profilo `ipv4.method auto`, oppure `dhclient` lanciato manualmente. Se sono attivi insieme, il risultato è un indirizzo che compare e sparisce.

```ini
# /etc/systemd/network/20-wired.network
[Match]
Name=eth0

[Network]
DHCP=yes
# Per inviare un client identifier stabile (utile con le riserve)
[DHCPv4]
ClientIdentifier=mac
```

Con `systemd-networkd` le lease stanno in `/run/systemd/netif/leases/` e i log in `journalctl -u systemd-networkd`. La direttiva `ClientIdentifier=mac` evita che il CID generato casualmente cambi dopo un reinstall e renda inutile una riserva basata sul CID.

## Errori comuni

- **Range che include l'indirizzo del server**: il server può assegnare a sé stesso o al gateway un indirizzo già occupato, generando `DHCPDECLINE` e lease abbandonati.
- **Due servizi DHCP nella stessa LAN**: due server offrono indirizzi diversi per la stessa subnet e i client cambiano indirizzo a ogni rinnovo; i lease finiscono su due database separati.
- **`isc-dhcp-server` avviato senza `INTERFACESv4`**: il servizio è attivo e la porta 67 è libera, quindi nessun client riceve risposta.
- **Fidarsi del MAC su una VM clonata**: un clone mantiene il MAC della sorgente e ottiene la stessa riserva, causando conflitti; rigenerare il MAC o usare un CID distinto.
- **Non usare `dhcpd -t` prima del reload**: un errore di sintassi non sempre impedisce l'avvio, e il servizio vecchio continua a girare con la configurazione precedente.

## In sintesi

`dhcpd.conf` dichiara durata, subnet, range e opzioni, e le riserve `host` fissano gli indirizzi dei MAC noti. `dhclient -1` rende la negoziazione verificabile in uno script, `-r` restituisce il lease. La diagnosi parte da `169.254.x.x`, passa da `ss -ulpn` e da `journalctl`, e finisce quasi sempre su un'interfaccia non assegnata o su due gestori di rete attivi insieme.

## Fonti

- [ISC DHCP - pagine dhcpd](https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd)
- [ISC DHCP - pagine dhcp-options](https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options)
- [ISC DHCP Client Configuration](https://kb.isc.org/docs/aa-00333)
- [dhclient(8) - Debian manpages](https://manpages.debian.org/bookworm/isc-dhcp-client/dhclient.8.en.html)
- [systemd.network(5)](https://manpages.debian.org/bookworm/systemd/systemd.network.5.en.html)
