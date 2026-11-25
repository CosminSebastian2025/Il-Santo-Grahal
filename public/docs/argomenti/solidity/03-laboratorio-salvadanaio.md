In questo laboratorio costruisci `Salvadanaio`, un contratto di risparmio con depositi, prelievi e scadenze, scritto in Solidity 0.8 e testato con Foundry. Il contratto sta in una lezione ma contiene i problemi che rendono insicuri i contratti reali: invio di fondi a indirizzi esterni, tempo e un attaccante. Alla fine avrai un contratto con guard di reentrancy, errori tipizzati e una suite di test che include un attacco reale.

## Obiettivi

- Scrivere un contratto con stato minimo, eventi e errori custom.
- Implementare deposito e prelievo applicando checks-effects-interactions.
- Proteggere i fondi con un modifier di reentrancy e un controllo sul proprietario.
- Scrivere test che coprano casi felici, revert e un attacco reale.
- Leggere il gas report per individuare le funzioni più costose.

## Il contratto di `Salvadanaio`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| deposito | `deposita() payable` | qualsiasi importo sopra zero |
| prelievo | `preleva(uint256)` | solo il proprio saldo |
| scadenza | `sblocco` per conto | impedisce prelievi immediati |
| tassa | `feeBps` nel costruttore | fondo del proprietario |
| evento | `Deposito`, `Prelievo` | tracciati dai client |
| errore | `FondoInsufficiente`, `Bloccato` | più economico delle stringhe |

Il contratto tiene un saldo e un tempo di sblocco per indirizzo in due `mapping`. La tassa in basis point, accreditata al proprietario, introduce un beneficiario interno da testare.

```bash
forge init salvadanaio && cd salvadanaio
forge build
forge test -vv                     # esecuzione con i log dei test
forge test --gas-report            # tabella dei costi per funzione
```

## Core: stato, depositi e prelievi

Il costruttore fissa il proprietario e la tassa. `msg.sender` è l'indirizzo che ha invocato la funzione e non può essere falsificato dal chiamante, a differenza di un parametro di input.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Salvadanaio {
    address public immutable owner;
    uint256 public immutable feeBps;      // basis point: 100 = 1%
    mapping(address => uint256) public saldi;
    mapping(address => uint256) public sblocco;
    uint256 private guard;

    event Deposito(address indexed chi, uint256 importo);
    event Prelievo(address indexed chi, uint256 importo, uint256 tassa);
    error FondoInsufficiente(uint256 saldo, uint256 richiesto);
    error Bloccato(uint256 sblocco);
    error ImportoNullo();

    constructor(uint256 feeBps_) {
        owner = msg.sender;
        feeBps = feeBps_;                 // immutabile: costa zero in runtime
    }

    modifier nonReentrant() {
        require(guard == 0, "rientrato");
        guard = 1;
        _;
        guard = 0;
    }

    function deposita() external payable {
        if (msg.value == 0) revert ImportoNullo();
        saldi[msg.sender] += msg.value;
        sblocco[msg.sender] = block.timestamp + 1 days; // tempi in secondi
        emit Deposito(msg.sender, msg.value);
    }
}
```

`immutable` funziona solo per valori assegnati nel costruttore e li incorpora nel bytecode, quindi `owner` e `feeBps` non occupano slot di storage. Il deposito aggiorna saldo e sblocco prima di emettere l'evento, e l'evento con `indexed` consente ai client di filtrare per mittente nei log.

## Prelievo e sicurezza

Il prelievo deve verificare scadenza e saldo, calcolare la tassa, aggiornare lo stato e solo dopo inviare l'ether con `call`, controllando il booleano di ritorno: un contratto ricevente può rifiutare i fondi o esaurire il gas.

```solidity
    function preleva(uint256 importo) external nonReentrant {
        uint256 saldo = saldi[msg.sender];
        if (block.timestamp < sblocco[msg.sender]) revert Bloccato(sblocco[msg.sender]);
        if (importo > saldo) revert FondoInsufficiente(saldo, importo);

        uint256 tassa = (importo * feeBps) / 10_000;
        uint256 netto = importo - tassa;

        saldi[msg.sender] = saldo - importo;      // effects
        if (tassa > 0) saldi[owner] += tassa;     // il proprietario è interno, nessuna call

        (bool ok, ) = msg.sender.call{value: netto}(""); // interactions: ultima
        if (!ok) revert FondoInsufficiente(netto, netto);
        emit Prelievo(msg.sender, netto, tassa);
    }
```

La tassa si accredita come saldo interno: un solo invio verso l'esterno per chiamata riduce i punti d'attacco e il gas. Se il `call` fallisce, il `revert` annulla tutto.

## Test: dai casi felici all'attaccante

I test di Foundry sono contratti che ereditano `Test` e deployano altri contratti. L'attaccante prova a rientrare in `preleva` dal suo `receive`: con il modifier il rientro incontra `guard == 1` e fallisce.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Salvadanaio} from "../src/Salvadanaio.sol";

contract Attaccante {
    Salvadanaio public target;
    uint256 public tentativi;

    constructor(Salvadanaio t) { target = t; }

    function attacca(uint256 importo) external {
        target.preleva(importo); // primo prelievo: accreditato al suo saldo
    }

    receive() external payable {
        tentativi += 1;
        if (tentativi < 3) target.preleva(msg.value); // rientro: deve fallire
    }
}
```

