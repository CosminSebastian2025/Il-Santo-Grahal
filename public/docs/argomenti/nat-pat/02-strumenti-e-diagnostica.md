Un NAT che funziona in un piccolo ufficio può crollare con migliaia di client: le porte finite, le connessioni che si bloccano e gli indirizzi `100.64.0.0/10` che non sono né privati né raggiungibili. In questa lezione configuri il NAT su Linux con `nftables` e `iptables`, misuri la tabella con `conntrack` e ne riconosci i limiti scalando fino al CGNAT degli operatori.

## Obiettivi

- Scrivere regole di masquerading e di port forwarding con `nftables` e `iptables`.
- Verificare la tabella di traduzione e i contatori del kernel.
- Distinguere il NAT statico 1:1 dal PAT condiviso e usare il primo per un server.
- Spiegare come funziona il CGNAT con RFC 6598 e RFC 6888 e cosa ne consegue per il client.
- Riconoscere i sintomi di esaurimento delle porte e dei binding scaduti.

## Configurare il NAT su Linux

Linux fa NAT con netfilter: il pacchetto ricevuto sull'interfaccia WAN passa per le catene `PREROUTING` o `POSTROUTING`, dove la traduzione avviene. Con `nftables` si dichiarano tabelle e regole in un file; con `iptables` si usa `MASQUERADE` nella catena `nat` e `POSTROUTING`.

```bash
# Abilitare l'inoltro IP: senza questo il pacchetto non passa
sysctl -w net.ipv4.ip_forward=1

# nftables: masquerade sull'interfaccia WAN
sudo nft add table inet nat
sudo nft 'add chain inet nat postrouting { type nat hook postrouting priority 100; }'
sudo nft add rule inet nat postrouting oifname "eth0" masquerade

# Equivalente con iptables (legacy)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Port forwarding verso un server interno
sudo nft add rule inet nat prerouting tcp dport 443 dnat to 192.168.1.10:443
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to 192.168.1.10:443
```

`masquerade` sceglie l'indirizzo dell'interfaccia di uscita nel momento dell'invio: giusto per un collegamento con IP dinamico. Se l'indirizzo pubblico è fisso si usa `snat to <ip>`, che non interroga l'interfaccia e rende la regola prevedibile. Il `dnat` in ingresso, invece, sostituisce la destinazione prima del routing e crea il binding inverso.

```bash
# Catturare la regola in formato riutilizzabile
sudo nft list ruleset > nft.conf
sudo iptables-save > iptables.rules

# Riapplicare dopo un riavvio (systemd)
sudo nft -f /etc/nftables.conf
```

Una regola di `masquerade` senza `ip_forward` abilita il NAT ma il pacchetto non viene inoltrato: il log non dice nulla e la connessione resta appesa. È il primo controllo da fare su un router Linux appena installato.

## Osservare la tabella

`conntrack -L` è la vista autorevole del NAT in esecuzione, e `conntrack -S` mostra i contatori per protocollo e gli errori di allocazione.

| Comando | Cosa mostra | Uso pratico |
| --- | --- | --- |
| `conntrack -L` | tutti i flussi attivi con le traduzioni | verificare che un binding esista |
| `conntrack -L -p tcp` | solo TCP | controllare le sessioni web e SSH |
| `conntrack -S` | statistiche e errori | capire se la tabella è piena |
| `conntrack -E` | eventi in tempo reale | seguire una negoziazione |
| `conntrack -D -p udp` | cancella binding UDP | test di ricreazione |

```bash
# Un flusso tradotto, letto dall'alto verso il basso
sudo conntrack -L -p tcp | head -3
# tcp 6 86393 ESTABLISHED src=192.168.1.10 dst=93.184.216.34
#   sport=52144 dport=443 src=93.184.216.34 dst=203.0.113.7
#   sport=443 dport=40001 [ASSURED] mark=0 use=1

# Quanti binding sono aperti e quanti falliscono
sudo conntrack -S | head -4
```

I valori chiave sono pochi: `ASSURED` indica che il flusso è stato visto in entrambe le direzioni ed è protetto dalla pulizia automatica; `use=1` dice che una sola regola lo referenzia. Il contatore `insert_failed` che cresce, insieme a `dropped`, è la firma della tabella piena. I limiti si alzano con `net.netfilter.nf_conntrack_max` e le voci stanno in `/proc/sys/net/netfilter/`.

