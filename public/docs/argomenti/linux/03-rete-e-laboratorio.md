La rete che conta per chi amministra un sistema è fatta di interfacce, socket in ascolto e richieste che escono e non tornano. `ip` e `ss` hanno sostituito `ifconfig` e `netstat`, `curl` verifica se il servizio risponde davvero. Qui costruiamo una diagnostica in quattro passi e la proviamo in un laboratorio senza modificare la configurazione di sistema.

## Obiettivi

- Leggere indirizzi, prefissi e rotte con `ip addr`, `ip route` e `ip neigh`.
- Distinguere un servizio che non ascolta da uno legato solo a `127.0.0.1`.
- Mappare porte e processi con `ss`, verificare una risposta HTTP con `curl`.
- Diagnosticare un "non si connette" nell'ordine corretto.
- Allestire un laboratorio effimero con network namespace.

## Indirizzi, prefissi e routing

Un indirizzo IPv4 è un valore a 32 bit; `10.0.0.5/24` dice che i primi 24 bit identificano la rete e gli ultimi 8 l'host. Il prefisso determina chi è "vicino": un host è raggiungibile direttamente se sta nella rete dell'interfaccia, altrimenti serve un gateway.

```bash
ip -brief addr
ip route
ip -6 route
ip neigh
```

Per `default` il gateway è il router; per `10.0.0.0/24 dev eth0` la consegna è diretta. Se manca la rotta della rete locale, il ping al collega fallisce anche con l'indirizzo giusto. `ip neigh` mostra la cache ARP: una voce `FAILED` dice che l'host non risponde a livello 2.

```bash
ip addr add 10.10.10.1/24 dev veth0   # solo in laboratorio
ip addr del 10.10.10.1/24 dev veth0
```

`ifconfig` e `netstat` sono deprecati: usa `ip`.

| Domanda | Comando || --- | --- |
| Quali indirizzi ho? | `ip -brief addr` |
| Qual è il gateway? | `ip route show default` |
| Il servizio ascolta? | `ss -lntp` |
| Risponde davvero? | `curl -sv http://127.0.0.1:8080/` |
| Il nome si risolve? | `getent hosts esempio.org` |

## Socket, porte e `ss`

Un servizio in ascolto è un socket. `ss -lntp` elenca i socket TCP in ascolto con il processo che li possiede (il `p` richiede privilegi per i processi altrui). L'indirizzo di ascolto dice molto: `127.0.0.1:8080` risponde solo dalla macchina, `0.0.0.0:8080` da IPv4, `[::]:8080` da IPv6. Il caso "funziona in locale ma non da fuori" è quasi sempre questo.

```bash
ss -lntp
ss -tnp state established
ss -s
```

La porta 22 solo su `127.0.0.1` significa che un tunnel fa da intermediario; firewall e binding lavorano a livelli diversi.

```bash
curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' http://127.0.0.1:8080/
curl -v --max-time 5 http://127.0.0.1:8080/ 2>&1 | head -20
```

`curl -o /dev/null -w` controlla lo stato senza stampare il corpo; `000` significa che la connessione non è avvenuta.

## Diagnostica in quattro passi

Il metodo evita di cambiare tre cose contemporaneamente.

1. **Interfaccia**: `ip -brief addr`. Senza indirizzo non si va da nessuna parte.
2. **Rotta e vicino**: `ip route` e `ip neigh`. Gateway irraggiungibile, problema locale.
3. **Socket**: `ss -lntp` sulla macchina che dovrebbe servire. Porta assente, servizio non partito.
4. **Applicazione**: `curl -v` con un hostname realistico. Un 5xx dice che la rete funziona e il bug è nel servizio.

```bash
printf '%s\n' '--- indirizzi'
ip -brief addr
printf '%s\n' '--- gateway'
ip route show default
printf '%s\n' '--- porte in ascolto'
ss -lnt
printf '%s\n' '--- stato HTTP'
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/ || echo 'connessione fallita'
```

La risoluzione dei nomi si prova con `getent hosts`, non con `ping`: `getent` usa la stessa catena del sistema, `ping` confonde DNS e connettività.

## Laboratorio

