In questo laboratorio progetti e verifichi un sommatore con validazione a due ingressi: il design riceve `a`, `b` e `valido`, e quando `valido` è alto presenta la somma e un flag di overflow. Il testbench è vero SystemVerilog da verifica, con classi, `rand` e un controllo automatico. Alla fine avrai un design sintetizzabile, un testbench che termina da solo con un exit code e un flusso Icarus e Verilator sperimentato in prima persona.

## Obiettivi

- Scrivere un RTL con `always_comb` e `always_ff` senza latenze indesiderate.
- Separare design e verifica in file distinti e in moduli distinti.
- Usare una classe con `rand` per simulare stimoli casuali validi.
- Controllare la somma nel testbench invece di guardare le forme d'onda a occhio.
- Stabilire l'esito con un riepilogo e un exit code per la CI.

## Il design

Il modulo è volutamente piccolo: la somma ha bisogno di un bit in più per il riporto, e l'overflow si ottiene confrontando il risultato a 8 bit con la somma a 9 bit. Il registro di uscita è opzionale, ma utile per capire dove finisce la logica combinatoria e dove inizia quella sequenziale.

| Segnale | Larghezza | Ruolo |
| --- | --- | --- |
| `a`, `b` | 8 bit | ingressi con segno? no, unsigned |
| `valido` | 1 bit | abilita la somma nel registro |
| `somma` | 8 bit | somma troncata |
| `overflow` | 1 bit | alto se il risultato non entra |
| `pronto` | 1 bit | il registro contiene un risultato valido |

```systemverilog
// rtl/sommatore.sv
module sommatore (
  input  logic       clk,
  input  logic       rst,
  input  logic       valido,
  input  logic [7:0] a,
  input  logic [7:0] b,
  output logic [7:0] somma,
  output logic       overflow,
  output logic       pronto
);
  logic [8:0] intera;

  always_comb begin
    intera = {1'b0, a} + {1'b0, b}; // 9 bit: nessuna perdita
  end

  always_ff @(posedge clk) begin
    if (rst) begin
      somma    <= 8'd0;
      overflow <= 1'b0;
      pronto   <= 1'b0;
    end else begin
      pronto <= valido;
      if (valido) begin
        somma    <= intera[7:0];
        overflow <= intera[8];       // il nono bit e' la parte persa
      end
    end
  end
endmodule
```

## Il testbench con classi e `rand`

Il generatore è una classe con vincoli: gli stimoli devono essere coerenti con il protocollo, cioè il valore di `valido` non è casuale ma pilotato dall'ambiente. Il punteggio si calcola in un modello di riferimento nello stesso ambiente, e il confronto avviene sul fronte del clock.

```systemverilog
// tb/tb_sommatore.sv
class stimolo;
  rand bit [7:0] a;
  rand bit [7:0] b;
  bit            valido;

  constraint distribuzione {
    a dist {0 := 2, [1:254] :/ 6, 255 := 1}; // casi limite pesati
    b inside {[0:255]};
  }
endclass

module tb_sommatore;
  logic clk = 0, rst = 1;
  logic valido = 0;
  logic [7:0] a, b, somma;
  logic overflow, pronto;

  sommatore dut (.clk(clk), .rst(rst), .valido(valido), .a(a), .b(b),
                 .somma(somma), .overflow(overflow), .pronto(pronto));

  always #5 clk = ~clk;

  initial begin
    stimolo s = new();
    int errori = 0;
    logic [8:0] atteso;

    repeat (2) @(posedge clk);  // reset sincrono
    rst <= 0;

    for (int i = 0; i < 200; i++) begin
      if (!s.randomize()) $fatal(1, "randomize fallita");
      @(negedge clk);
      a <= s.a; b <= s.b; valido <= 1;
      atteso = s.a + s.b;
      @(posedge clk); #1;       // lascia che il registro si aggiorni
      if (somma !== atteso[7:0] || overflow !== atteso[8]) begin
        errori++;
        $display("MISMATCH a=%0d b=%0d got=%0d/%0d exp=%0d/%0d",
                 s.a, s.b, somma, overflow, atteso[7:0], atteso[8]);
      end
    end

    $display("Fine: %0d errori su 200", errori);
    $finish(errori == 0 ? 0 : 1);   // Icarus: 0 = esito verde
  end
endmodule
```

