Tailscale costruisce una rete privata virtuale sopra internet senza un concentratore centrale: ogni dispositivo installa un client, si autentica con un'identità (Google, GitHub, Microsoft o un identity provider aziendale) e ottiene un indirizzo stabile. Il traffico viaggia in tunnel WireGuard cifrati end-to-end, mentre un servizio di coordinamento distribuisce chiavi pubbliche, indirizzi e regole di accesso. L'insieme di devices e utenti prende il nome di tailnet.

La chiave per capire Tailscale è separare due piani. Il piano di controllo coordina chi può parlare con chi; il piano dati trasporta i pacchetti direttamente da un dispositivo all'altro. Chi confonde i due piani si aspetta che spegnere il servizio di coordinamento blocchi le comunicazioni, e invece i tunnel già stabiliti continuano a funzionare: lo stesso modello che ritroverai in Headscale, il control server self-hosted compatibile.

## Obiettivi

- Distinguere piano di controllo e piano dati e spiegare cosa succede a ciascuno quando il piano di controllo è irraggiungibile.
- Descrivere tailnet, dispositivi, utenti e tagged nodes come gli oggetti di base del servizio.
- Riconoscere il ruolo di WireGuard, DERP, STUN e del coordinamento nella creazione di una connessione.
- Leggere lo spazio di indirizzi 100.64.0.0/10 e i nomi MagicDNS nel dominio ts.net.
- Usare `tailscale up`, `status`, `ip` e `netcheck` per connettersi e leggere lo stato di un dispositivo.

## I due piani

La documentazione ufficiale descrive il piano di controllo come un controllore di volo: gestisce identità, chiavi, configurazioni di DNS, route e policy, e aiuta i dispositivi a trovarsi. Non trasporta traffico utente. Il piano dati vive dentro ogni client e sposta i pacchetti cifrati secondo le regole ricevute.

| Aspetto | Piano di controllo | Piano dati |
| --- | --- | --- |
| Dove gira | Coordination service (`controlplane.tailscale.com`) | Client su ogni dispositivo |
| Cosa gestisce | Identità, chiavi, indirizzi, DNS, policy, NAT traversal | Cifratura WireGuard, forwarding, filtri |
| Protocolli | HTTPS/HTTP verso il servizio di coordinamento | WireGuard su UDP, DERP su TCP 443 |
| Se è irraggiungibile | Niente nuove connessioni né aggiornamenti di policy | I tunnel esistenti continuano con la policy in cache |
| Dati utente | Mai | Sempre |

Il servizio di coordinamento non fa autenticazione degli utenti: la delega a un identity provider OAuth 2.0 o OpenID Connect e conserva solo token e chiavi pubbliche. Un dispositivo vede le chiavi pubbliche solo dei peer a cui la policy permette di accedere: di default i membri di un tailnet non si vedono finché una regola non lo concede.

## Come nasce una connessione

Il client scopre la topologia, i peer e la mappa DERP dal piano di controllo, poi prova un percorso diretto. WireGuard usa UDP con porta sorgente 41641, e STUN su UDP 3478 serve a capire che indirizzo pubblico vede il NAT. Se i due NAT sono restii (per esempio NAT simmetrici), il traffico passa da un relay DERP cifrato da capo a capo: funziona sempre, ma con latenza e throughput diversi.

```bash
# sulla macchina: indirizzo overlay, nome e stato dei peer
tailscale ip -4            # es. 100.121.112.23
tailscale ip -6            # es. fd7a:115c:a1e0:ab12:4843:cd96:627e:9975
tailscale status
```

L'output di `tailscale status` ha cinque colonne: IP Tailscale, nome macchina, utente, sistema operativo e stato. Nella quinta colonna compare `active; direct <ip-porta>` per un percorso punto-punto, `active; relay <codice-città>` per un percorso DERP e `idle` quando non c'è traffico in corso in quel momento.

```bash
# connettere un dispositivo senza flag: apre il flusso di login nel browser
tailscale up

# accettare le route annunciate da un subnet router (su Linux è opt-in)
sudo tailscale set --accept-routes

# report sulle condizioni della rete fisica
tailscale netcheck
```

`tailscale netcheck` riporta se UDP è disponibile, gli indirizzi pubblici IPv4 e IPv6, il campo `MappingVariesByDestIP` (NAT difficile), i servizi di port mapping trovati e la latenza verso i relay DERP. Se UDP è `false` quasi certamente non ci saranno connessioni dirette e tutto passerà dai relay.

## Indirizzi, nomi e chiavi

