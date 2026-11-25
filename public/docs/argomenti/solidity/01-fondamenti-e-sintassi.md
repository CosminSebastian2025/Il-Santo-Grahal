Solidity è un linguaggio compilato, statico e orientato ai contratti che gira sulla Ethereum Virtual Machine (EVM). Un contratto è insieme codice e stato persistente: una volta distribuito su chain non si modifica, e ogni scrittura costa gas, cioè denaro reale. Per questo la sintassi è solo la parte visibile di un modello di esecuzione in cui visibilità, tipi di indirizzo e ordine delle operazioni contano quanto la logica. In questa lezione impari la sintassi di base e le regole che rendono un contratto leggibile e sicuro.

## Obiettivi

- Riconoscere la struttura di un contratto: stato, funzioni, modificatori, eventi ed errori.
- Distinguere `memory`, `storage` e `calldata` e capire quando una copia costa gas.
- Usare i tipi di indirizzo `address` e `address payable`, le unità `wei`/`ether` e il tempo.
- Gestire la visibilità con `public`, `external`, `internal` e `private`.
- Applicare il pattern checks-effects-interactions contro la reentrancy.

## Struttura di un contratto

Un file Solidity inizia con la direttiva `pragma` che fissa la versione del compilatore, poi dichiara contratti con stato, costruttore, funzioni ed eventi. Il tipo `uint256` è senza segno e a 256 bit, `address` porta 20 byte, e `mapping` è una tabella hash in cui ogni chiave assente vale zero.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Contatore {
    uint256 public totale;              // stato persistente, getter generato
    mapping(address => uint256) public saldi; // chiave assente => 0

    event Incremento(address chi, uint256 nuovo); // log, non stato
    error SuperatoLimite(uint256 richiesto);

    constructor(uint256 iniziale) {
        totale = iniziale;
    }

    function incrementa(uint256 q) public returns (uint256) {
        if (totale + q > 1_000_000) revert SuperatoLimite(q); // errore custom
        totale += q;
        saldi[msg.sender] += q;
        emit Incremento(msg.sender, totale);
        return totale;
    }
}
```

Dal compilatore 0.8 l'aritmetica intera controlla l'overflow e fa revert automaticamente con `Panic(0x11)`, quindi `totale + q` non può avvolgere il contatore. Gli errori custom con `error` e `revert` costano meno di una stringa di messaggio e rendono l'ABI più leggibile.

| Elemento | Sintassi | Nota |
| --- | --- | --- |
| stato | `uint256 public x;` | occupa un slot di storage |
| costante | `uint256 constant K = 7;` | non occupa storage |
| immutabile | `address immutable owner;` | impostato nel costruttore |
| funzione | `function f() external returns (uint256)` | parametri e ritorno tipizzati |
| modifica di stato | `function f() internal` | chiamabile solo internamente |
| evento | `event E(address a);` | scrive nei log |

`public` su una variabile crea un getter, `constant` non viene salvato su chain e `immutable` si risolve a compile time dopo il costruttore: entrambi risparmiano gas sulle letture.

## Tipi di indirizzo e unità

`address` identifica un account o un altro contratto; `address payable` aggiunge `transfer` e `send`, ma oggi si preferisce inviare con `call`. Le unità naturali `wei`, `gwei` ed `ether` sono multipli di `1e18` rispettivamente, e `block.timestamp` misura il tempo in secondi.

```solidity
function paga(address payable destino) external payable {
    require(msg.value >= 1 ether, "importo insufficiente"); // 1e18 wei
    (bool ok, ) = destino.call{value: msg.value}("");
    require(ok, "trasferimento fallito"); // call ritorna false, non fa revert
}
```

`call` restituisce un booleano: se non lo controlli, il trasferimento può fallire in silenzio. `block.timestamp` serve per scadenze coerenti ma non per casualità, perché il validatore può influenzarlo entro un piccolo intervallo.

## Memoria, storage e calldata

Ogni variabile complessa ha una locazione dati. `storage` punta allo stato persistente ed è costosa in scrittura, `memory` è una copia locale che sparisce a fine chiamata, `calldata` è l'input non modificabile dell'esterno.

```solidity
struct Nota { address autore; string testo; }

