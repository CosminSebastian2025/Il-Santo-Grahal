Un'etichetta MPLS è invisibile a `ping` e a `traceroute` normali: il piano di controllo può funzionare, il piano di forwarding no, e il sintomo arriva all'utente prima che all'operatore. Questa lezione presenta gli strumenti con cui si osserva una rete MPLS — tabelle di inoltro, binding, tunnel, VPN — e le due famiglie di servizi che ne giustificano l'uso ancora oggi: le VPN di livello 3 e il traffic engineering. La sintassi è quella di Cisco IOS/IOS XE; su altre piattaforme cambia la forma, non la logica, e per questo ogni comando va verificato sul documento della propria release.

## Obiettivi

- Leggere una tabella di inoltro etichette e riconoscere push, swap e pop dall'output.
- Verificare binding LDP, sessioni, LSP e raggiungibilità del label.
- Distinguere una VPN L3 in un PE: VRF, RD, route target, MP-BGP e due etichette.
- Usare traceroute e contatori per localizzare un problema nel piano di forwarding.
- Collocare SR e SRv6 rispetto a LDP e RSVP-TE nel ciclo di vita delle reti operative.

## Le tre tabelle da guardare

Su un router MPLS convivono tre strutture che si verificano con comandi diversi: il routing IP, il forwarding etichetta e i binding annunciati ai vicini. Guardarle nell'ordine giusto evita di inseguire il sintomo sbagliato.

```bash
show mpls interfaces detail        # dove MPLS e' attivo e se e' operativo
show mpls ldp neighbor             # sessioni LDP e stato degli annunci
show mpls ldp bindings             # etichette locali e remote per prefisso
show mpls forwarding-table         # come oggi il router inoltra ogni etichetta
show ip cef 192.0.2.0 detail       # l'etichetta associata al prefisso in CEF
```

Il comando più utile nella pratica è `show mpls forwarding-table`: la colonna Local Label dice cosa arriva al router, la Outgoing Label cosa verrà messo sul pacchetto, e `No Label` o `Pop Label` indicano implicit null. Se un router mostra `No Label` dove ci si aspetta un'etichetta, il percorso label switched è interrotto e il pacchetto viaggerà come IP nativo — un disservizio invisibile al ping.

| Output visto | Significato | Verifica successiva |
| --- | --- | --- |
| `Pop Label` | il vicino ha annunciato implicit null | l'egress è il router successivo, nessun errore |
| `No Label` | in uscita non c'è MPLS, il pacchetto va instradato in IP | MPLS abilitato sul link? LDP ha la FEC? |
| `explicit-null` (0) | il pacchetto porta l'etichetta 0 | egress previsto lo gestisce correttamente |
| nessuna riga | il prefisso non è nella tabella etichette | binding LDP, filtro o IGP |

Un errore frequente è confondere `No Label` con `Pop Label`: il primo significa "nessuna MPLS da questo lato", il secondo "il vicino vuole il pop". La differenza cambia la diagnosi: nel primo caso manca un binding o un'interfaccia, nel secondo è tutto corretto.

## Dal binding al LSP: dove si rompe

LDP stabilisce una sessione TCP porta 646 con ciascun vicino e scambia mapping etichetta-FEC. Per capire perché un LSP non si forma, si va dal basso: l'indirizzo del router ID deve essere raggiungibile in IP, la sessione deve essere `Oper`, il binding deve esistere, e la FEC deve essere nell'IGP. Un LSP che "c'è ma non va" suggerisce invece un problema di forwarding, non di controllo.

```bash
show mpls ldp neighbor detail   # router ID remoto, indirizzi, stato
show mpls ldp bindings 192.0.2.0 24
show mpls forwarding-table 192.0.2.0 24
ping mpls ipv4 192.0.2.0/24     # verifica l'LSP end-to-end, non solo l'IP
```

Il `ping mpls` è il test che distingue i due piani: le MPLS echo request viaggiano lungo l'LSP e i router rispondono mostrando le etichette attraversate. Se `ping mpls` fallisce ma `ping` IP passa, il problema è nel mapping o nella tabella di inoltro; se falliscono entrambi, il problema è prima di MPLS.

## VPN L3 e traffic engineering

