SystemVerilog non è un linguaggio per applicazioni: è un linguaggio per descrivere circuiti e per verificarli. Lo standard di riferimento è IEEE 1800, oggi nella edizione 1800-2023, che estende Verilog con tipi più rigorosi, costrutti di verifica e interfacce. Chi arriva da un linguaggio software deve resettare un'abitudine: qui il codice descrive hardware che esiste in parallelo, non istruzioni eseguite in sequenza.

## Obiettivi

- Distinguere RTL (design sintetizzabile) da testbench (verifica, non sintetizzabile).
- Usare `logic`, `typedef` ed `enum` al posto delle reti e dei registri impliciti di Verilog.
- Scrivere un modulo con `always_comb` e `always_ff` e capire perché non sono `always` generici.
- Raggruppare segnali con `interface` e dichiarare la direzione con i `modport`.
- Leggere il valore di un `enum` come oggetto tipizzato, non come intero nudo.

## Design e verifica: due mondi nello stesso file

| Aspetto | RTL | Testbench |
| --- | --- | --- |
| obiettivo | descrivere hardware realmente costruibile | stimolare e controllare il design |
| costrutti tipici | `always_comb`, `always_ff`, `case` | `initial`, `class`, `randomize`, `$display` |
| tempo | reagisce ai segnali | attese `#` e `@` esplicite |
| sintetizzabile | sì | no |
| file tipico | `*.sv` del modulo | `tb_*.sv` |

Un modulo RTL viene tradotto da un sintetizzatore in porte logiche; un testbench no, perché contiene ritardi e costrutti che non hanno corrispondenza fisica. Mescolare i due nello stesso file funziona in simulazione ma è una cattiva abitudine: il testbench di solito usa classi e generatori casuali che non devono finire nel flusso di sintesi.

La separazione ha anche un effetto sulla leggibilità: il testbench descrive una sequenza di stimoli nel tempo, mentre l'RTL descrive relazioni tra segnali che valgono in ogni istante. Perdere di vista questa distinzione è il motivo per cui molti studenti scrivono RTL con `initial` o fanno testbench che non traducono mai una specifica in un controllo verificabile.

## Tipi, `logic` e variabili tipizzate

`logic` sostituisce `wire` e `reg` in quasi tutti i casi: è a quattro stati (`0`, `1`, `X`, `Z`) e una singola sorgente può pilotarlo. Il vantaggio più concreto arriva dai tipi dell'utente: un `enum` con base esplicita dice quanti bit consuma il segnale e impedisce di assegnare valori fuori dall'insieme.

```systemverilog
typedef enum logic [1:0] {
  IDLE  = 2'b00,
  RUN   = 2'b01,
  DONE  = 2'b10
} stato_t;                 // valori unici, base di 2 bit

typedef struct packed {
  logic [7:0]  dato;
  logic        valido;
} byte_t;

module contatore_semplice (
  input  logic clk,
  input  logic rst,
  input  logic abilita,
  output logic [3:0] conta
);
  always_ff @(posedge clk) begin
    if (rst)
      conta <= 4'd0;       // reset sincrono, non asincrono
    else if (abilita)
      conta <= conta + 4'd1;
  end
endmodule
```

`enum` è fortemente tipizzato: assegnare un intero richiede un cast esplicito. Il primo e l'ultimo elemento si ottengono con `first()` e `last()`, mentre `next()` e `prev()` seguono l'ordine di dichiarazione, non il valore numerico. Attenzione alla base: un `enum logic [1:0]` occupa due bit nella simulazione e due fili nel silicio, quindi non è un dettaglio cosmetico.

## `always_comb`, `always_ff` e interfacce

`always_comb` dice al compilatore che il blocco è logica combinatoria: rifiuta le assegnazioni multiple alla stessa variabile e segnala quando una variabile è letta in un blocco e scritta in un altro. `always_ff` dice che il blocco descrive registri e deve avere un solo evento di clock e assegnazioni non bloccanti. Se il compilatore trova forme che non rispettano il contratto, lo dice subito, cosa che con `always` generico non accade.

```systemverilog
interface somma_if (input logic clk);
  logic [7:0] a;
  logic [7:0] b;
  logic [8:0] somma;

  modport master (output a, b, input somma);
  modport slave  (input a, b, output somma, import task attesa);
  task attesa; @(posedge clk); endtask
endinterface

module sommatore (somma_if.slave bus);
  always_comb begin
    bus.somma = bus.a + bus.b;  // larghezza 9 bit per il riporto
  end
endmodule

module banco;
  logic clk = 0;
  somma_if bus(clk);

  sommatore u_dut (.bus(bus.master)); // cablaggio per nome del porta
  always #5 clk = ~clk;               // clock da 100 MHz

  initial begin
    bus.a = 8'd10;
    bus.b = 8'd20;
    #1 $display("somma = %0d", bus.somma);
    $finish;
  end
endmodule
```

`modport` non è un salvataggio automatico: dichiara i permessi, e in molti simulatori gli accessi non importati vengono segnalati solo nei moduli compilati insieme. Nell'esempio il modulo `sommatore` riceve `master`, che espone `a` e `b` in scrittura e `somma` in lettura, mentre il banco usa `slave` per parlarne dal lato opposto. Il task `attesa` è raggiungibile dentro il modulo perché è importato dal `modport`.

La larghezza della somma è l'altro dettaglio che conta: `a` e `b` sono a 8 bit, ma la somma a 9 bit conserva il riporto. Se si scrive `bus.somma = bus.a + bus.b` con `somma` a 8 bit, il risultato è troncato e il testbench si troverà un valore sbagliato solo sugli estremi, mai in mezzo. È il tipo di errore che sopravvive a un test casuale alla cieca e che si trova soltanto pesando i casi limite.

## Errori comuni

- **Errore**: usare `wire` e `reg` per abitudine — in SystemVerilog `logic` rende il codice omogeneo e meno soggetto a errori di tipo.
- **Errore**: mettere il reset asincrono senza l'edge nella sensitivity list — `always_ff @(posedge clk)` con reset asincrono non sintetizza il comportamento atteso.
- **Errore**: assegnare un intero a un `enum` senza cast — il compilatore rifiuta l'assegnazione, ed è il suo comportamento corretto.
- **Errore**: confondere `next()` con l'incremento numerico — i valori possono avere buchi e l'ordine è quello di dichiarazione.
- **Errore**: dimenticare `bus.` davanti ai segnali dell'interfaccia — il compilatore cerca una variabile locale e fallisce con un messaggio poco intuitivo.

## In sintesi

SystemVerilog riunisce design e verifica in un solo linguaggio, ma i due mondi restano separati: l'RTL usa costrutti sintetizzabili, il testbench no. `logic`, `typedef` ed `enum` rendono i tipi espliciti, mentre `always_comb` e `always_ff` comunicano l'intenzione al compilatore e intercettano errori prima della simulazione. Le interfacce riducono il cablaggio e i `modport` dichiarano chi pilota cosa.

## Fonti

- [ChipVerify — SystemVerilog Tutorial](https://www.chipverify.com/systemverilog/systemverilog-tutorial)
- [IEEE 1800-2023 — Standard for SystemVerilog](https://standards.ieee.org/ieee/1800/7743/)
- [Verilator — User Guide](https://verilator.org/guide/latest/)
- [Verification Academy — SystemVerilog](https://verificationacademy.com/topics/systemverilog)
- [Wikipedia — SystemVerilog](https://en.wikipedia.org/wiki/SystemVerilog)