Il `#1` dopo il fronte positivo non è un ritardo casuale: senza di esso il testbench legge il registro nello stesso evento in cui il design lo aggiorna, e il confronto diventa non deterministico. La distribuzione `dist` con `:/` distribuisce il peso totale della voce sui valori dell'intervallo, mentre `:=` assegna quel peso a ogni singolo valore.

## Esercizi

1. Aggiungi un contatore di test eseguiti e stampa il numero di casi limite coperti.
2. Rendi opzionale l'uso di `randomize() with` per forzare valori fissi su un test.
3. Aggiungi una sequenza di reset a metà simulazione e verifica che `pronto` torni basso.
4. Passa parametri al design per la larghezza e verifica che l'overflow segua la nuova larghezza.
5. Introduci un errore volontario nel design e controlla che il testbench lo rilevi.
6. Compila con Verilator e confronta il numero di errori con quello di Icarus.

<details>
<summary>Soluzione</summary>

1. Un intero locale `coperti` viene incrementato quando `s.a` o `s.b` assumono `0` o `255`; il `$display` finale va prima di `$finish`, perché dopo la fine della simulazione non viene eseguito nulla.

2. Si usa `s.randomize() with { a == 8'd128; b == 8'd127; }` e si esegue un ciclo di pochi passi; il costrutto permette di mantenere i vincoli della classe aggiungendo un'uguaglianza locale.

3. Sull'evento `negedge clk` si alza `rst` per due cicli, poi si abbassa; alla fine si verifica `pronto === 0` dopo il primo fronte con reset alto e di nuovo `1` dopo il primo stimolo valido.

4. Il parametro `W` sostituisce `8` in porte e larghezze; il test calcola l'atteso con un tipo `[W:0]` e confronta sia la parte bassa sia il bit di riporto.

5. Un `somma <= intera[7:1]` o una somma con larghezza a 8 bit fa apparire i mismatch nel log e l'exit code diventa 1: è il test più importante, perché dimostra che il testbench non è compiacente.

6. Verilator accetta classi e `randomize()` in versioni recenti ma richiede l'opzione `--timing` e un `--top-module` esplicito; il confronto utile è sui messaggi di lint iniziali, che su larghezze implicite trovano problemi che Icarus accetta in silenzio.

</details>

## Errori comuni

- **Errore**: sostenere la somma con `a + b` a 8 bit — il riporto sparisce e l'overflow resta sempre a zero.
- **Errore**: pilotare gli ingressi sul fronte positivo — design e testbench aggiornano lo stesso evento e il confronto diventa instabile.
- **Errore**: omettere il `default` nel `case` dell'RTL — il sintetizzatore crea un latch e il comportamento in simulazione differisce dall'hardware.
- **Errore**: usare `==` invece di `===` con valori `X` — un confronto con `X` restituisce anch'esso `X` e il controllo non fallisce.
- **Errore**: terminare il testbench con `$finish()` senza codice — la CI non sa distinguere un pass da un fail.

## In sintesi

Il laboratorio chiude il cerchio tra design e verifica: un RTL sintetizzabile con larghezze esplicite, un generatore casuale con vincoli realistici e un controllo automatico che trasforma gli errori in un exit code. Le trappole principali sono le larghezze, la temporizzazione degli stimoli e i confronti a quattro stati. Con questi strumenti si può passare a testbench più grandi, con monitor, scoreboard e coverage.

## Fonti

- [ChipVerify — Esempio di testbench addizionatore](https://www.chipverify.com/systemverilog/systemverilog-testbench-example-adder)
- [ChipVerify — Vincoli SystemVerilog](https://www.chipverify.com/systemverilog/systemverilog-constraints)
- [Icarus Verilog — Repository ufficiale](https://github.com/steveicarus/iverilog)
- [Verilator — User Guide](https://verilator.org/guide/latest/)
- [FPGA Tutorial — SystemVerilog](https://fpgatutorial.com/systemverilog/)
