In questo laboratorio colleghi due sedi con un tunnel IPsec IKEv2 in un ambiente virtualizzato locale: due gateway Linux con strongSwan e due reti interne. L'obiettivo non è copiare una configurazione, ma arrivare a un tunnel che sai spiegare con sei verifiche, e che resiste a NAT, riavvio e cambio di algoritmo.

## Obiettivi

- Costruire un laboratorio con due gateway e due sottoreti private isolate.
- Generare una PKI minima con una CA e un certificato per gateway.
- Scrivere una configurazione IKEv2 con una child SA per coppia di sottoreti.
- Attraversare un NAT intermedio e capire perché serve NAT-T.
- Verificare negoziazione, policy e traffico con comandi e catture.

## Topologia e premesse

Due host Linux con strongSwan, oppure due container con privilegi di rete. Le reti `10.1.0.0/24` e `10.2.0.0/24` sono collegate solo dai gateway, che si vedono su una terza rete. Il firewall è volutamente pulito: le regole si aggiungono dopo, così un errore resta attribuibile.

| Nodo | Rete interna | Indirizzo esterno | Ruolo |
| --- | --- | --- | --- |
| gw-a | 10.1.0.1/24 | 192.0.2.10 | gateway sede A |
| gw-b | 10.2.0.1/24 | 192.0.2.20 | gateway sede B |
| nat | — | 192.0.2.1 | NAT verso la rete pubblica del laboratorio |
| host-a | 10.1.0.50 | — | client di prova |

```bash
# Sul client della sede A, la rotta verso la sede B passa dal gateway locale
sudo ip route add 10.2.0.0/24 via 10.1.0.1
ip route get 10.2.0.50
```

Il primo errore di laboratorio è la rotta mancante sul client o il forwarding spento sul gateway: il tunnel sale e i pacchetti non vengono inoltrati.

## PKI e identificazione

Una CA locale basta per il laboratorio, purché le differenze rispetto alla produzione siano chiare: nessun CRL distribuito, scadenza corta, chiavi su file locale.

```bash
# CA, chiavi e certificati con SAN coerenti con gli id usati in swanctl
ipsec pki --gen --type rsa --size 3072 --outform pem > ca.key
ipsec pki --self --ca --lifetime 365 --in ca.key \
  --dn "CN=Lab CA" --outform pem > ca.crt

ipsec pki --gen --type rsa --size 3072 --outform pem > gw-a.key
ipsec pki --pub --in gw-a.key --type rsa \
  | ipsec pki --issue --lifetime 90 --cacert ca.crt --cakey ca.key \
      --dn "CN=gw-a.lab" --san "gw-a.lab" \
      --flag serverAuth --flag ikeIntermediate --outform pem > gw-a.crt
```

Il campo `--san` deve corrispondere al valore `id` della configurazione: è il confronto da fare quando il tunnel non parte pur con proposte e reti corrette.

## Il tunnel, e il NAT

La configurazione è la stessa sui due lati con gli indirizzi invertiti. Quando il gateway B è dietro NAT, il NAT riscrive gli indirizzi e si passa alla rilevazione automatica del NAT e all'incapsulamento su UDP 4500.

```bash
# Verifica dell'incapsulamento: se compare udp port 4500, il tunnel è dietro NAT
sudo tcpdump -ni any 'udp port 500 or udp port 4500' -c 20
# Riavvia una SA scaduta senza toccare la configurazione
sudo swanctl --rekey --child lan-b
```

In produzione il firewall deve consentire UDP 500 e 4500 verso il gateway e il protocollo ESP per IPsec nativo. Con DPI ispettivo aggressivo ESP viene bloccato e il tunnel è intermittente; il fallback su TCP (RFC 8229) aiuta ma costa prestazioni.

## Esercizi