mapping(uint256 => Nota) private note; // nel contratto

function leggi(uint256 id) external view returns (string memory) {
    Nota storage n = note[id];  // riferimento, nessuna copia
    return n.testo;             // copia in memory per il ritorno
}

function sommaCalldata(uint256[] calldata valori) external pure returns (uint256 s) {
    for (uint256 i = 0; i < valori.length; ++i) {
        s += valori[i]; // nessun overflow: i controlli di 0.8 sono attivi
    }
}
```

Passare un array come `memory` in una funzione `external` lo copia e costa gas; `calldata` evita la copia ma non permette modifiche. `view` promette di non scrivere lo stato, `pure` promette di non leggerlo.

## Sicurezza di base: checks-effects-interactions

La reentrancy sfrutta una chiamata esterna che rientra nella stessa funzione prima che lo stato sia aggiornato. L'ordine corretto è: controlla le precondizioni, aggiorna lo stato, poi interagisci con l'esterno. Il guard `nonReentrant` è una rete di sicurezza, non un sostituto dell'ordine corretto.

```solidity
contract Cassa {
    mapping(address => uint256) public crediti;
    uint256 private lock;

    modifier nonReentrant() {
        require(lock == 0, "rientrato");
        lock = 1;
        _;          // corpo della funzione protetta
        lock = 0;
    }

    function preleva(uint256 importo) external nonReentrant {
        require(crediti[msg.sender] >= importo, "fondo insufficiente");
        crediti[msg.sender] -= importo;            // effects: prima lo stato
        (bool ok, ) = msg.sender.call{value: importo}(""); // interactions: ultimo
        require(ok, "invio fallito");
    }
}
```

Se aggiornassi il credito dopo `call`, un contratto attaccante potrebbe rientrare e prelevare più volte lo stesso saldo. Il controllo dello stato va sempre prima della trasferta verso l'esterno, e gli errori emersi da `call` vanno propagati con `require`.

## Errori comuni

- **Usare `address` invece di `address payable` per inviare ether**: le chiamate con `value` richiedono un tipo che dichiari l'intenzione di trasferire fondi.
- **Aggiornare lo stato dopo una `call` esterna**: è la struttura tipica della reentrancy; prima gli effetti, poi le interazioni.
- **Modificare `calldata` o restituire `storage` in `external`**: `calldata` è immutabile e i riferimenti a `storage` non possono uscire dal contratto.
- **Confidare su `block.timestamp` per la casualità**: il validatore può spostarlo di qualche secondo, quindi non è una fonte imprevedibile.
- **Ignorare il valore di ritorno di `call` o `send`**: senza `require(ok)` un trasferimento fallito passa inosservato e lo stato resta incoerente.

## In sintesi

Solidity combina un linguaggio statico e una macchina con stato permanente: ogni scrittura è visibile a chiunque e costa gas. Visibilità e locazione dati (`memory`, `storage`, `calldata`) determinano sicurezza e consumi. Gli errori custom e le funzioni `view`/`pure` rendono esplicito il contratto della funzione. L'ordine checks-effects-interactions e un guard di reentrancy sono la base di ogni funzione che invia fondi.

## Fonti

- [Solidity Documentation](https://docs.soliditylang.org/en/latest/)
- [Introduction to Smart Contracts](https://docs.soliditylang.org/en/latest/introduction-to-smart-contracts.html)
- [Solidity by Example](https://docs.soliditylang.org/en/latest/solidity-by-example.html)
- [Layout of Source Files](https://docs.soliditylang.org/en/latest/layout-of-source-files.html)
