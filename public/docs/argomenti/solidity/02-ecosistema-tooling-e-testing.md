Solidity gira sulla EVM, quindi ogni cartella di un progetto reale mescola contratti, script di deploy, test e strumenti di analisi. Il toolchain ufficiale è `solc`, il compilatore che produce bytecode e ABI; attorno ad esso si sono affermati framework come Hardhat e Foundry, che sostituiscono il ciclo manuale compila-deploy-test. In questa lezione vedi come organizzare un repository, come leggere l'output del compilatore e come scrivere test che verificano anche gli attacchi, non solo il caso felice.

## Obiettivi

- Installare `solc` e compilare un contratto leggendo bytecode, ABI e AST.
- Usare il file di configurazione per compilare sorgenti multipli e profili diversi.
- Distinguere test unitari, test di integrazione e fuzzing.
- Capire cosa fa per te l'analizzatore statico Slither e il model checker SMTChecker.
- Mockare il tempo e gli account con gli helper di un framework di test.

## Il compilatore `solc`

`solc` si installa come binario nativo, pacchetto npm o immagine Docker, e la versione deve corrispondere al `pragma` del sorgente. L'output principale è binario per il bytecode e, con `--abi`, il JSON dell'interfaccia che i client usano per chiamare le funzioni.

```bash
solc --version                                   # controlla la versione
solc --bin --abi src/Token.sol -o build/         # bytecode + ABI in build/
solc --standard-json < input.json > output.json  # modalità integrata con i framework
solc --storage-layout src/Token.sol              # layout degli slot, utile per gli upgrade
```

```json
{
  "language": "Solidity",
  "sources": { "Token.sol": { "urls": ["src/Token.sol"] } },
  "settings": {
    "optimizer": { "enabled": true, "runs": 200 },
    "outputSelection": { "*": { "*": ["abi", "evm.bytecode", "storageLayout"] } }
  }
}
```

In modalità `standard-json` il compilatore riceve tutto da un file e restituisce un JSON: è così che Hardhat e Foundry invocano `solc` in modo riproducibile. Il numero di `runs` dell'ottimizzatore è un compromesso tra costo di deploy e costo di esecuzione: un valore alto ottimizza le chiamate frequenti.

## Struttura del progetto e tooling

| Strumento | Cosa fa | Comando tipico |
| --- | --- | --- |
| `solc` | compila, produce ABI e AST | `solc --bin --abi` |
| Hardhat | task, rete locale, plugin JS | `npx hardhat test` |
| Foundry | test in Solidity, fuzzing veloce | `forge test -vvv` |
| Slither | analisi statica di sicurezza | `slither .` |
| SMTChecker | verifica formale di invarianti | `solc --model-checker` |

Un repository ordinato separa `src/` (contratti), `test/`, `script/` (deploy) e `lib/` (dipendenze versionate). Foundry e Hardhat installano le dipendenze come repository git in `lib/`, quindi i contratti importati con `@openzeppelin/...` restano riproducibili.

```bash
forge init mio-progetto           # crea src, test, script, lib
cd mio-progetto && forge install OpenZeppelin/openzeppelin-contracts
forge build                       # compila e salva gli artefatti in out/
forge test --gas-report           # test con tabella dei consumi
```

## Test di contratto

Un test che copre solo il caso felice non è un test di sicurezza: bisogna verificare i revert, gli eventi e gli attacchi. In Solidity puro, con Foundry, si scrive un contratto di test che eredita `Test` e usa `vm.prank` per impersonare un mittente e `vm.expectRevert` per attendersi un errore.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Cassa} from "../src/Cassa.sol";
import {Attaccante} from "./Attaccante.sol";

contract CassaTest is Test {
    Cassa cassa;
    address alice = address(0xA11CE);

    function setUp() public {
        cassa = new Cassa();
        vm.deal(alice, 10 ether);            // saldo finto sulla rete locale
        vm.prank(alice);
        cassa.deposita{value: 1 ether}();
    }

    function testPrelevaAggiornaIlSaldo() public {
        vm.prank(alice);
        cassa.preleva(0.4 ether);            // effects prima delle interazioni
        assertEq(cassa.crediti(alice), 0.6 ether);
    }

    function testPrelevaOltreIlSaldoFaRevert() public {
        vm.prank(alice);
        vm.expectRevert(bytes("fondo insufficiente"));
        cassa.preleva(2 ether);
    }

    function testReentrancyBloccata() public {
        Attaccante att = new Attaccante(cassa);
        vm.deal(address(att), 1 ether);
        att.attacca{value: 1 ether}();       // il lock deve far fallire il rientro
        assertEq(address(cassa).balance, 1 ether);
    }
}
```

`setUp` viene eseguito prima di ogni test, quindi ogni funzione parte da uno stato pulito. Il test di reentrancy lancia il contratto attaccante e verifica che il bilancio della cassa non scenda: è la prova che il modifier funziona davvero.

## Analisi e casi d'uso

Lo studio del codice non sostituisce i test: Slither segnala pattern noti (chiamate esterne prima delle scritture, `tx.origin`, divisioni per zero) e il model checker prova invarianti su tutti gli input entro un limite di tempo. Entrambi si integrano nella pipeline CI e falliscono la build se trovano problemi gravi.

```bash
slither . --exclude-dependencies        # analisi statica del progetto
solc --model-checker-engine all src/Cassa.sol  # verifica formale
forge test --fuzz-runs 5000             # fuzzing: 5000 input casuali per test
```

| Contesto | Approccio consigliato |
| --- | --- |
| prototipo didattico | `solc` e test di Foundry |
| token o contratto con fondi | analisi Slither in CI e audit esterno |
| upgrade di proxy | storage layout congelato e test di compatibilità |
| integrazione front-end | ABI generata e tipizzata nel client |

La regola pratica è che nessun contratto che custodisce valore va in produzione senza test negativi, analisi statica e un audit. L'ecosistema fornisce librerie mature come OpenZeppelin: usarle riduce la superficie di errori.

## Errori comuni

- **Compilare con una versione di `solc` diversa dal `pragma`**: il bytecode può cambiare e i test locali non rappresentano quello che sarà deployato.
- **Testare solo il percorso felice**: i revert, i permessi e gli attacchi sono i casi che proteggono i fondi degli utenti.
- **Versionare `lib/` a mano senza framework**: le dipendenze dei contratti vanno fissate come submodule o pacchetti, altrimenti una build non è riproducibile.
- **Correre Slither una sola volta in locale**: l'analisi serve in CI, altrimenti torna il problema dopo il primo refactoring.
- **Trascurare il gas nei test**: `--gas-report` mostra le funzioni che diventano troppo costose prima della messa in produzione.

## In sintesi

Il compilatore `solc` è il cuore dell'ecosistema e lavora sia da riga di comando sia in modalità JSON per i framework. Foundry e Hardhat aggiungono un ciclo di deploy e test riproducibile, con `prank` e `expectRevert` per controllare mittente ed errori. Slither e SMTChecker coprono i pattern che i test manuali non trovano. Fissare versioni e testare gli attacchi è la differenza tra un contratto che funziona e uno che regge in produzione.

## Fonti

- [Using the Compiler](https://docs.soliditylang.org/en/latest/using-the-compiler.html)
- [Installing the Solidity Compiler](https://docs.soliditylang.org/en/latest/installing-solidity.html)
- [Analysing the Compiler Output](https://docs.soliditylang.org/en/latest/analysing-compilation-output.html)
- [SMTChecker and Formal Verification](https://docs.soliditylang.org/en/latest/smtchecker.html)
- [Contract ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
