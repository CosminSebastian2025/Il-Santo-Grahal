In questo laboratorio scrivi a mano il template VTL di una fattura semplificata: intestazione del fornitore, tabella delle righe, riepilogo IVA per aliquota, sezione per il bollo e una nota finale opzionale. Lavori solo nella sintassi del linguaggio, con il motore in strict mode: ogni riferimento mancante deve rompere il test e ogni formattazione deve stare in un solo punto. Il risultato sono un template di poche decine di righe e test che lo mettono in crisi sui casi veri.

## Obiettivi

- Tradurre un contratto di dati in un template VTL senza logica di calcolo.
- Usare `$foreach` per modificare il layout sugli elementi di bordo e iterare una mappa con `entrySet()`.
- Isolare la formattazione in macro e verificarne l'output.
- Gestire sezioni opzionali senza produrre spazi o righe indesiderate.
- Scrivere test che coprono fattura vuota, bollo assente e note assenti.

## Il contratto dei dati

Il template riceve un `Map` con quattro chiavi e legge da ogni riga una manciata di oggetti. Il contratto è fissato in una tabella perché la maggior parte degli errori di VTL nasce da un nome sbagliato o da un getter che il template assume e Java non espone.

| Riferimento | Tipo | Esempio |
| --- | --- | --- |
| `$fornitore` | record con `ragioneSociale`, `partitaIva`, `indirizzo` | Grahal Srl |
| `$cliente` | record con `nome`, `codiceFiscale` | Rossi Mario |
| `$righe` | lista di record con `descrizione`, `quantita`, `prezzoUnitario`, `aliquota` | 3 righe |
| `$fattura` | record con `numero`, `data`, `bollo` | `FT-2026-0142` |
| `$riepilogoIva` | mappa aliquota → imponibile e imposta | 22% → 220,00 |
| `$note` | stringa opzionale | può essere assente |

Il calcolo dell'IVA per aliquota arriva già pronto dal codice Java: il template non deve sommare. È la regola più importante del laboratorio, perché VTL con `BigDecimal` richiede chiamate a `add`, `multiply` e `setScale` che nessuno può testare dentro un template.

## Griglia, macro e prima bozza

Si parte dalle macro perché determinano tutto il resto. Tre macro bastano: `importo` per i numeri, `data` per la data e `cella` per le celle della tabella. Le macro sono nella libreria globale, caricate dal motore.

```velocity
## templates/macros/fattura.vtl
#macro(importo valore)
$numberTool.format("currency", $valore)#end
#macro(data valore)
$dateTool.format("dd/MM/yyyy", $valore)#end
#macro(cella valore classe)
<td#if($classe) class="$classe"#end>$!{valore}</td>#end
#macro(intestazione titolo)
<tr><th colspan="5">$titolo</th></tr>
#end
```

Il `#end` sulla stessa riga della macro non è un vezzo: le direttive lasciano nel testo gli spazi che le seguono, e un template che deve essere confrontato riga per riga nei test non tollera righe vuote sporche. Per le parti che devono restare letterali si usa `#[[...]]#`.

```velocity
#[[<p class="footer">&copy; 2026 Grahal Srl - documenti generati automaticamente</p>]]#
```

Il footer è un caso in cui il testo contiene `&copy;` e un `$` di stampa: senza `#[[...]]#` il motore proverebbe a interpretare il simbolo e loggare un riferimento invalido.

## Core: il template completo

Il corpo combina intestazione anagrafica, tabella righe, riepilogo per aliquota e chiusura condizionale. Il caso `$note` assente si gestisce con `#if($note)`: nello strict mode un riferimento nudo dentro un `#if` non è un'eccezione, ed è il guardiano che consente di distinguere "chiave assente" da "valore nullo".

```velocity
## templates/fattura.vm
<div class="fattura">
  <header>
    <h1>Fattura ${fattura.numero} del #data($fattura.data)</h1>
    <p>$fornitore.ragioneSociale - P.IVA $fornitore.partitaIva</p>
    <p>$fornitore.indirizzo</p>
  </header>

  <section class="cliente">
    <h2>Cliente</h2>
    <p>$cliente.nome - CF $cliente.codiceFiscale</p>
  </section>

  <table class="righe">
    <thead>
      <tr><th>Descrizione</th><th>Qta</th><th>Prezzo</th><th>IVA</th><th>Totale</th></tr>
    </thead>
    <tbody>
      #foreach($riga in $righe)
        <tr#if($foreach.last) class="ultima"#end>
          #cella($riga.descrizione "")
          #cella($riga.quantita "num")
          #cella($riga.prezzoUnitario "num")
          #cella($riga.aliquota "num")
          #cella($riga.totale "num")
        </tr>
      #end
      #if($righe.empty)
        <tr><td colspan="5">Nessuna riga valorizzata</td></tr>
      #end
    </tbody>
  </table>

  <table class="iva">
    #intestazione("Riepilogo IVA")
    #foreach($fascia in $riepilogoIva.entrySet())
      <tr>
        <td>Aliquota $fascia.key%</td>
        #cella($fascia.value.imponibile "num")
        #cella($fascia.value.imposta "num")
      </tr>
    #end
  </table>

  #if($fattura.bollo)
    <p class="bollo">Bollo: #importo($fattura.bollo)</p>
  #end
  #if($note)
    <p class="note">$note</p>
  #end
</div>
```

Due scelte meritano una nota. La prima è `$riepilogoIva.entrySet()`: la mappa non si itera direttamente in VTL, si itera il suo `entrySet()` e si leggono `key` e `value`. La seconda è `$righe.empty`: l'introspection risolve `empty` in `isEmpty()`, oppure in `null` su una lista non vuota, e una condizione su `null` è falsa. La forma senza parentesi è idiomatica solo per getter e metodi omonimi senza argomenti; un metodo con argomenti richiede sempre le parentesi.