1. Porta a termine il tunnel tra gw-a e gw-b e dimostra con `ip xfrm policy list` che esiste una policy per ciascuna direzione.
2. Sposta gw-b dietro un NAT e verifica che il tunnel passi su UDP 4500 restringendo il firewall.
3. Aggiungi una seconda child SA per una sottorete `10.1.1.0/24` e spiega perché non basta cambiarne una sola.
4. Cambia la proposta IKE a un gruppo DH che l'altro lato non supporta e leggi l'errore, poi ripristina.
5. Misura l'MTU del tunnel con `ping -M do` e spiega il sovraccarico rispetto alla MTU fisica.
6. Genera un certificato revocato e verifica che il tunnel non salga con una CRL attiva.

<details>
<summary>Soluzione</summary>

1. Si controllano `swanctl --list-sas` per le child SA e `ip xfrm policy list` per le due direzioni (`dir out` e `dir in`) con i selector delle due sottoreti e `mode tunnel`.

2. Si sposta gw-b dietro una macchina di NAT e si restringe la regola a UDP 500 per il traffico iniziale: IKE scopre il NAT e sposta il traffico su 4500, mentre `tcpdump` mostra i pacchetti ESP incapsulati in UDP.

3. `local_ts` e `remote_ts` identificano una coppia; con due sottoreti servono due child SA o un selector più ampio, e la seconda strada richiede la stessa ampiezza su entrambi i lati.

4. Se IKE_SA_INIT non trova un gruppo comune, la negoziazione fallisce con un `NO_PROPOSAL_CHOSEN` prima ancora dell'autenticazione: è la prova che algoritmi e identità sono fasi separate.

5. La modalità tunnel aggiunge una nuova intestazione IP esterna e l'intestazione ESP; su Ethernet con MTU 1500 il payload interno sicuro resta sotto i 1400 byte, e il MSS va ritoccato per evitare frammentazione.

6. Con una CRL caricata e il certificato elencato, IKE_AUTH termina con un errore di certificato revocato; senza la CRL il tunnel sale, il che dimostra perché la revoca va distribuita.

</details>

## Errori comuni

- **Dimenticare `net.ipv4.ip_forward=1`**: il tunnel è negoziato ma i pacchetti tra le due sedi non passano.
- **Confondere la rete del tunnel con le reti interne**: IPsec non assegna indirizzi ai gateway; gli indirizzi appartengono ai selector.
- **Aprire il firewall solo per IKE**: se ESP non è permesso o NAT-T non è consentito, il tunnel si stabilisce e poi resta muto.
- **Usare lo stesso `id` su due gateway**: le identità devono essere uniche, altrimenti un peer può impersonare l'altro in configurazioni PBSK o con certificati male emessi.
- **Riavviare i servizi per ogni test**: `swanctl --rekey` e i log permettono di verificare senza perdere lo stato delle SA.

## In sintesi

- Un tunnel IPsec ha bisogno di PKI, proposte coerenti, selector corretti e forwarding abilitato.
- Il gate principale è la verifica in tre livelli: SA negoziate, policy kernel, traffico reale.
- Il NAT costringe a UDP 4500 e rende AH inutile: ESP con NAT-T è la configurazione praticabile.
- Ogni coppia di sottoreti richiede una child SA coerente su entrambi i lati.
- Revoca, rotazione e monitoraggio dei contatori fanno parte del tunnel quanto le chiavi.

## Fonti

- [strongSwan — quickstart](https://docs.strongswan.org/docs/latest/config/quickstart.html)
- [strongSwan — route-based VPN](https://docs.strongswan.org/docs/latest/features/routeBasedVpn.html)
- [RFC 3193 — Securing L2TP using IPsec](https://www.rfc-editor.org/rfc/rfc3193)
- [RFC 8229 — TCP Encapsulation of IKE and IPsec Packets](https://www.rfc-editor.org/rfc/rfc8229)
- [Manual page — ip-xfrm(8)](https://man7.org/linux/man-pages/man8/ip-xfrm.8.html)