Il test deposita per alice e sposta l'orologio con `vm.warp` oltre la scadenza di un giorno, così il prelievo raggiunge il `call` invece di fermarsi su `Bloccato`.

```solidity
contract SalvadanaioTest is Test {
    Salvadanaio salvadanaio;
    address alice = address(0xA11CE);

    function setUp() public {
        salvadanaio = new Salvadanaio(100);        // tassa 1%
        vm.deal(alice, 10 ether);
    }

    function testAttaccoReentrancyBloccato() public {
        vm.startPrank(alice);
        salvadanaio.deposita{value: 1 ether}();     // saldo a nome alice
        vm.warp(block.timestamp + 2 days);          // sblocca il saldo
        Attaccante att = new Attaccante(salvadanaio);
        vm.expectRevert(bytes("rientrato"));        // il rientro incontra il guard
        att.attacca(1 ether);                       // preleva, poi tenta il rientro
        vm.stopPrank();
    }

    function testPrelievoConTassa() public {
        vm.startPrank(alice);
        salvadanaio.deposita{value: 1 ether}();
        vm.warp(block.timestamp + 2 days);
        salvadanaio.preleva(1 ether);
        vm.stopPrank();
        assertEq(salvadanaio.saldi(address(this)), 0.01 ether); // 1% di tassa
    }
}
```

Il secondo test sfrutta il fatto che `owner` è l'indirizzo del contratto di test, che costruisce `Salvadanaio` nel `setUp`. `startPrank` e `stopPrank` identificano la finestra in cui tutte le chiamate arrivano da alice.

## Esercizi

1. Aggiungi `estendiLock(uint256 giorni)` che allunga la scadenza del proprio saldo, con un evento dedicato.
2. Scrivi un test con `vm.expectRevert` per `Bloccato` quando il prelievo avviene prima della scadenza.
3. Aggiungi `onlyOwner` per cambiare `feeBps`: la tassa deve essere immutabile o modificabile? Motiva la scelta.
4. Usa `vm.deal` per dare ether a un indirizzo senza codice e verifica che il `call` verso un EOA funzioni.
5. Annota il gas di `preleva` con `--gas-report` e prova a ridurlo spostando il calcolo della tassa prima delle scritture.
6. Aggiungi `receive()` che accredita il deposito e verifica che un pagamento diretto non aggiri il blocco.

<details>
<summary>Soluzione</summary>

1. `estendiLock` scrive `sblocco[msg.sender] += giorni * 1 days` ed emette `LockEsteso`; l'aritmetica controllata di 0.8 protegge dall'overflow sul tempo.

2. Il test porta il clock a scadenza, preleva una parte e poi usa `vm.prank(alice)` più `vm.expectRevert(abi.encodeWithSelector(salvadanaio.Bloccato.selector, sblocco))` prima del prelievo anticipato.

3. Se la tassa cambia, chi ha depositato con il 1% può subire il 10%: la scelta sicura è tenerla immutabile, oppure consentire il cambio con preavviso e un massimo (per esempio 500 bps) scritto nel contratto.

4. `vm.deal(address(0xB0B), 5 ether)` crea ether per un indirizzo vuoto; `call` verso un EOA senza codice restituisce `true`, quindi il prelievo funziona e il test verifica il saldo finale.

5. Il gas è dominato dalle scritture di storage e dal `call`; un solo `call` per prelievo e il calcolo della tassa prima delle scritture restano la struttura più economica.

6. `receive()` deve richiamare la stessa logica interna di `deposita`, aggiornando saldo e blocco: un semplice accredito senza `sblocco` aggirerebbe la scadenza.

</details>

## Errori comuni

- **Inviare l'ether prima di azzerare il saldo**: è lo schema base della reentrancy e con `call` consente al ricevente di richiamare `preleva` finché il saldo non è zero.
- **Usare `transfer` credendolo innocuo**: trasferisce solo 2300 gas e fallisce con riceventi complessi; `call` con controllo del booleano è lo standard attuale.
- **Calcolare la tassa con un denominatore diverso dai basis point**: un `100` trattato come percentuale invece che come 100 bps redistribuisce i soldi in modo imprevisto.
- **Testare l'attaccante nello stesso contratto di test**: il rientro va isolato in un contratto con `receive`, altrimenti l'attacco non si riproduce.
- **Dimenticare che `block.timestamp` può essere mosso**: i test che si basano sul tempo devono usare `vm.warp` e coprire i limiti (prima, esattamente, dopo la scadenza).

## In sintesi

`Salvadanaio` mostra il ciclo completo di un contratto di valore: stato minimo, eventi, errori tipizzati e un modifier di reentrancy. Il prelievo segue l'ordine controlla-aggiorna-interagisci e i test includono un attaccante reale, il tempo controllato con `vm.warp` e il gas report dei costi.

## Fonti

- [Solidity by Example](https://docs.soliditylang.org/en/latest/solidity-by-example.html)
- [Security Considerations](https://docs.soliditylang.org/en/latest/security-considerations.html)
- [Contracts - Solidity Documentation](https://docs.soliditylang.org/en/latest/contracts.html)
- [Units and Global Variables](https://docs.soliditylang.org/en/latest/units-and-global-variables.html)