## Limiti: porte, espirazione e memoria

Il PAT ha un budget di porte: per ogni indirizzo pubblico e protocollo le porte non privilegiate sono circa 64.000, con la pratica di riservarne una parte. Ogni flusso verso una destinazione diversa consuma un binding TCP, e una macchina che apre migliaia di connessioni simultanee può esaurirle prima degli altri.

Anche la memoria limita la tabella: ogni voce occupa centinaia di byte e `nf_conntrack_max` di default dipende dalla RAM. Un attacco di floods o un browser con centinaia di schede può raggiungere il limite, dopo il quale i nuovi flussi vengono scartati senza errore applicativo.

## Dal NAT al CGNAT

Un provider che non ha più indirizzi pubblici per tutti i clienti usa Carrier-Grade NAT: una gerarchia di apparati NAT tra la rete d'accesso e Internet. L'RFC 6598 riserva `100.64.0.0/10` per questo spazio di traduzione, chiamato *shared address space*: non è privato nel senso dell'RFC 1918 e non è instradabile su Internet.

| Aspetto | NAT domestico | CGNAT |
| --- | --- | --- |
| Indirizzo esterno | uno per casa, stabile o quasi | condiviso da molti client |
| Porte per client | ~64k | poche centinaia in fasce orarie di punta |
| Port forwarding | possibile, è tuo il router | impossibile senza richiesta al provider |
| Geolocalizzazione | coerente | molti client sullo stesso IP |
| Logging | non richiesto | obbligatorio per identificare il client |

L'RFC 6888 elenca i requisiti per il CGNAT: supporto di tutti i protocolli, porti contigui assegnati a ciascun cliente (port range), logging con timestamp per ricostruire un mapping, e gestione di ICMP. I port range contigui sono la ragione per cui un gioco o un protocollo che richiede un blocco di porte può fallire anche se apri una singola porta. Lato client il sintomo è di nuovo "symmetric NAT": STUN scopre un indirizzo, ma il peer-to-peer resta impossibile.

IPv6 elimina la necessità, perché ogni host può avere un indirizzo globale. NAT66 esiste, ma è una scelta di gestione, non un requisito: con IPv6 il NAT non serve a risparmiare indirizzi e spesso peggiora la raggiungibilità end-to-end.

## Errori comuni

- **Dimenticare `net.ipv4.ip_forward=1`**: il masquerade è attivo, il pacchetto non viene inoltrato e la connessione resta appesa.
- **NAT a valle di un firewall stateful non trasparente**: un apparato che non riconosce il NAT rompe i flussi in una direzione e produce reset apparentemente casuali.
- **Osservare solo i contatori e non `conntrack -S`**: le porte esaurite e la tabella piena si vedono lì, non nel traffico applicativo.
- **Fare sniffing sul server con il NAT in mezzo**: gli indirizzi sono già tradotti e l'analisi attribuisce le connessioni al router.
- **Contare su un binding stabile per un protocollo che richiede porte in ingresso**: dietro CGNAT o NAT simmetrico serve un relay o un servizio che termini il protocollo nel cloud.

## In sintesi

Il NAT su Linux è una regola nella catena `nat`, e `conntrack` è il registro che fa tornare i pacchetti. `masquerade` copre l'IP dinamico, `dnat` pubblica un servizio, e la tabella ha limiti di porte, memoria e tempo. Il CGNAT replica lo stesso schema su scala e lo rende obbligatorio per regolamento e logging. Quando qualcosa si rompe, la domanda utile è sempre la stessa: quale binding sarebbe dovuto esistere e da quale protocollo?

## Fonti

- [RFC 4787 - NAT Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787)
- [RFC 6598 - IANA-Reserved IPv4 Prefix for Shared Address Space](https://www.rfc-editor.org/rfc/rfc6598)
- [RFC 6888 - Common Requirements for Carrier-Grade NATs (CGNs)](https://www.rfc-editor.org/rfc/rfc6888)
- [nftables - statements](https://git.netfilter.org/nftables/tree/doc/statements.txt)
- [Linux Kernel - netfilter conntrack sysctl](https://docs.kernel.org/networking/nf_conntrack-sysctl.html)
