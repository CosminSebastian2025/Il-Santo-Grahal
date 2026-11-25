In questo laboratorio costruisci `vpn-check`, uno script che verifica in modo ripetibile lo stato di un tunnel WireGuard: handshake, rotte verso la rete remota e disponibilità dei servizi attesi. Serve quando un collega dice "la VPN non va" e bisogna trasformare la frase in controlli con esito.

## Obiettivi

- Tradurre un contratto di servizio VPN in asserzioni verificabili.
- Leggere handshake e contatori con `wg show`, sapendo quali controlli richiedono privilegi.
- Controllare rotte e raggiungibilità distinguendo ICMP da TCP.
- Fermarsi al primo fallimento utile e restituire un codice di uscita coerente.
- Documentare i controlli in un formato leggibile da un altro turno di guardia.

## Il contratto di `vpn-check`

I controlli sono cinque, nello stesso ordine, così che un esito `FAIL 3` dica qualcosa di preciso.

| Codice | Controllo | Criterio di successo |
| --- | --- | --- |
| `00` | il comando `wg` esiste | binario trovato nel `PATH` |
| `01` | interfaccia `wg0` presente | compare in `ip link` |
| `02` | handshake recente | `latest handshake` <= 180 s |
| `03` | rotta verso la rete remota | `ip route get` usa `wg0` |
| `04` | servizio remoto raggiungibile | porta TCP aperta in <= 3 s |

```bash
#!/usr/bin/env bash
set -euo pipefail

IFACE="${IFACE:-wg0}"
REMOTE_NET="${REMOTE_NET:-10.20.0.0/24}"
PROBE_HOST="${PROBE_HOST:-10.20.0.5}"
PROBE_PORT="${PROBE_PORT:-443}"
MAX_AGE="${MAX_AGE:-180}"

fail() { printf 'FAIL %s: %s\n' "$1" "$2" >&2; exit 1; }
command -v wg >/dev/null 2>&1 || fail 00 "wg non installato"

ip link show "$IFACE" >/dev/null 2>&1 || fail 01 "interfaccia $IFACE assente"
```

`fail` stampa un codice e un messaggio su stderr ed esce con codice non zero, così lo script è utilizzabile in una pipeline CI.

## Handshake e rotte

L'ultimo handshake viene letto da `wg show` e confrontato con l'orologio locale: senza handshake il problema è di negoziazione.

```bash
ultimo=$(wg show "$IFACE" latest-handshakes | awk '{print $2}' | sort -n | tail -1)
[ -n "$ultimo" ] || fail 02 "nessun handshake registrato"
ora=$(date +%s)
eta=$(( ora - ultimo ))
[ "$eta" -le "$MAX_AGE" ] || fail 02 "ultimo handshake ${eta}s fa (limite ${MAX_AGE}s)"
```

Per la rotta si chiede al kernel quale interfaccia userebbe: se il `dev` non è quello del tunnel, esiste una rotta più specifica e i pacchetti escono altrove.

```bash
ip route get "$PROBE_HOST" | grep -q "dev $IFACE" \
  || fail 03 "il traffico verso $PROBE_HOST non usa $IFACE"
```

Un controllo sulla rete intera invece di un singolo host trova i casi di split tunneling incompleto, in cui alcune sottoreti passano nel tunnel e altre no. Più host di prova restituiscono anche una stima di copertura.

## Verifica dei servizi e orchestrazione

ICMP è un indicatore debole: molti firewall lo scartano mentre il servizio funziona. Il controllo finale apre una connessione TCP con timeout breve.

```bash
timeout 3 bash -c "exec 3<>/dev/tcp/${PROBE_HOST}/${PROBE_PORT}" 2>/dev/null \
  || fail 04 "porta ${PROBE_PORT} non raggiungibile su ${PROBE_HOST}"

printf 'OK %s handshake=%ss\n' "$IFACE" "$eta"
```

In uso interattivo conviene non fermarsi al primo errore: il contatore dei fallimenti decide l'exit code e l'operatore vede lo stato complessivo.

