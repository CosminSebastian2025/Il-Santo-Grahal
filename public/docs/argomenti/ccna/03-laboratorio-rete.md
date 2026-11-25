Questo laboratorio non insegna comandi: insegna a prepararsi al CCNA con una macchina, un file di piano e qualche calcolo. Gli esercizi sono scelti perché ogni risposta sia verificabile senza guardare soluzioni, usando la logica di indirizzamento, aritmetica binaria e piccole automazioni. Se non hai un simulatore a portata di mano, i primi esercizi funzionano con carta, penna e un terminale.

## Obiettivi

- Calcolare sottoreti e verificarle con uno script riproducibile.
- Derivare dalle maschere la rete, il broadcast e l'intervallo degli host.
- Progettare una check-list di verifica per un lab di rete.
- Stimare la durata di un programma di studio dal numero di competenze.
- Registrare l'esito degli esercizi in un formato confrontabile nel tempo.

## Esercizi

1. **Subnetting verificato.** Dato `192.168.10.0/26`, scrivi rete, primo host, ultimo host e broadcast di ogni sottorete, poi verifica il risultato con lo script qui sotto cambiando il prefisso tra `/25`, `/26` e `/27`.

```bash
python3 - <<'PY'
import ipaddress
base = ipaddress.ip_network("192.168.10.0/26")
for s in base.subnets(new_prefix=26):
    # primo e ultimo host utile della sottorete, escludendo rete e broadcast
    print(s, s[1], s[-2], s.broadcast_address)
PY
```

2. **Maschera e piano di indirizzi.** Hai tre VLAN con 60, 25 e 10 host su un blocco `10.0.0.0/24`. Assegna a ogni VLAN una sottorete con spazio libero, scrivendo per ognuna la maschera in decimale puntato e la capacità utile.

3. **Registro dei lab.** Progetta una riga CSV con i campi necessari a un lab di switching e spiega perché non hai messo il campo "voto". Genera poi con un filtro la lista dei lab le cui porte sono state annotate in modo incompleto.

4. **Conteggio delle competenze.** Prendi sei obiettivi dal documento ufficiale degli obiettivi del CCNA, assegna a ciascuno un costo di verifica basso, medio o alto e produci un ordine di studio che rispetti le dipendenze.

5. **Calendario di rinnovo.** La certificazione dura tre anni e il rinnovo richiede 30 crediti di Continuing Education. Distribuisci i crediti in un calendario trimestrale sostenibile e annota come verificherai l'avanzamento.

6. **Lettura di un output.** Ti viene consegnato l'output di una tabella di routing con due reti collegate direttamente e due statiche. Scrivi tre domande di verifica la cui risposta sia contenuta nell'output e una a cui l'output non può rispondere.

<details>
<summary>Soluzione</summary>

1. Con `/26` ogni sottorete ha 64 indirizzi, quindi 62 host utili: `.0` rete e `.63` broadcast, `.64`/`.127`, `.128`/`.191`, `.192`/`.255`. Con `/27` le sottoreti sono otto da 32 indirizzi; con `/25` due da 128. Lo script conferma gli indirizzi di rete e broadcast: confronta i valori stampati con quelli calcolati a mano e correggi l'aritmetica finché combaciano.

2. 60 host richiedono almeno 64 indirizzi, quindi una maschera `/26` (`255.255.255.192`); 25 host richiedono `/27` (`255.255.255.224`); 10 host richiedono `/28` (`255.255.255.240`). Su `10.0.0.0/24` puoi usare `10.0.0.0/26`, `10.0.0.64/27` e `10.0.0.96/28`, lasciando il resto libero per crescita e per i link di transito.

3. Campi utili: identificativo, data, obiettivo del blueprint, topologia con porte, soglia di successo, esito, errori incontrati, prossimo ripasso. "Voto" non serve perché il CCNA è superato/non superato e un punteggio inventato falsa il confronto nel tempo. Il filtro cerca le righe con topologia vuota o senza numero di porta.

4. Esempio di ordine: indirizzamento, poi configurazione degli indirizzi, poi VLAN e trunk, poi routing statico, poi routing dinamico, poi ACL. Il criterio è che nessun obiettivo con costo alto venga prima del suo prerequisito, anche se nel blueprint compare prima.

5. Quattro trimestri da circa 8 crediti sono più realistici di 30 crediti in un mese. Registra data, attività, crediti e prova di completamento; l'avanzamento si verifica sul conto dei crediti del portale Cisco, non sulle tue note.

6. Domande rispondibili: quali reti sono collegate direttamente e quali apprese; quale via è la preferita per una destinazione; qual è la distanza amministrativa delle rotte statiche. Domanda non rispondibile: quale interfaccia ha il percorso fisico, perché la tabella descrive decisioni di inoltro, non la topologia.

</details>

## Progetto: un piano di studio verificabile

Il progetto unisce gli esercizi in un unico artefatto. Il piano è un file CSV leggibile, accompagnato da un piccolo controllo che segnala le righe incomplete.

```text
settimana;dominio;obiettivo;costo;lab;esito
1;indirizzamento;subnetting /26;basso;1;ok
2;accesso;VLAN e trunk;medio;2;da fare
3;connettivita IP;routing statico;medio;3;da fare
```

Il campo `lab` è il legame con il registro dei laboratori, mentre `dominio` e `costo` ricalcano la tabella della seconda lezione. Un obiettivo non è chiuso finché non ha un lab superato con esito `ok`. Per generare un promemoria delle righe aperte è sufficiente un filtro:

```bash
awk -F';' 'NR>1 && $6!="ok" {printf "settimana %s: %s (%s)\n", $1, $3, $6}' piano.csv
```

Un piano senza verifica si trasforma in una lista di desideri; il filtro trasforma ogni riga in una decisione per la settimana corrente. Aggiungi una riga solo quando il lab è pronto, così la stima delle settimane resta fedele alla realtà.

## Criterio di uscita

Hai finito questo laboratorio quando sai eseguire senza appunti tre operazioni: calcolare le sottoreti di un blocco `/26`, spiegare la differenza tra rete e broadcast di una sottorete, e generare dal CSV la lista delle cose da ripassare. Le tre operazioni coprono la parte più frequentemente sbagliata del programma, l'indirizzamento, e la parte più frequentemente trascurata, il registro del progresso.

## Errori comuni

- **Confondere l'indirizzo di rete con il primo host utile**: in una `/26` il primo host è `.1`, non `.0`, e l'ultimo è `.62`.
- **Usare un blocco intero per la rete di gestione**: l'indirizzo assegnato a un'interfaccia non deve coincidere con quello di rete o di broadcast.
- **Salvare il CSV senza intestazione**: i filtri funzionano solo se le colonne hanno un nome stabile.
- **Segnare una settimana completata senza aver eseguito il lab**: la verifica parte dall'esito del lab, non dall'aver visto l'argomento.
- **Verificare con uno script senza aver calcolato a mano**: il confronto ha senso solo tra due risultati indipendenti.

## In sintesi

Gli esercizi del CCNA sono verifiche di modelli, non quiz di comandi. Il subnetting si verifica calcolando a mano e confrontando con uno script. Il registro dei lab e il piano settimanale formano un unico sistema di controllo del progresso. Il criterio di uscita è l'autonomia su indirizzamento e revisione.

## Fonti

- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
- Configure IP Addresses and Unique Subnets — https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html
- CCNA Certification and Training — https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html
- Python: ipaddress — https://docs.python.org/3/library/ipaddress.html
- RFC 1918 (Address Allocation for Private Internets) — https://www.rfc-editor.org/rfc/rfc1918.html
