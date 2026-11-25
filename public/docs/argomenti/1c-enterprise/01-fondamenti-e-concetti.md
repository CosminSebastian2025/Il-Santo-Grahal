1C:Enterprise (in russo «1С:Предприятие») è una piattaforma applicativa russa per gestionali, contabilità, ERM e software di settore: il codice che scrivi non produce un eseguibile autonomo ma dei moduli che il runtime della piattaforma interpreta. Capire questa differenza — tra ciò che si dichiara in configurazione e ciò che la piattaforma genera a runtime — è il primo passo per lavorarci in un contesto IT contemporaneo, dove quasi sempre la domanda è come integrarla con servizi HTTP e non come sostituirla.

## Obiettivi

- Distinguere piattaforma, configurazione e applicativo, e sapere cosa produce il processo di build.
- Riconoscere gli oggetti di configurazione principali e la relazione tra metadati, dati e moduli.
- Leggere la sintassi di base del linguaggio integrato in modalità gestita.
- Capire ruoli, versioni (8.3.27, 9.x) e posizionamento rispetto a soluzioni occidentali.

## Architettura: piattaforma, configurazione, dati

Una soluzione 1C si compone di tre strati sovrapposti. La **piattaforma** è il runtime installato (client spesso desktop in Windows, server cluster e DBMS); la **configurazione** è l'insieme dei metadati e dei moduli scritti in linguaggio integrato, ossia il codice applicativo; l'**infobase** è il database dove vivono i dati di esercizio.

| Strato | Cos'è | Chi lo modifica |
| --- | --- | --- |
| piattaforma | eseguibile e runtime di 1C | il fornitore 1C |
| configurazione | metadati, moduli, form, ruoli | sviluppatore / partner |
| infobase | dati e cache dei metadati | utenti e processi |
| dati esterni | DBMS (MSSQL, PostgreSQL, IBM DB2, Oracle) | amministratore DB |

Questo modello spiega molte pratiche del mondo 1C: gli aggiornamenti di piattaforma non toccano i dati, mentre le modifiche di configurazione possono richiedere una riorganizzazione dell'infobase. Un'abitudine locale tipica è la **estensione** (`CFE`): si aggiunge una configurazione separata che modifica oggetti esistenti, invece di intervenire direttamente sul fornitore, così gli aggiornamenti restano possibili. La documentazione ufficiale descrive il modello su [1C:Developer Network](https://1c-dn.com/1c_enterprise/what_is_1c_enterprise/).

## Metadati e linguaggio integrato

Gli oggetti di configurazione hanno nomi e convenzioni proprie, ereditati dalla tradizione del prodotto. Una parte dei nomi è in inglese (catalogo, documento, registro) e i nomi degli oggetti sono spesso in russo: non è strano vedere `Справочник.Контрагенты`.

| Oggetto di configurazione | Ruolo | Analogia occidentale |
| --- | --- | --- |
| `Справочник` (Catalogo) | anagrafica gerarchica | tabella di lookup con gerarchia |
| `Документ` (Documento) | evento contabile con movimenti | documento di business + scritture |
| `РегистрНакопления` | saldi e movimenti numerici | tabella di fatti aggregata |
| `Отчёт` (Report) | estrazione con schema composizione dati | report builder |
| `Обработка` (Elaborazione) | procedura guidata o tool | script con UI |
| `ОбщийМодуль` | libreria di funzioni condivise | modulo di servizio |

Il linguaggio integrato è procedurale, ispirato alla tradizione Pascal/VBA, con scope dei moduli e una modalità "gestita" (`УправляемоеПриложение`) in cui l'interfaccia è generata dal sistema. Il codice legge come italiano o russo: le parole chiave sono tradotte in ogni lingua, i nomi sono identificatori liberi.

```bsl
Процедура РассчитатьСкидку(Клиент, Сумма) Экспорт
    Если Клиент.Категория = Перечисления.КатегорииКлиентов.Постоянный Тогда
        Результат = Сумма * 0.1;
    ИначеЕсли Сумма >= 100000 Тогда
        Результат = Сумма * 0.05;
    Иначе
        Результат = 0;
    КонецЕсли;
КонецПроцедуры
```

Le strutture dati di base sono `Структура` (mappa), `ТаблицаЗначений` (tabella in memoria), `Массив` (array) e `Соответствие` (hash map). I tipi sono dinamici, come in JavaScript, ma il compilatore della piattaforma verifica la maggior parte delle assegnazioni statiche.

## Versioni, ruoli ed ecosistema

La linea 8.3 è quella corrente: 1C distribuisce più numeri (8.3.24, 8.3.27) con aggiornamenti incrementali, e una linea 9.x per la piattaforma ERP su nuove basi. L'ecosistema professionale è chiuso: la documentazione di riferimento è su [`its.1c.ru`](https://its.1c.ru/) dietro abbonamento ITS, i corsi su [1C:Developer Network](https://1c-dn.com/learning/1c_courses/), e la certificazione per sviluppatori è gestita da 1C stessa. Il "reposito" di codice nazionale è [infostart.ru](https://infostart.ru/).

| Ruolo | Tipico compito | Strumento |
| --- | --- | --- |
| programmatore | metadati e moduli | Configuratore |
| consulente funzionale | specifica su configurazioni standard | 1C:ERP, 1C:ZUP |
| amministratore | cluster, infobase, backup | Console amministrazione server |
| integratore | HTTP, OData, file | tecnologie di integrazione |

Un dettaglio importante per chi viene da fuori: 1C non è un linguaggio di nicchia solo in Russia; è adottato in Bielorussia, Kazakistan, Uzbekistan e in aziende che gestiscono filiali in quelle aree. La community è numerosa ma poco integrata con GitHub: si usano forum e repository come [infostart.ru](https://infostart.ru/) più di npm o PyPI.

## Errori comuni

- **Considerare la configurazione come un'app compilata**: il risultato è un pacchetto di metadati e moduli eseguiti dal runtime, non un binario indipendente.
- **Modificare il codice del fornitore**: rende impossibili gli aggiornamenti; le estensioni esistono per questo.
- **Scrivere testo russo nei nomi dei metadati senza pianificarne le conseguenze**: nomi come `СкладРезерв` diventano identificatori usati in query e API, e rinominarli costa.
- **Assumere tipi dinamici senza errori**: il linguaggio è coerentemente dinamico, ma gli errori di tipo scattano a runtime, idealmente coperti da test.
- **Copiare codice da forum senza capire la modalità di applicazione**: il codice per modalità normale e gestita non è intercambiabile in tutti i punti.

## In sintesi

1C:Enterprise è una piattaforma con runtime proprietario dove la configurazione è il tuo codice e l'infobase sono i dati. Gli oggetti di metadati (cataloghi, documenti, registri) descrivono il dominio prima del linguaggio, e il linguaggio integrato è procedurale con tipi dinamici. Il valore professionale in Europa dipende quasi sempre dall'integrazione con il web: HTTP, OData, API — ed è lì che si gioca la partita. Nella prossima lezione guardi come si raccorda una configurazione con servizi esterni e come testare il risultato.

## Fonti

- [What is 1C:Enterprise? - 1C:Developer Network](https://1c-dn.com/1c_enterprise/what_is_1c_enterprise/)
- [1C:Enterprise, business application platform - 1C:Developer Network](https://1c-dn.com/1c_enterprise/)
- [Getting Started - 1C:Developer Network](https://1c-dn.com/1c_enterprise/getting_started/)
- [1С:Предприятие - документация и стандарты разработки (its.1c.ru)](https://its.1c.ru/db/v8std)