## Test, esecuzione e criterio di uscita

I test rendono il template con un `VelocityContext` costruito a mano, usando le stesse classi di strumenti della produzione. Il confronto va fatto su frammenti selezionati: righe, celle e presenza del blocco bollo. L'intero documento è troppo fragile, ma una verifica completa dell'assenza di eccezioni copre il caso strict.

```java
private static VelocityEngine creaEngine() {
    Properties p = new Properties();
    p.setProperty("resource.loaders", "class");
    p.setProperty("resource.loader.class.class",
            "org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader");
    p.setProperty("runtime.strict_mode.enable", "true");
    p.setProperty("velocimacro.library.path", "templates/macros/fattura.vtl");
    // $numberTool e $dateTool sono messi nel VelocityContext del test
    VelocityEngine e = new VelocityEngine();
    e.init(p);
    return e;
}

@Test
void bolloPresenteSoloQuandoValorizzato() {
    assertEquals(1, conta(render(contestoConBollo()), "class=\"bollo\""));
    assertEquals(0, conta(render(contestoConBollo().senzaBollo()), "class=\"bollo\""));
}

@Test
void riepilogoUnaRigaPerAliquota() {
    String out = render(contestoConDueAliquote());
    assertEquals(2, conta(out, "<td>Aliquota"));
}
```

Il criterio di uscita è un rendering di prova con dati reali, controllato a video: `mvn -q test` verde, nessun avviso di riferimento invalido nel log del motore, e un diff tra l'output prima e dopo un cambiamento al template che mostri solo le righe attese.

```bash
mvn -q test
mvn -q exec:java -Dexec.mainClass=dev.grahal.fattura.Demo > fattura.html
```

## Esercizi

1. Aggiungi una colonna "sconto" che si stampa solo per le righe con `sconto > 0` senza lasciare celle sbilanciate.
2. Gestisci le fatture con più di 40 righe inserendo un'intestazione ripetuta ogni pagina simulata.
3. Sostituisci `entrySet()` con una lista preparata in Java e confronta la leggibilità dei due template.
4. Interrompi l'iterazione con `#break` alla prima riga esclusa e annota cosa cambia nel conteggio totale.
5. Quando `$note` è assente, verifica se `$!note` o `#if($note)` produce spazi diversi e misura l'impatto sul diff.
6. Sperimenta `velocimacro.arguments.strict = true` e trova la chiamata a `#cella` che oggi passa con un argomento in meno.

<details>
<summary>Soluzione</summary>

1. Il `<td>` va emesso con un `#if` che racchiude tutta la cella e non solo il contenuto, altrimenti la tabella ha una riga con meno colonne e il layout si sfasa.

2. Un contatore `#set($n = 0)` fuori dal ciclo, incrementato per riga, con un `#if($n % 40 == 0 and $n > 0)` che richiama `#intestazione`; il resto è lo stesso perché la macro non ha stato.

3. Il template con `#foreach($fascia in $fasce)` e `$fascia.aliquota` è più leggibile, ma sposta la responsabilità dell'ordinamento nel codice Java: la mappa in VTL non è ordinata e `LinkedHashMap` o `TreeMap` vanno passate apposta.

4. `#break` interrompe il ciclo e le righe successive non compaiono, ma il totale calcolato in Java include comunque tutte le righe: il disallineamento va gestito calcolando il totale sulle sole righe incluse.

5. `$!note` su una variabile assente non stampa nulla ma il paragrafo resta: il diff mostra `<p class="note"></p>`. `#if($note)` sopprime il paragrafo intero. Per i documenti che devono essere confrontati nei test la seconda forma è quella corretta.

6. La macro `#cella` richiede due argomenti e la chiamata `#cella($riga.descrizione "")` è corretta, mentre una chiamata con un solo argomento in un altro punto del template fallisce solo con `velocimacro.arguments.strict = true`.

</details>

## Errori comuni

- **Iterare una mappa direttamente**: `#foreach($x in $mappa)` non funziona come atteso; serve `entrySet()` o una lista.
- **Dimenticare `#end` sulle macro**: il template si analizza ma la macro ingloba il resto del documento.
- **Lasciare il `#end` su una riga separata nelle macro di formattazione**: compaiono righe vuote nell'output e i test su stringa falliscono per motivi cosmetici.
- **Mettere il calcolo IVA nel template**: `BigDecimal` richiede catene di metodi e l'arrotondamento varia con la scala dell'oggetto.
- **Testare solo la fattura completa**: bollo assente, note assenti e zero righe sono i casi che rompono la fattura reale.

## In sintesi

Il template della fattura mette in fila i costrutti del linguaggio senza aggiungere logica: macro per la formattazione, `#foreach` con `$foreach` per il layout, `#if` per le sezioni opzionali, `entrySet()` per le mappe e `#[[...]]#` per il testo che deve restare letterale. Il contratto dei dati scritto in tabella e i test su frammenti sono ciò che rende il template revisionabile; lo strict mode è ciò che impedisce a un errore di diventare una cella vuota in un documento fiscale.

## Fonti

- [Apache Velocity - VTL Reference](https://velocity.apache.org/engine/2.3/vtl-reference.html)
- [Apache Velocity - User Guide](https://velocity.apache.org/engine/2.3/user-guide.html)
- [Apache Velocity - Getting Started](https://velocity.apache.org/engine/2.3/getting-started.html)
- [Apache Velocity Tools](https://velocity.apache.org/tools/3.1/)
