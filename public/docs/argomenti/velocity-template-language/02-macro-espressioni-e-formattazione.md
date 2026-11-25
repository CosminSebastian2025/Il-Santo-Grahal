Quando un template VTL supera le cinquanta righe, i problemi non sono più sintattici: sono di espressioni che restituiscono tipi inattesi, di formattazione dei numeri e delle date che cambia con il `Locale`, di macro che si richiamano e di valutazione che avviene una volta sola. Questa lezione lavora sulla parte avanzata del linguaggio: operatori e precedenza, coercizioni tra tipi Java, macro parametriche con riferimento e con `#@`, direttive di controllo del flusso come `#break` e `#stop`, e tecniche di formattazione che non richiedono logica nel template.

## Obiettivi

- Usare operatori relazionali, logici e di precedenza in VTL sapendo come valutano i tipi Java.
- Scrivere macro con argomenti, riferimenti a macro e body passato con `#@nome`.
- Controllare il flusso con `#break`, `#stop`, `#evaluate` e capire i limiti di ognuno.
- Formattare numeri, date e testi usando strumenti dedicati, non direttive artigianali.
- Diagnosticare gli errori più frequenti di macro e tipi.

## Espressioni, operatori e tipi

In VTL ogni valore è un oggetto Java: `#if($quantita > 0)` fa un confronto tra un `Integer` e un `Integer`, mentre `#if($quantita > $soglia)` con `$soglia` `Double` produce un errore di comparazione. L'ordine di precedenza segue quello consueto: negazione, moltiplicazione e divisione, addizione e sottrazione, confronto, uguaglianza, `and`, `or`. Le parentesi sono sempre ammesse e quasi sempre consigliate.

| Operazione | Forma simbolica | Forma testuale |
| --- | --- | --- |
| uguaglianza | `$a == $b` | `$a eq $b` |
| disuguaglianza | `$a != $b` | `$a ne $b` |
| maggiore | `$a > $b` | `$a gt $b` |
| minore o uguale | `$a <= $b` | `$a le $b` |
| congiunzione | `$a && $b` | `$a and $b` |
| negazione | `!$a` | `$a not` |

La differenza con Java è nella coercizione: `#if($valore)` è un test di verità che accetta `null` (falso), `Boolean` (il suo valore), stringhe vuote e collezioni vuote. Il confronto `$a == $b` confronta i valori con `equals` per le stringhe e i numeri, ma per oggetti senza `equals` diventa un confronto di riferimento, un dettaglio che morde sui record a parità di campi oppure sulle entità JPA con identità non ancora assegnata. Con le classi senza `equals` il confronto tra due istanze equivalenti fallisce senza errore, e il template prende un ramo che sembra sbagliato nella logica dell'applicazione.

```velocity
#set($sconto = 0.0)
#if($cliente.tipo == "business" and $fatturato > 50000)
  #set($sconto = 0.15)
#elseif($cliente.tipo == "business")
  #set($sconto = 0.10)
#end
#if($sconto > 0)
<p>Sconto: $numberTool.format("percent", $sconto)</p>
#end
```

Il caso classico di errore è la divisione intera: `#set($media = $totale / $conteggio)` con due `Integer` produce un intero troncato, mentre il template si aspetta un decimale. La soluzione è calcolare in Java, oppure forzare il tipo con `#set($media = $totale.doubleValue() / $conteggio.doubleValue())`.

## Macro parametriche e body

`#macro` accetta più argomenti e può richiamare altre macro. Da Velocity 2.0 le chiamate valutano gli argomenti una volta sola, ma il template resta sensibile all'ordine: le macro globali hanno priorità diversa da quelle locali, e una macro definita nel template vince su una omologa della libreria.

```velocity
#macro(cella valore css)
<td class="$!{css}">$!{valore}</td>
#end

#macro(rigaStato stato)
<tr>
  #cella($stato.nome "nome")
  #cella($stato.dal "data")
</tr>
#end

#macro(sezioni elenco)
#foreach($s in $elenco)
  <section data-id="$s.id">$!bodyContent</section>
#end
#end

#@sezioni($blocchi)
  <p>Contenuto condiviso da ogni sezione</p>
#end
```

La sintassi `#@nome(args) ... #end` passa un blocco a una macro che lo consuma con `$!bodyContent`: serve per i wrapper, cioè quando il template vuole avvolgere una porzione di contenuto. `$bodyContent` è un riferimento valutabile, quindi la macro lo inserisce nel punto esatto del layout. Il body non può essere usato due volte nello stesso punto senza duplicare il contenuto, dato che si tratta di uno stream valutato durante la fusione.

| Scenario | Costrutto | Attenzione |
| --- | --- | --- |
| frammento con parametri | `#macro` con argomenti | `velocimacro.arguments.strict` segnala i mancanti |
| wrapper di layout | `#@macro ... #end` con `$bodyContent` | un body per chiamata |
| macro con nome uguale | macro locale e globale | `velocimacro.inline.replace_global` decide il vincitore |
| macro in più file | libreria `.vtl` | `velocimacro.library.path` ammette liste |
| ricorsione | macro che si richiama | consuma stack Java: limita la profondità |