```bash
esegui() { # $1 = predicato (funzione che ritorna 0 se ok), $2 = descrizione
  if "$1" >/dev/null 2>/tmp/vpn-check.err; then
    printf '[ok] %s\n' "$2"
  else
    printf '[ko] %s -> %s\n' "$2" "$(cat /tmp/vpn-check.err)"
    esiti=$((esiti + 1))
  fi
}

esiti=0
esegui ctrl_wg        "wg presente"
esegui ctrl_iface     "interfaccia ${IFACE}"
esegui ctrl_handshake "handshake < ${MAX_AGE}s"
esegui ctrl_rotta     "rotta ${REMOTE_NET} via ${IFACE}"
esegui ctrl_servizio  "tcp ${PROBE_HOST}:${PROBE_PORT}"

[ "$esiti" -eq 0 ] || exit 1
```

I predicati come `ctrl_rotta` scrivono la causa su stderr e ritornano un exit code: `esegui` mostra il messaggio solo in caso di errore. La CI guarda il codice, il turno di guardia legge le righe.

## Esercizi

1. Aggiungi un controllo sul resolver DNS del dominio interno, con un avviso se manca.
2. Misura la MTU del tunnel con `ping -M do` e avvisa se scende sotto 1300 byte.
3. Confronta `transfer received` e `sent` e segnala una direzione ferma da più di un minuto.
4. Supporta più interfacce, con handshake e rotta coperta per ciascuna.
5. Scrivi i risultati in JSON con campi stabili e un test che ne verifichi l'ordine.
6. Rendi il codice di uscita progressivo e spiega perché in guardia conviene il primo errore.

<details>
<summary>Soluzione</summary>

1. Si legge `resolv.conf` dell'interfaccia o, se gestito da systemd-resolved, l'output del dominio associato (`resolvectl domain`); il controllo fallisce se il resolver del tunnel non compare tra quelli per il dominio interno.

2. Un ciclo riduce la dimensione fino a trovare il massimo non frammentato e converte in MTU sommando il sovraccarico dell'incapsulamento; sotto la soglia minima lo script esce con avviso invece di fallire, perché la rete può funzionare comunque.

3. `wg show "$IFACE" transfer` restituisce due numeri per peer: una snapshot ogni 60 secondi confrontata con la precedente distingue l'inattività reale dai keepalive, che muovono pochi byte.

4. Si itera su una lista di interfacce e si raccolgono gli esiti in un array associativo; la stampa finale mostra una riga per interfaccia con handshake e numero di sottoreti coperte.

5. Un formato come `{"iface":"wg0","checks":[{"code":"02","ok":true}]}` è comodo per `jq`; il test confronta l'intera stringa dopo aver normalizzato i tempi, che cambiano a ogni esecuzione.

6. Il primo errore utile identifica la causa a monte e le verifiche successive sarebbero fuorvianti; in modalità interattiva invece tutti i controlli hanno valore diagnostico.

</details>

## Errori comuni

- **Eseguire `wg show` senza permessi e ignorare l'errore**: l'output vuoto viene letto come "nessun handshake" e si diagnostica una causa che non esiste.
- **Considerare `ping` riuscito come prova che la VPN funziona**: ICMP ha code path e filtri diversi dal traffico reale.
- **Usare `date` del tunnel invece dell'orologio locale**: gli orari dei due lati non sono confrontabili.
- **Rotta verificata solo verso un host**: la sottorete può passare in parte nel tunnel e in parte no, e il campione deve coprirla.
- **Exit code sempre zero**: un controllo che non segnala il fallimento è peggio di nessun controllo.

## In sintesi

- Un contratto di controlli numerati trasforma "la VPN non va" in un esito preciso.
- Handshake, rotta e servizio sono tre verifiche indipendenti e vanno fatte in quest'ordine.
- `ip route get` è più affidabile di `ping` per capire dove esce il traffico.
- Le soglie (180 s, 3 s) sono parametri: renderle esplicite aiuta chi è di turno.
- Lo stesso script deve funzionare in modalità silenziosa per la CI e dettagliata per l'operatore.

## Fonti

- [Manual page — wg(8)](https://man7.org/linux/man-pages/man8/wg.8.html)
- [Manual page — ip(8)](https://man7.org/linux/man-pages/man8/ip.8.html)
- [WireGuard — Quick Start](https://www.wireguard.com/quickstart/)
- [OpenWrt — WireGuard](https://openwrt.org/docs/guide-user/network/wireguard/start)
