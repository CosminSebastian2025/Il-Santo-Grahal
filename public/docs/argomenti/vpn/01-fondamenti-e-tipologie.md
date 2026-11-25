Una VPN, Virtual Private Network, è un accordo tra due punti per far viaggiare il traffico dentro un involucro protetto su una rete che non controlliamo. L'involucro nasconde il contenuto e spesso anche la struttura degli indirizzi interni. Questa prima lezione chiarisce cosa una VPN fa davvero, cosa non fa, e come si distinguono le due famiglie principali: site-to-site e remote access.

## Obiettivi

- Distinguere il piano di controllo (autenticazione e chiavi) dal piano dati (cifratura del traffico).
- Riconoscere quando serve una VPN site-to-site e quando un accesso remoto.
- Capire incapsulamento, overlay e routing: cosa vede la rete sottostante.
- Scegliere tra IPsec, WireGuard, OpenVPN e VPN overlay in base ai requisiti.
- Evitare di confondere una VPN con TLS, SSH o un proxy anonimo.

## Due piani: controllo e dati

Ogni VPN moderna ha una fase di negoziazione e una fase di trasporto. Nella prima le parti si autenticano, concordano algoritmi e derivano chiavi; nella seconda i pacchetti utente vengono cifrati, autenticati e incapsulati. Le due fasi possono usare protocolli diversi: IPsec usa IKEv2 per il controllo e ESP per i dati, WireGuard usa lo stesso pacchetto Noise per entrambi, OpenVPN usa TLS sul canale di controllo e una cifratura simmetrica con HMAC sul canale dati.

| Piano | Cosa succede | Esempi |
| --- | --- | --- |
| Controllo | identità, chiavi, algoritmi, rinegoziazione | IKEv2, TLS handshake, Noise IK |
| Dati | cifratura e integrità dei pacchetti | ESP, WireGuard Data, OpenVPN data channel |
| Incapsulamento | trasporto dei pacchetti interni sulla rete reale | UDP 500/4500, UDP 51820, UDP 1194 |

## Site-to-site e remote access

Nella VPN **site-to-site** due gateway si parlano tra loro e i dispositivi dietro ciascuno non sanno di usare una VPN. Le rotte verso la sottorete remota sono configurate sugli apparati o distribuite da un protocollo di routing, e ogni host raggiunge l'altra sede usando il proprio default gateway. Serve stabilità: le due estremità sono apparati, non persone, e il tunnel resta su anche quando nessuno lo usa.

Nella VPN **remote access** un singolo dispositivo si collega a un concentratore per accedere alla rete aziendale. Cambia il modello di fiducia: molti client, un'identità ciascuno, e policy che decidono cosa vede ogni utente o gruppo.

| Aspetto | Site-to-site | Remote access |
| --- | --- | --- |
| Estremità | due gateway | molti client, un concentratore |
| Configurazione | statica, gestita dagli amministratori | per utente o profilo, distribuita |
| Routing | rotte tra sottoreti | assegnazione di indirizzo e rotte al client |
| Split tunneling | rotte verso le sottoreti remote | opzionale, scelta di policy |
| Idoneità | sedi, cloud, data center | smart working, amministrazione |

Il termine "split tunneling" descrive il caso in cui solo il traffico verso le reti aziendali entra nel tunnel e il resto esce dalla connessione locale. Riduce il carico sul concentratore, ma rende il dispositivo simultaneamente dentro e fuori il perimetro: va deciso come policy, non lasciato al caso. Un "full tunnel" instrada tutto, compresi gli aggiornamenti e il backup cloud, dentro la VPN.

## Incapsulamento, overlay e NAT

Una VPN aggiunge un livello di incapsulamento: il pacchetto interno diventa il carico utile di un pacchetto esterno, e la MTU utile si riduce. Con più livelli (per esempio VPN, poi GRE, poi PPPoE) il rischio di frammentazione cresce.

Le VPN overlay (Tailscale, NetBird, Headscale) spostano il problema: ogni host riceve un indirizzo da una rete virtuale e i nodi parlano tra loro in cifrato in stile mesh, con la segnalazione affidata a un piano di controllo centralizzato. Il routing tra subnet esistenti diventa una configurazione esplicita ("subnet router").

## Famiglie di protocolli

| Protocollo | Trasporto | Punti di forza | Limiti da conoscere |
| --- | --- | --- | --- |
| IPsec/IKEv2 | UDP 500, 4500 (ESP) o IP proto 50 | standard IETF, integrazione con router e firewall aziendali | configurazione complessa, interoperabilità tra vendor da verificare |
| WireGuard | UDP (di solito 51820) | codice compatto, prestazioni alte, roaming integrato | nessuna gestione dinamica delle chiavi o degli indirizzi, serve tooling esterno |
| OpenVPN | UDP 1194 o TCP 443 | maturità, attraversamento di reti restrittive | prestazioni inferiori, stack utente |
| VPN overlay | varia, spesso WireGuard | semplicità, NAT traversal, ACL per identità | dipendenza da un piano di controllo cloud o self-hosted |

La scelta dipende da minaccia, apparati esistenti, competenze per gestire le chiavi e requisiti di audit.

## Cosa una VPN non fa

Una VPN non sostituisce TLS: protegge il percorso tra le due estremità, ma non la connessione applicativa. Non rende anonimi nel senso in cui lo intende il marketing: il fornitore della VPN o il concentratore aziendale vede sorgente, destinazione, volumi e tempi. Non gestisce l'autorizzazione applicativa: un utente nel tunnel può ancora raggiungere un servizio che non dovrebbe vedere, a meno che esistano ACL o firewall tra le zone.

## Errori comuni

- **Considerare la VPN una barriera perimetrale completa**: un tunnel autentica il punto di ingresso, non le azioni dell'utente; servono segmentazione e regole per servizio.
- **Dimenticare la MTU**: TCP si adatta con il MSS clamping, UDP e ICMP con DF no, e i sintomi sono connessioni che si bloccano dopo il primo pacchetto grande.
- **Lasciare il full tunnel per default senza misurarlo**: il concentratore diventa il collo di bottiglia e gli utenti lo percepiscono come una rete lenta.
- **Confondere tunneling e crittografia**: GRE incapsula ma non cifra; un tunnel GRE nudo espone il traffico interno.
- **Gestire le chiavi a mano in tutti i casi**: senza scadenze, revoca e rotazione documentate, la VPN invecchia come un accesso privilegiato permanente.

## In sintesi

- Una VPN unisce due piani: controllo (identità e chiavi) e dati (cifratura e integrità).
- Site-to-site collega reti, remote access collega persone: policy e gestione delle chiavi cambiano di conseguenza.
- L'incapsulamento cambia la MTU e il routing visto dagli host: progettali insieme ai tunnel.
- IPsec, WireGuard, OpenVPN e overlay non competono solo sulle prestazioni, ma su apparati, chiavi e audit.
- La VPN è un trasporto sicuro, non un'autorizzazione applicativa né una promessa di anonimato.

## Fonti

- [RFC 4301 — Security Architecture for IP](https://www.rfc-editor.org/rfc/rfc4301)
- [WireGuard Protocol](https://www.wireguard.com/protocol/)
- [OpenVPN Community — How-To](https://openvpn.net/community-resources/how-to/)
- [Microsoft — VPN overview (Windows Server)](https://learn.microsoft.com/en-us/windows-server/remote/remote-access/vpn/vpn-top)
- [Tailscale — What is Tailscale](https://tailscale.com/kb/1151/what-is-tailscale)