## Controllo del flusso e valutazione

Oltre a `#if` e `#foreach`, VTL offre `#break` per interrompere il ciclo, `#stop` per fermare la fusione lasciando l'output prodotto fino a quel punto, `#evaluate` per interpretare una stringa come template e `#define` per creare un blocco riutilizzabile senza macro. `#macro` è preferibile a `#evaluate` quasi sempre: il secondo analizza il testo a runtime, quindi introduce un costo su ogni fusione e un punto in cui una variabile non controllata diventa codice.

```velocity
#foreach($riga in $righe)
  #if($riga.esclusa)
    #break
  #end
  $riga.articolo
#end

#define($riepilogo)Fatture: $conteggio totale: $totale#end
<p>$riepilogo</p>
```

`#stop` è utile per i template di errore o per i documenti che devono terminare quando un dato obbligatorio manca, ma il rendering parziale può rompere il formato: un JSON o un HTML troncati a metà sono peggio di un'eccezione. Il suo ruolo più sano è con il messaggio di debug, che finisce nel log del motore.

## Formattazione senza logica nel template

Il difetto ricorrente dei template di report è la formattazione fatta con `#set` e `String.format` sparsi per il file. La stessa operazione ripetuta in cinque punti produce cinque varianti, e il test compare in uno solo. Le alternative sono due: una libreria di macro per il progetto, oppure gli strumenti di Velocity Tools, che espongono object `NumberTool` e `DateTool` con un formato omogeneo.

```velocity
#set($importo = $numberTool.format("currency", $fattura.totale()))
#set($data = $dateTool.format("dd/MM/yyyy", $fattura.emissione))
#set($percentuale = $numberTool.format("percent", $sconto))
```

Gli strumenti vanno registrati nel contesto o tramite `ToolManager`; il vantaggio rispetto a una macro fatta in casa è che il formato si configura in un punto e rispetta il `Locale` della richiesta, quindi lo stesso template produce `1.234,50` per l'Italia e `1,234.50` per gli Stati Uniti senza modifiche. La controindicazione è che `NumberTool` e `DateTool` sono pensati per i formati standard: se il report richiede un formato fiscale specifico, una macro di libreria è più leggibile di una catena di opzioni. Quando non si vuole la dipendenza, la macro di libreria resta la scelta giusta, con la regola che ogni formattazione esiste in un solo posto.

| Dato | Forma consigliata | Trappola |
| --- | --- | --- |
| importo | `$numberTool.format("currency", $v)` | separatore decimale dipendente dal `Locale` |
| data | `$dateTool.format("dd/MM/yyyy", $d)` | `Date` contro `LocalDate` non sono intercambiabili |
| percentuale | `$numberTool.format("percent", $v)` | `BigDecimal` vs `double` cambia l'arrotondamento |
| `null` | `$!valore` o default con `#set` | `$valore` produce testo letterale |

## Errori comuni

- **Confrontare tipi diversi senza conversioni**: `Integer` contro `Double` non produce il risultato atteso, e in strict mode è un'eccezione.
- **Fare aritmetica complessa nel template**: divisioni intere, arrotondamenti e IVA vanno in Java, dove si testano.
- **Richiamare una macro con un nome esistente nella libreria**: il comportamento cambia con `velocimacro.inline.replace_global` e il template diventa dipendente dall'ordine di caricamento.
- **Usare `#evaluate` con input dinamico**: qualunque stringa può contenere direttive; è una superficie di iniezione.
- **Assumere che `$bodyContent` si possa riusare in punti diversi**: il blocco è valutato durante la fusione e va trattato come output, non come valore memorizzato.
- **Testare il template con dati troppo ordinati**: valori `null`, liste vuote e numero zero sono i casi che rompono la formattazione.

## In sintesi

La parte avanzata di VTL si riduce a tre competenze: sapere come valutano gli operatori rispetto ai tipi Java, scrivere macro che non duplicano logica e delegare la formattazione a un punto solo. `#@macro` e `$bodyContent` coprono i layout, `#break` e `#stop` i casi di uscita, `#evaluate` va riservato ai casi in cui non esiste alternativa. Il resto è disciplina: gli errori tipici non sono sintattici ma di contratto tra il contesto e il template.

## Fonti

- [Apache Velocity - VTL Reference](https://velocity.apache.org/engine/2.3/vtl-reference.html)
- [Apache Velocity - User Guide](https://velocity.apache.org/engine/2.3/user-guide.html)
- [Apache Velocity Tools](https://velocity.apache.org/tools/3.1/)
- [Apache Velocity - Configuration Reference](https://velocity.apache.org/engine/devel/configuration.html)
