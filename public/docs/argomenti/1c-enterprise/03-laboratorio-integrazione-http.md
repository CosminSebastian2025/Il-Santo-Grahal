In questo laboratorio colleghi una configurazione 1C:Enterprise a un servizio HTTP esterno, usando solo strumenti ufficiali della piattaforma: crei un `HTTPСервис` con due rotte, un client in uscita con timeout e retry idempotente, e una suite di test che chiama il servizio con `curl` e verifica anche i casi di errore. L'obiettivo non è imparare il look del Configuratore, ma uscire con un contratto verificabile e una configurazione che si può rieseguire da zero.

## Obiettivi

- Pubblicare un servizio HTTP su una base demo creata da file `.cf`.
- Separare la logica di dominio (`ОбщийМодуль`) dal gestore della rotta.
- Implementare un client in uscita con timeout, retry e idempotency key.
- Verificare il tutto con `curl` e con un test `xUnitFor1C` che non richiede rete.
- Scrivere il risultato in un file `.cf` versionabile, senza modifiche non tracciate.

## Il contratto del laboratorio

Il servizio `integrazione` pubblica due rotte su un dominio semplificato: un registro di prenotazione delle scorte.

Il tipo di risposta è in ogni caso `application/json`.

| Metodo e percorso | Corpo | Risposta |
| --- | --- | --- |
| `GET /hs/integrazione/v1/scorte/{Артикул}` | — | `200` con `{"артикул":..., "доступно":N}` o `404` |
| `POST /hs/integrazione/v1/ordini` | `{"артикул","количество","key"}` | `201` primo invio, `200` su ripetizione della stessa `key` |
| `POST` senza `key` | campo mancante | `400` con `{"error":"key obbligatoria"}` |
| qualsiasi | `Accept: text/html` | `406`, il servizio serve solo JSON |

```bash
# base demo da template, porta 8080
1cv8.exe CREATEINFOBASE File="C:\bases\lab" /AddInList lab
1cv8.exe DESIGNER /F "C:\bases\lab" /N Администратор /P "" /LoadConfigFromFiles "src\md" /UpdateDBCfg
```

I nomi degli eseguibili dipendono dalla versione (8.3.24, 8.3.27): il client sottile è `1cv8s.exe`, quello di sviluppo `1cv8.exe`. Il passo importante è che i metadati entrano nel repository come file XML con `LoadConfigFromFiles`, così la configurazione è diff-abile.

## Passo 1: dominio e gestore della rotta

Il dominio sta in un modulo comune con funzioni senza effetti collaterali sul server HTTP: riceve dati, restituisce un risultato, non tocca il contesto.

```bsl
// ОбщийМодуль.МодульИнтеграции
Функция НайтиДоступное(Артикул) Экспорт
    Запрос = Новый Запрос;
    Запрос.Текст = "ВЫБРАТЬ ПЕРВЫЕ 1 Доступно ИЗ РегистрНакопления.СкладОстатки.Остатки(&Дата) ГДЕ Артикул = &Артикул";
    Запрос.УстановитьПараметр("Артикул", Артикул);
    Запрос.УстановитьПараметр("Дата", ТекущаяДатаСеанса());
    Выборка = Запрос.Выполнить().Выбрать();
    Если Выборка.Следующий() Тогда
        Возврат Выборка.Доступно;
    КонецЕсли;
    Возврат Неопределено;
КонецФункции

Функция ПринятьЗаказ(Артикул, Количество, Ключ) Экспорт
    Если Не ЗначениеЗаполнено(Ключ) Тогда
        Возврат Новый Структура("код", 400, "ошибка", "key obbligatoria");
    КонецЕсли;
    // запись в регистр сведений ИдемпотентностьКлюч: повтор ключа возвращает прежний номер
    Возврат Новый Структура("код", 201, "номер", НомерЗаказа(Артикул, Количество, Ключ));
КонецФункции
```

Il gestore della rotta legge il JSON, chiama il dominio e traduce il risultato in codice di stato. Non contiene query, non contiene regole di business e non scrive log di dominio.

```bsl
// Модуль HTTPСервиса, обработчик POST ordini
Функция ПринятьЗаказОбработчик(Запрос)
    Тело = ПрочитатьJSON(Запрос.ПолучитьТелоКакПоток());
    Результат = МодульИнтеграции.ПринятьЗаказ(Тело.артикул, Тело.количество, Тело.key);
    Запрос.Ответ.КодСостояния = Результат.код;
    Запрос.Ответ.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");
    Возврат Новый Структура("номер", Результат.номер);
КонецФункции
```

`ПрочитатьJSON` restituisce mappa, array o scala secondo il JSON; leggere il corpo come flusso evita di caricarlo due volte. Un JSON malformato solleva un'eccezione: senza cattura il servizio risponde 500 invece di 422.

## Passo 2: test di contratto con `curl`

Verifica il contratto dall'esterno, con gli strumenti del chiamante reale: quattro chiamate coprono quasi tutti i difetti iniziali.

