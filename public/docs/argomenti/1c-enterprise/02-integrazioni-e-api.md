Nella pratica italiana ed europea 1C:Enterprise arriva quasi sempre per necessità di integrazione: un gestionale russo o kazako che deve parlare in HTTP con un'applicazione aziendale. La piattaforma offre tre strade — servizi HTTP che esponi tu, servizi web SOAP descritti da WSDL, e OData per accedere ai dati in standard REST — più il client HTTP per le chiamate in uscita. Qui vedi come si costruiscono, come si autenticano e come si rendono verificabili.

## Obiettivi

- Esporre un servizio HTTP dalla configurazione e controllare autenticazione e metodo.
- Pubblicare un servizio web SOAP o un endpoint OData secondo lo standard.
- Chiamare un servizio esterno con il client HTTP integrato e gestire i codici di errore.
- Scrivere un test di integrazione ripetibile e sicuro per il secret manager.

## Servizi HTTP: quando hai il controllo

Un servizio HTTP è un modulo che la piattaforma pubblica su un percorso `/hs/<nome>`. La definizione avviene nel Configuratore, con l'oggetto `HTTPСервис` (servizio HTTP) e template di URL; i metodi si implementano nel modulo del servizio, senza attributi magici. Il servizio è esposto dal server web o dal server di applicazioni sulla porta della pubblicazione, non da un processo separato.

```bsl
// Обработчик метода POST /hs/integrazione/v1/ordini/{Номер}
Функция СоздатьЗаказ(Номер, Запрос)
    Ответ = Новый Структура("статус", "ok");
    Попытка
        Данные = ПрочитатьJSON(Запрос.ПолучитьТелоКакПоток());
        Если НЕ ЗначениеЗаполнено(Данные.idempotencyKey) Тогда
            Запрос.Ответ.КодСостояния = 400;
            Возврат Новый Структура("error", "idempotencyKey obbligatoria");
        КонецЕсли;
        Ответ.Вставить("номер", Номер);
    Исключение
        Запрос.Ответ.КодСостояния = 422;
        Возврат Новый Структура("error", ErrorDescription());
    КонецПопытки;
    Возврат Ответ;
КонецФункции
```

L'autenticazione è critica: di default i servizi HTTP condividono la sessione e l'autenticazione della pubblicazione (Basic o utente del sistema). Nelle integrazioni server-to-server conviene un utente dedicato con ruoli minimi e, dove previsto, `Пользователи.ПроверитьАутентификацию` esplicita, e non il solo inoltro di `Authorization` da un reverse proxy, che sposta il problema senza risolverlo. Il corpo in entrata va trattato come non fidato: limite di dimensione sulla pubblicazione e validazione dello schema prima della scrittura.

| Tecnologia | Formato | Pubblicazione | Ideale per |
| --- | --- | --- | --- |
| Servizio HTTP | JSON/testo libero | percorso `/hs/...` | API interne su misura |
| Servizio web (SOAP) | XML con WSDL | URL `/ws/...` | sistemi ESB, bancari |
| OData | JSON Atom/Xml | endpoint standard | lettura dati con tool BI |
| Comandi esterni | XML interni | sistema a sistema | scenari legacy |

## Servizi in uscita: client HTTP

In uscita la piattaforma offre `HTTPСоединение` (connessione HTTP) e `ИнтернетСоединение`, oppure le funzioni di alto livello `Получить(uri)` e `Отправить(uri, ...)` per casi semplici. Si usano ServerXMLHttpRequest/ServerHttpRequest come implementazione, e le chiamate vanno sempre in un blocco `Попытка` perché DNS, timeout o TLS falliscono in modi indipendenti dalla logica.