Ogni dispositivo riceve un indirizzo IPv4 dallo spazio CGNAT 100.64.0.0/10 e un indirizzo IPv6 nel prefisso fd7a:115c:a1e0::/48. Sono indirizzi stabili: restano gli stessi anche se il dispositivo cambia rete, per esempio dal Wi-Fi alla rete mobile. Non sono raggiungibili da internet e non vanno annunciati nei routing pubblici.

| Elemento | Valore | Note |
| --- | --- | --- |
| IPv4 overlay | 100.64.0.0/10 | spazio CGNAT RFC 6598, stabile |
| IPv6 overlay | fd7a:115c:a1e0::/48 | assegnato a ogni dispositivo |
| Servizio locale | 100.100.100.100 (Quad100) | DNS locale e API del client |
| MagicDNS | macchina.tailnet.ts.net | attivo di default nei tailnet recenti |
| Porta WireGuard | UDP 41641 | sorgente configurabile per device |
| Scadenza chiave | 180 giorni | disattivabile dai server |

MagicDNS registra un nome per ogni dispositivo composto dal nome macchina e dal dominio del tailnet: `monitoring` diventa `monitoring.yak-bebop.ts.net`, e grazie ai search domain basta digitare `monitoring`. I nodi condividono anche i file con Taildrop e possono esporre servizi HTTP con Serve. Le chiavi dei nodi scadono dopo 180 giorni e richiedono un nuovo login: per server e router conviene disattivare la scadenza dalla console, oppure usare tag che la disattivano di default.

```json
// policy del tailnet: solo i gruppi dichiarati possono raggiungere le subnet,
// gli altri restano fuori perché il default è negare
{
  "groups": {
    "group:dev": ["alice@example.com", "bob@example.com"]
  },
  "grants": [
    {
      "src": ["group:dev"],
      "dst": ["192.0.2.0/24", "198.51.100.0/24", "2001:db8::/32"],
      "ip": ["*:*"]
    }
  ]
}
```

A differenza di un VPN classico, in cui tutto il traffico attraversa un gateway e paga il costo della centralizzazione, in Tailscale ogni coppia di dispositivi ha il proprio percorso. Il caso d'uso del VPN tradizionale resta possibile con gli exit node, che instradano tutto il traffico internet uscente di un device: è la funzione che vedrai nella lezione sugli strumenti.

## Errori comuni

- **Credere che il traffico passi dal servizio di coordinamento**: il coordinamento distribuisce chiavi e policy ma non vede i pacchetti; per questo un tailnet continua a comunicare anche se il servizio è irraggiungibile.
- **Trattare 100.64.0.0/10 come indirizzo pubblico**: è spazio CGNAT usato solo nell'overlay, non si annuncia su internet e non entra in DNAT verso l'esterno.
- **Aprire solo la porta 41641**: il direct è un'ottimizzazione; vanno lasciate raggiungibili `*:443` per coordinamento e DERP, `*:3478/udp` per STUN e privilegiare i nomi DNS rispetto agli IP.
- **Disattivare la scadenza delle chiavi su tutti i dispositivi**: la scadenza è una difesa; va tolta solo su server e connettori fidati, meglio con tag che per scelta manuale.
- **Diagnosticare con `ping` di sistema**: `ping` non dice se il percorso è diretto o in relè; `tailscale ping` e `tailscale status` mostrano il tipo di connessione effettivo.

## In sintesi

Tailscale è un piano di controllo ospitato da Tailscale e un piano dati distribuito su ogni client, con tunnel WireGuard punto-punto e relay DERP come riserva. Il tailnet è l'insieme di dispositivi e utenti; indirizzi CGNAT, MagicDNS e chiavi dei nodi sono gli oggetti che lo tengono insieme. Di default un tailnet senza sezione `acls` o `grants` è permissivo (allow all), e la policy si applica localmente su ogni dispositivo. Comprendere questa separazione rende naturale passare a Headscale, dove lo stesso ruolo di coordinamento lo ricopre un server che gestisci tu.

## Fonti

- Tailscale - What is Tailscale? — https://tailscale.com/docs/concepts/what-is-tailscale
- Tailscale - Control and data planes — https://tailscale.com/docs/concepts/control-data-planes
- Tailscale - Tailscale IP addresses — https://tailscale.com/docs/concepts/tailscale-ip-addresses
- Tailscale - MagicDNS — https://tailscale.com/docs/features/magicdns
- Tailscale - Firewall ports — https://tailscale.com/docs/reference/faq/firewall-ports
