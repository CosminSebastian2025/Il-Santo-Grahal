Un progetto SystemVerilog vive di strumenti: simulatori per eseguire i testbench, linter per intercettare errori prima della simulazione, sintetizzatori per capire se il codice è davvero hardware. L'ecosistema open source è cresciuto molto e oggi copre quasi tutte le fasi, dai test di conformità allo standard fino alla verifica formale dei vincoli.

## Obiettivi

- Distinguere simulatore, linter, sintetizzatore e verifica formale.
- Compilare ed eseguire un modulo con Icarus Verilog e con Verilator.
- Interpretare i messaggi di lint di Verilator e Verible come parte del flusso di sviluppo.
- Strutturare un progetto con file separati per moduli, interfacce e testbench.
- Consultare la suite di conformità sv-tests per sapere cosa supporta uno strumento.

## Quale strumento per quale fase

| Strumento | Ruolo | Comando tipico | Sintesi |
| --- | --- | --- | --- |
| Icarus Verilog | simulazione | `iverilog -g2012 -o sim sim*.sv` | no |
| Verilator | simulazione veloce e lint | `verilator --lint-only file.sv` | no |
| Verible | formattazione e lint del codice | `verible-verilog-lint file.sv` | no |
| Yosys | sintesi open source | `yosys -p "read_verilog -sv a.sv; synth"` | sì |
| SymbiYosys | verifica formale | `sby -f job.sby` | usa Yosys |
| sv-tests | conformità allo standard | suite eseguita dai manutentori | varia |

Nessuno di questi strumenti è completo, e la lacuna più frequente riguarda proprio le funzionalità che rendono SystemVerilog conveniente per la verifica: classi, generatori casuali con vincoli, asserzioni SVA e coverage funzionale. sv-tests pubblica i risultati proprio per mostrare, costrutto per costrutto, cosa uno strumento supporta. Controllare i risultati prima di contare su una funzionalità avanzata evita ore di debug inutile: se un costrutto non è supportato, il messaggio d'errore spesso è generico e porta a cercare il problema nel codice invece che nello strumento.

La scelta interessante non è "quale strumento è migliore", ma quale combinazione copre il flusso. Per un progetto didattico la combinazione più economica è Icarus per la simulazione, Verible per il lint e Yosys per verificare che il design sia sintetizzabile; Verilator entra in gioco quando la simulazione diventa il collo di bottiglia o quando serve un modello C++ da integrare con altro software.

## Un progetto piccolo ma ordinato

La convenzione che funziona consiste nel tenere ogni modulo in un file con lo stesso nome, le interfacce in `rtl/` e i testbench in `tb/`. Un Makefile rende esplicito il flusso.

```bash
# Struttura: rtl/contatore.sv, rtl/somma_if.sv, tb/tb_contatore.sv
mkdir -p build

# Icarus: compila tutti i file insieme e poi simula
iverilog -g2012 -o build/sim rtl/*.sv tb/tb_contatore.sv
vvp build/sim              # stampa $display e $finish

# Verilator: lint severo, senza generare l'eseguibile
verilator --lint-only -Wall rtl/contatore.sv

# Verilator: simulazione C++ (serve un main o un testbench C++)
verilator --binary --timing -Wall --top-module tb_contatore \
  rtl/*.sv tb/tb_contatore.sv -o sim
./obj_dir/sim
```

Verilator non simula tutto quello che simula Icarus: la modalità `--binary --timing` copre ritardi e blocchi `initial`, ma i costrutti di verifica più avanzati restano territorio di simulatori commerciali o di strumenti specializzati. Icarus, viceversa, è permissivo ma lento; usarlo come primo filtro va benissimo. Il testbench qui è scritto in modo da terminare con `$finish` e da stampare un riepilogo, così lo script di simulazione può verificare il risultato senza parser personalizzati.

Un ultimo dettaglio sulle dipendenze: ogni strumento ha la propria sintassi per caricare i file. Verilator vuole l'elenco dei sorgenti sulla riga di comando e un `--top-module` esplicito; Icarus accetta l'ordine di compilazione e risolve i moduli per nome; Yosys legge un file alla volta con `read_verilog` ripetuto. Mantenere i file in cartelle fisse e far generare l'elenco allo script evita il classico "funziona sulla mia macchina" causato da un file dimenticato.

## Lint, formattazione e test automatici

Il lint non è burocrazia: un `case` senza `default`, un segnale letto ma mai scritto, una larghezza che perde bit sono tutti difetti che un linter trova in millisecondi e che in simulazione possono richiedere ore per manifestarsi.

```bash
# Verible: lint con regole esplicite e formattazione del file
verible-verilog-lint rtl/contatore.sv
verible-verilog-format rtl/contatore.sv > build/contatore.formatted.sv

# Verilator con warning elevati a errori nel flusso CI
verilator --lint-only -Wall -Werror-fatal rtl/contatore.sv

# Sintesi con Yosys: se non passa, il design non è hardware
yosys -p "read_verilog -sv rtl/contatore.sv; synth; stat"
```

Nel Makefile conviene avere un target `lint` e un target `sim` separati: il primo deve fallire velocemente, il secondo deve produrre un log con l'esito. I testbench che terminano con un valore diverso da zero quando un controllo fallisce si integrano in qualsiasi CI senza instrumentazione aggiuntiva.

Per la verifica formale il discorso è diverso: SymbiYosys non esegue stimoli ma dimostra proprietà su tutti gli input, e per farlo serve un file di configurazione `.sby` con il modulo top, il clock e le asserzioni da provare. È utile quando il design è piccolo e le asserzioni sono poche, perché il costo cresce in fretta con lo spazio degli stati; per i grandi datapath la simulazione con stimoli mirati resta più efficiente.

Un dettaglio pratico sui nomi: Icarus cerca il modulo top tra quelli compilati, mentre Verilator lo vuole esplicito con `--top-module`. Se i file del testbench definiscono più moduli, un `--top-module` assente fa scegliere a Verilator il primo modulo del file, che quasi mai è quello desiderato. Dichiararlo sempre è una convenzione che risparmia un pomeriggio di debug.

## Errori comuni

- **Errore**: dimenticare `-g2012` in Icarus — senza la flag il codice SystemVerilog non viene interpretato secondo lo standard attuale.
- **Errore**: usare Verilator come sostituto completo di un simulatore — alcune features di verifica non sono supportate, e il fallimento non è sempre esplicito.
- **Errore**: passare a Yosys un testbench — i costrutti di verifica non sono sintetizzabili e la sintesi fallisce o ignora il blocco.
- **Errore**: riscrivere a mano i file formattati — il formatter emette il risultato su stdout; va rediretto su un altro file.
- **Errore**: assumere che ogni strumento accetti ogni costrutto — la pagina sv-tests esiste per questo: guardarla prima, non dopo.

## In sintesi

L'ecosistema open source copre simulazione (Icarus, Verilator), lint (Verilator, Verible), sintesi (Yosys) e verifica formale (SymbiYosys). Un progetto sano li usa in fila: lint veloce, simulazione, sintesi, e verifica formale dove serve. La conformità allo standard varia da strumento a strumento, e sv-tests è il riferimento per sapere cosa aspettarsi.

## Fonti

- [Verilator — User Guide](https://verilator.org/guide/latest/)
- [Verible — Tooling per SystemVerilog](https://verible.io/)
- [Icarus Verilog — Repository ufficiale](https://github.com/steveicarus/iverilog)
- [chipalliance sv-tests — Risultati di conformità](https://chipsalliance.github.io/sv-tests-results/)
- [SymbiYosys — Documentazione](https://symbiyosys.readthedocs.io/)