Le due applicazioni che tengono in vita MPLS hanno strumenti propri. Per una VPN di livello 3 si controlla la VRF sul PE, l'RD, i route target importati ed esportati e le sessioni MP-BGP. Il modello è quello della RFC 4364: il PE scambia con il CE rotte normali, le converte in rotte VPNv4 (prefisso più RD), le annuncia con MP-BGP e le accetta solo dove i route target corrispondono.

```bash
show ip vrf                    # VRF e RD, ma non le rotte
show ip route vrf CLIENTE      # le rotte del cliente nel PE
show bgp vpnv4 unicast         # le rotte VPNv4 ricevute e annunciate
show bgp vrf CLIENTE           # la vista del cliente
```

Per il traffic engineering gli strumenti sono i tunnel RSVP-TE e le informazioni della coda.

```bash
show mpls traffic-eng tunnels
show mpls traffic-eng tunnels brief
show ip rsvp interface
```

L'estensione RSVP per i tunnel (RFC 3209) riserva banda e può deviare un LSP da un link in congestione. MPLS Transport Profile (RFC 5960) ha portato la stessa idea ai tunnel di trasporto, con caratteristiche di OAM e protezione tipiche del TDM, ed è ancora usato in reti di trasporto. Nel frattempo molti operatori nuovi scelgono segment routing (SR-MPLS, RFC 8402), in cui l'ingress impone la lista dei nodi o dei link da attraversare e il core non deve distribuire un'etichetta per ogni prefisso.

La migrazione a SR anche nelle reti esistenti procede per gradi: una fase in cui LDP e SR coesistono sullo stesso hardware, una in cui il core passa a SR e una in cui LDP resta solo dove serve interoperabilità. Verificare la coerenza tra queste fasi significa controllare che le etichette di nodo siano annunciate, che i binding LDP non siano prematuramente rimossi e che le VPN continuino a funzionare mentre il piano cambia sotto: è il tipo di lavoro in cui il controllo del piano di forwarding separato dal piano di controllo diventa indispensabile.

| Tecnologia | Piano di controllo | Attribuzione del percorso | Stato nel 2020-2026 |
| --- | --- | --- | --- |
| MPLS LDP | LDP per prefisso IGP | hop-by-hop | matura, diffusa |
| MPLS TE | RSVP-TE con riserva | esplicito dall'ingress | diffusa, più complessa |
| SR-MPLS | IGP distribuisce prefissi e label di nodo o link | lista di segmenti | in crescita nelle reti nuove |
| MPLS-TP | configurato o GMPLS | statico o pianificato | reti di trasporto |

## Errori comuni

- **Verificare MPLS solo con `ping` e `traceroute`**: entrambi usano il piano IP o l'ICMP e non mostrano l'etichetta; serve `ping mpls` e la tabella di inoltro.
- **Leggere `No Label` come pop**: le due voci descrivono cose opposte, e scambiarle manda la diagnosi nella direzione sbagliata.
- **Debuggare la VPN sul P**: i router di transito non hanno VRF né rotte VPNv4; la verifica sta sui PE e sui CE.
- **Confondere RD con route target**: l'RD rende univoco il prefisso, il route target decide chi lo importa; sono campi separati.
- **Ridurre SR a "MPLS nuovo"**: SR cambia il modello di controllo del percorso e non richiede LDP; una migrazione richiede un piano, non un semplice comando.

## In sintesi

La diagnosi MPLS si fa su tre livelli: binding LDP, tabella di inoltro, piano IP sottostante. `ping mpls` separa il piano di controllo da quello di forwarding meglio di qualsiasi comando statico. Le VPN L3 usano VRF, RD, route target e MP-BGP, e si controllano sui PE. Il traffic engineering usa RSVP-TE, mentre SR-MPLS è il percorso verso cui va la maggior parte delle reti nuove.

## Fonti

- RFC 3031 — Multiprotocol Label Switching Architecture: https://www.rfc-editor.org/rfc/rfc3031.html
- RFC 4364 — BGP/MPLS IP Virtual Private Networks (VPNs): https://www.rfc-editor.org/rfc/rfc4364.html
- RFC 3209 — RSVP-TE: Extensions to RSVP for LSP Tunnels: https://www.rfc-editor.org/rfc/rfc3209.html
- RFC 8402 — Segment Routing Architecture: https://www.rfc-editor.org/rfc/rfc8402.html
- Cisco — MPLS Layer 3 VPN: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/mpls/mpls-configuration-guide/mpls-layer-3-vpn.html