```bsl
Процедура ОтправитьЗаказ(Номер, Режим)
    Соединение = Новый HTTPСоединение("erp.example.com", 443, "integration", Секрет, , 30);
    Запрос = Новый HTTPЗапрос("/api/v2/orders/" + Номер);
    Запрос.Заголовки.Вставить("Content-Type", "application/json");
    Запрос.УстановитьТелоИзСтроки( СформироватьJSON(Режим), КодировкаТекста.UTF8 );
    Ответ = Соединение.ОтправитьДляСоединения(Запрос);
    Если Ответ.КодСостояния >= 400 Тогда
        ЗаписатьЛог("HTTP " + Ответ.КодСостояния); // retry в очереди
    КонецЕсли;
КонецПроцедуры
```

Due problemi ricorrenti. Il primo è la rete: se la piattaforma sta in una DMZ senza uscita, la connessione fallisce e il messaggio è poco parlante; la soluzione è un proxy (`HTTPПрокси`) o un gateway. Il secondo è la ripetività: una chiamata HTTP non è transazionale, quindi l'integrazione deve essere idempotente lato destinazione.

## Testabilità e governance

1C non ha un framework di test ufficiale: si usa `xUnitFor1C` o script lanciati con `1cv8.exe DESIGNER /RunTests`. Il principio è quello dei sistemi web: separare codice HTTP e dominio, così il calcolo si testa senza rete, mettendo la logica in un `ОбщийМодуль` chiamato da un metodo di servizio sottile.

```bsl
// Тест, вызывающий функцию напрямую, без HTTP
Процедура Тест_РассчитатьСкидку() Экспорт
    Утверждение.УтвердитьРавно( РассчитатьСкидку(ДанныеКлиента("постоянный"), 50000), 5000 );
КонецПроцедуры
```

Le credenziali non stanno mai nei moduli: le impostazioni comuni tengono riferimenti, oppure si leggono variabili d'ambiente all'avvio. Per la governance è utile usare:

| Pratica | Cosa risolve |
| --- | --- |
| estensioni invece di modifiche al fornitore | aggiornamenti del prodotto |
| versionamento dei metadati in file XML | diff e code review |
| utente integrazione dedicato | tracciamento e ruoli minimi |
| idempotency key su ogni POST | duplicati nei retry |
| log strutturati (`ЗаписьЖурналаРегистрации`) | diagnosi senza debugger |

Il registro di sistema multiutente serve anche alla fatturazione dell'infrastruttura: in un cluster con più processi, il log locale non basta e si raccoglie centralmente.

## Errori comuni

- **Fidarsi del solo reverse proxy per l'autenticazione**: un endpoint `/hs/` esposto per errore risponde senza controllo.
- **Dimenticare l'idempotenza in uscita**: un timeout seguito da retry crea ordini doppi e nessun errore.
- **Scrivere la logica dentro il gestore HTTP**: il codice diventa impossibile da testare senza infrastruttura.
- **Assumere la semantica REST del client**: l'oggetto HTTP è generico, non valida lo schema e non segue i link.
- **Mettere secret nei metadati o nei file `.cf`**: finiscono nel repository e negli export senza cifratura.
- **Ignorare la differenza tra sessione e token**: un client stateless che apre una sessione per richiesta consuma licenze e rallenta il servizio.

## In sintesi

Le tre vie di integrazione rispondono a esigenze diverse: servizio HTTP per API su misura, SOAP per chi richiede WSDL, OData per dati e BI. In uscita è un client HTTP come gli altri, con tre obblighi: timeout, idempotenza, gestione dei 4xx. La testabilità si ottiene spostando la logica fuori dal modulo di servizio. Il laboratorio chiude il cerchio con un test end-to-end di un flusso ordini.

## Fonti

- [1C:Enterprise, business application platform - 1C:Developer Network](https://1c-dn.com/1c_enterprise/)
- [Getting Started - 1C:Developer Network](https://1c-dn.com/1c_enterprise/getting_started/)
- [1С:Предприятие - стандарты разработки (its.1c.ru)](https://its.1c.ru/db/v8std)
- [infostart.ru - портал разработчиков 1С](https://infostart.ru/)