```bash
BASE=http://localhost:8080/hs/integrazione/v1
curl -si $BASE/scorte/A-100              # 200 con disponibilità
curl -si $BASE/scorte/INESISTENTE        # 404, non 200 con null
curl -si -X POST $BASE/ordini -H "Content-Type: application/json" \
     -d '{"артикул":"A-100","количество":2,"key":"k-1"}'   # 201
curl -si -X POST $BASE/ordini -H "Content-Type: application/json" \
     -d '{"артикул":"A-100","количество":2,"key":"k-1"}'   # 200, stesso numero
```

Il quarto comando smaschera la maggior parte delle integrazioni: se risponde `201` con un numero diverso, la chiave non è persistita e i retry creeranno duplicati.

## Passo 3: client in uscita e test senza rete

Il client in uscita deve avere un timeout esplicito, un numero limitato di retry e un backoff. Per i test senza rete si sostituisce il chiamante con un parametro iniettato nel modulo comune, oppure con un modulo esterno (`ВнешнийОтчет`) che restituisce risposte finte.

```bsl
Функция Отправить(Адрес, Тело, ТаймаутСек = 30) Экспорт
    Соединение = Новый HTTPСоединение(Хост(Адрес), Порт(Адрес), , , , ТаймаутСек);
    Для Попытка = 1 По 3 Цикл
        Ответ = Соединение.ОтправитьДляСоединения( Новый HTTPЗапрос(Путь(Адрес)), Тело );
        Если Ответ.КодСостояния < 500 Тогда
            Возврат Ответ;
        КонецЕсли;
        Пауза(5);
    КонецЦикла;
    ВызватьИсключение "Troppi errori 5xx";
КонецФункции
```

```bsl
// Тест домена без HTTP
Процедура Тест_КлючОбязательна() Экспорт
    Результат = МодульИнтеграции.ПринятьЗаказ("A-100", 1, "");
    Утверждение.УтвердитьРавно(Результат.код, 400);
КонецПроцедуры
```

I retry si applicano solo ai 5xx e ai timeout: ripetere un 400 o un 422 è inutile e, con un gateway a valle, pericoloso. Con 3 tentativi da 30 secondi il client occupa al massimo 90 secondi per richiesta: valutalo sui limiti del server.

## Esercizi

1. Aggiungi `Accept` handling sulla rotta e verifica con `curl -H "Accept: text/html"` che risponda 406.
2. Aggiungi una rotta `GET /ordini?dal=...&al=...` con paginazione `limit`/`offset` e dimensioni massime.
3. Sposta la chiave di idempotenza in una tabella con indice unico invece del registro sessagesimale.
4. Misura con `1cv8.exe DESIGNER /RunTests` il tempo della suite, prima e dopo aver spostato la logica fuori dal servizio, e annota la differenza.

<details>
<summary>Soluzione</summary>

1. Il controllo va all'inizio dell'handler: se `Accept` non contiene `application/json` né `*/*`, rispondi 406 con un corpo JSON minimo. È meglio di una 200 con HTML che rompe il client.

2. La query estrae con il filtro temporale sul registro; `limit` viene letto e validato (massimo 1000) e `offset` non negativo. Senza il massimo, un client può leggere l'intero registro.

3. Tabella con indice unico su `Ключ`, e `Try/Catch` sull'eccezione di vincolo per ritornare il numero esistente. Il registro non garantisce unicità globalmente.

4. Senza rete la suite gira in pochi secondi; con il servizio HTTP in linea ogni test paga connessione e autenticazione, e la differenza è di un ordine di grandezza.

</details>

## Errori comuni

- **Pubblicare il servizio senza prova negativa**: un 200 con `null` al posto del 404 nasconde errori di permessi, e un cliente fidato non se ne accorge.
- **Retry anche sui 4xx**: ripete una richiesta già rifiutata e può duplicare effetti.
- **Credenziali in chiaro nel codice**: finiscono in `.cf` e vanno sostituite alla prima rotazione.
- **Aggiungere rotte senza aggiornare la descrizione della collezione**: il contratto cambia senza documentazione e i client si rompono.
- **Non versionare i metadati**: senza export XML niente code review né rollback selettivo; conviene inoltre una base demo separata da quella di collaudo, per non macchiare i dati durante le prove.

## In sintesi

Il laboratorio ha costruito la sequenza di integrazione tipica: contratto, dominio testabile, gestore sottile, client con timeout e idempotenza, test dall'esterno. Due punti sono fondanti: l'idempotency key persistita e il 4xx non ritentato. Con questi la configurazione può parlare con servizi moderni senza cambiare la struttura del gestionale.

## Fonti

- [What is 1C:Enterprise? - 1C:Developer Network](https://1c-dn.com/1c_enterprise/what_is_1c_enterprise/)
- [Getting Started - 1C:Developer Network](https://1c-dn.com/1c_enterprise/getting_started/)
- [Knowledge base - 1C:Developer Network](https://1c-dn.com/library/)
- [1С:Предприятие - стандарты разработки (its.1c.ru)](https://its.1c.ru/db/v8std)