Il percorso preferito è isolato con un namespace: interfaccia virtuale, indirizzi, un listener e un test dall'esterno, senza tracce permanenti.

```bash
ip netns add lab
ip link add veth-host type veth peer name veth-lab
ip link set veth-lab netns lab
ip addr add 10.99.0.1/24 dev veth-host && ip link set veth-host up
ip netns exec lab ip addr add 10.99.0.2/24 dev veth-lab
ip netns exec lab ip link set veth-lab up
ip netns exec lab python3 -m http.server 8080 --bind 10.99.0.2 &
curl -sS -o /dev/null -w '%{http_code}\n' http://10.99.0.2:8080/
ip netns delete lab      # pulizia: rimuove anche i processi nel namespace
```

Il secondo percorso è una macchina virtuale o un container: stesse sequenze, `ss -lntp` compreso.

## Esercizi

1. Spiega perché `curl http://127.0.0.1:8080` funziona mentre lo stesso servizio non risponde su `http://10.0.0.5:8080`.
2. Hai `ss -lntp` che mostra `0.0.0.0:22` ma `ssh` da un'altra macchina fallisce: elenca in ordine le tre verifiche.
3. Un host non risolve `esempio.org`: come distingui un problema DNS da un problema di connettività?
4. Scrivi un one-liner che stampi solo le porte TCP in ascolto su tutte le interfacce.
5. Nel laboratorio con namespace, perché `ip netns delete` è una pulizia affidabile?
6. Con `curl`, come controlli lo stato HTTP senza scrivere a video il corpo?

<details>
<summary>Soluzione</summary>

1. `127.0.0.1` è la loopback, sempre presente; `10.0.0.5` esiste solo se l'interfaccia ha quell'indirizzo e il servizio è legato a `0.0.0.0` o a quell'IP. Verifica con `ip -brief addr` e `ss -lntp`.
2. **(a)** `ss -lntp` sul server: la 22 è in ascolto? **(b)** `ip route` sul client: c'è rotta verso il server? **(c)** un firewall scarta: prova `nc -vz server 22`.

3. `getent hosts esempio.org`: se restituisce un indirizzo il DNS funziona e il problema è di raggiungibilità (`ip route`, `ping -c1`); se è vuoto controlla `/etc/resolv.conf` e la porta 53, e usa `ping 1.1.1.1` per separare "internet rotto" da "DNS rotto".4. `ss -lnt | awk 'NR>1 && $4 ~ /^(0\.0\.0\.0|\[::\]|\*):/ {print $4}'`.

5. Il namespace distrugge interfacce virtuali, socket e processi al suo interno: non restano listener orfani.

6. `curl -sS -o /dev/null -w '%{http_code}\n' URL`: il corpo va in `/dev/null`, lo stato su stdout; aggiungi `--max-time 5` per non restare appesi.

</details>

## Errori comuni

- **Ping come test di applicazione**: `ping` parla ICMP e non prova né la porta né il servizio.
- **Leggere `ss` senza la colonna dell'indirizzo**: due servizi sulla stessa porta su indirizzi diversi sono legittimi.
- **Aggiungere indirizzi a mano sulla macchina reale**: restano rotte che confondono la diagnostica.
- **Cambiare DNS, firewall e applicazione insieme**: non si sa più quale modifica ha cambiato il comportamento.
- **Usare `ifconfig` come unico strumento**: non mostra gli indirizzi IPv6 secondari che `ip` espone.

## In sintesi

- Il prefisso dice chi è raggiungibile direttamente; il gateway copre il resto.
- `ss -lntp` e l'indirizzo di binding spiegano "funziona in locale" contro "raggiungibile da fuori".
- La diagnostica procede per livelli: interfaccia, rotta, socket, applicazione.
- Il network namespace permette di sperimentare senza lasciare tracce.

## Fonti

- `ip(8)`, comandi per indirizzi, rotte e link: https://man7.org/linux/man-pages/man8/ip.8.html
- `ss(8)`, socket e opzioni di visualizzazione: https://man7.org/linux/man-pages/man8/ss.8.html
- `network_namespaces(7)`, isolamento di rete per il laboratorio: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `curl(1)`, opzioni `-o`, `-w`, `--max-time`: https://curl.se/docs/manpage.html
