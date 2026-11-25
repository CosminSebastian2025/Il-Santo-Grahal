Un tunnel IPsec è composto da due SA per direzione, policy che selezionano il traffico e una negoziazione IKEv2 che rinnova tutto periodicamente. Questa lezione si concentra su come si configura e si verifica un tunnel site-to-site con strongSwan, cioè su file, comandi e stato osservabile, senza dare per scontato che la negoziazione sia autosufficiente.

## Obiettivi

- Leggere una configurazione `swanctl` con intestazioni `connections` e `children`.
- Scegliere proposte IKEv2 e ESP coerenti con le linee guida aggiornate.
- Usare certificati o PSK sapendo quali limiti impongono.
- Verificare SA, policy e contatori di un tunnel attivo.
- Distinguere un tunnel basato su policy da uno basato su rotte.

## Anatomia di un file di configurazione

strongSwan moderno si configura con `swanctl.conf`. Una `connection` raggruppa i parametri del piano di controllo (indirizzi, identità, proposte, autenticazione); una `children` descrive le SA dati, con i selector locali e remoti e le proposte ESP.

```text
# /etc/swanctl/conf.d/site2site.conf (estratto, sintassi swanctl)
connections {
  sede-b {
    version = 2
    local_addrs  = 203.0.113.10
    remote_addrs = 198.51.100.20
    local {
      auth = pubkey
      certs = gw-a.pem
      id = gw-a.example.net
    }
    remote {
      auth = pubkey
      id = gw-b.example.net
    }
    proposals = aes256gcm16-prfsha256-modp2048
    children {
      lan-b {
        local_ts  = 10.1.0.0/24
        remote_ts = 10.2.0.0/24
        esp_proposals = aes256gcm16-modp2048
        dpd_action = restart
      }
    }
  }
}
```

Le identità `local.id` e `remote.id` devono corrispondere a ciò che l'altro lato presenta nel certificato, altrimenti IKE_AUTH fallisce. Se l'indirizzo del peer non è noto, `remote_addrs` può essere `%any` e l'autenticazione diventa l'unico elemento discriminante.

| Elemento | Significato | Errore tipico |
| --- | --- | --- |
| `version = 2` | IKEv2 | peer configurato per IKEv1 |
| `proposals` | algoritmi IKE | DH group incompatibile |
| `children.local_ts` | sottorete da proteggere | sottoreti speculari invertite |
| `esp_proposals` | algoritmi dati | AES-GCM con gruppo DH assente dall'altro lato |
| `dpd_action` | reazione alla perdita del peer | tunnel "su" ma morto fino al rekey |

## Algoritmi e identità

Le proposte devono seguire le raccomandazioni attuali: RFC 8247 aggiorna i requisiti per IKEv2 e RFC 4835 quelli per ESP e AH, indicando AES con GCM o CBC e SHA-2, ed evitando DES, 3DES e MD5 fuori dai casi legacy.

```bash
# Legge le proposte caricate: con AES-GCM il campo integrità dell'ESP non serve, GCM autentica già il payload
sudo swanctl --list-conns | grep -A3 'sede-b'
```

Per l'autenticazione il certificato è la scelta preferita in produzione: consente revoca, identità per host e scadenze controllabili. La PSK è semplice ma inevitabilmente condivisa e difficile da ruotare; va confinata a laboratori o a casi senza PKI, con una chiave casuale lunga, mai riutilizzata tra tunnel e sostituita secondo una procedura scritta. Quando le identità sono molte e le policy cambiano per gruppo, conviene una CA dedicata al profilo VPN, separata da quella dei servizi web: la revoca di un gateway non deve toccare i certificati applicativi.

## Verifica dello stato

Lo stato si legge in due livelli: swanctl riporta la negoziazione e le SA create, il kernel mostra cosa è effettivamente installato con le policy.

```bash
sudo swanctl --list-sas          # IKE SA e child SA con SPIs e byte conteggiati
sudo ip xfrm policy list         # dir out/in: selector e livello (tunnel/transport)
sudo ip xfrm state list          # algoritmi e chiavi installati
```

Se `--list-sas` mostra una IKE SA e nessuna child SA, il problema è quasi sempre nei selector: i due lati hanno `local_ts` e `remote_ts` che non corrispondono. Se la child SA c'è e i contatori crescono solo in una direzione, la direzione di ritorno è scartata da routing o da una policy in conflitto.

Con `--list-sas` è utile guardare anche i tempi: `rekey` e `reauth` indicano quando IKE rinnova le SA, e un intervallo molto corto significa che il rinnovo fallisce di continuo e il tunnel resta su solo grazie al traffico in corso. Un log puntuale su `charon` con privilegi di debug aiuta a vedere il motivo del rinnovo fallito.

## Policy e rotte

Esistono due modelli. Nel modello classico una policy xfrm intercetta il pacchetto che corrisponde al selector e lo incapsula, senza bisogno di una rotta del tunnel. Nel modello **route-based** si crea un'interfaccia di tunnel (XFRM o VTI su Linux) e si mettono le rotte su quell'interfaccia, come per GRE o WireGuard: semplifica il routing dinamico.

| Modello | Come si instrada | Uso |
| --- | --- | --- |
| policy-based | la policy del selector decide | site-to-site classico, interoperabilità |
| route-based | rotta verso una periferica di tunnel | routing dinamico, più subnet, firewall su interfaccia |

In policy-based il traffico "viene preso" da una regola, in route-based "va" verso un dispositivo; se i selector e le rotte non sono coerenti, i due modelli possono generare loop.

## Errori comuni

- **Selector speculari sbagliati**: `local_ts` a sinistra e `remote_ts` a destra devono descrivere la propria rete e quella remota, non il contrario.
- **Proporre algoritmi non negoziabili**: un DH group che un lato non supporta fa fallire IKE_SA_INIT prima ancora dell'autenticazione.
- **Identità diverse dal certificato**: `id` deve corrispondere a un SAN o al CN che il peer presenta, altrimenti l'autenticazione cade.
- **PSK riutilizzata tra più tunnel**: una singola PSK compromessa espone tutti i tunnel che la condividono e non consente audit per dispositivo.
- **Guardare solo lo stato IKE**: senza controllare `ip xfrm` non sai se le policy sono installate e se il traffico è davvero protetto.

## In sintesi

- `swanctl.conf` separa il piano di controllo (`connections`) dai dati (`children`).
- Le proposte IKEv2 e ESP devono essere compatibili e moderne: AES-GCM, SHA-2 e gruppi DH adeguati.
- Certificati per la produzione, PSK solo con vincoli espliciti e rotazione.
- La verifica passa da `swanctl --list-sas` e `ip xfrm policy list`, in quest'ordine.
- Policy-based e route-based sono due modelli di instradamento, non due versioni del protocollo.

## Fonti

- [strongSwan — swanctl.conf](https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html)
- [strongSwan — IKEv2 configuration](https://docs.strongswan.org/docs/latest/config/IKEv2.html)
- [RFC 8247 — Algorithm requirements for IKEv2](https://www.rfc-editor.org/rfc/rfc8247)
- [RFC 4835 — Algorithm requirements for ESP and AH](https://www.rfc-editor.org/rfc/rfc4835)
- [pfSense — IPsec](https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/index.html)
