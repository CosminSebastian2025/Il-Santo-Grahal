Nel TLS classico il server dimostra la propria identità e il client resta anonimo a livello di protocollo: tutto ciò che il server sa è che qualcuno ha aperto una connessione. Con mTLS (mutual TLS) anche il client presenta un certificato e il server ne verifica la catena, la firma e le proprietà prima di concedere l'accesso. È il meccanismo che sta dietro a molte comunicazioni service-to-service, a gateway che proteggono API interne e ai dispositivi che devono entrare in una rete di controllo. Va distinto con precisione da due concetti vicini — cifratura e autenticazione utente — per non attribuirgli compiti che non ha.

## Obiettivi

- Descrivere lo scambio mTLS dentro l'handshake TLS 1.3 e dove interviene il certificato client.
- Distinguere autenticazione del canale da autorizzazione applicativa e da autenticazione dell'utente.
- Capire cosa fa un service mesh e cosa cambia nella gestione degli identity.
- Scegliere tra mTLS, token firmati e VPN in base allo scenario.

## Dove si inserisce il certificato client

In TLS 1.3 il server manda il proprio certificato insieme a `CertificateVerify`; se la configurazione lo prevede, invia anche un `CertificateRequest` con l'elenco delle CA accettate. Il client risponde con la propria catena e la firma del transcript, e il server valida: catena fino a una CA fidata, `extendedKeyUsage` con `clientAuth`, validità temporale, policy di revoca. I certificati e le `CertificateVerify` di entrambe le parti sono protetti da TLS, quindi il client non è anonimo nemmeno per i passivi.

```text
client → server : ClientHello (SNI, key_share, ...)
server → client : ServerHello, {EncryptedExtensions}, {CertificateRequest},
                  {Certificate}, {CertificateVerify}, {Finished}
client → server : {Certificate}, {CertificateVerify}, {Finished}   ← prove of possession
                  Application Data
```

Due proprietà sono decisive. La prima: il client deve **possedere** la chiave privata, non solo mostrare un certificato, altrimenti chiunque copi un file pubblico si autentica. La seconda: il server accetta solo certificati emessi da CA che ha configurato; un certificato valido emesso da *qualsiasi* CA pubblica non deve bastare, altrimenti ogni cliente di quella CA può tentare l'accesso. Nelle configurazioni reali si vincola una CA privata dedicata, eventualmente con un certificato intermedio separato per ambiente.

| Verifica | Strumento di policy | Se manca |
| --- | --- | --- |
| catena e CA di fiducia | trust store del server | client non fidati o troppo fidati |
| `clientAuth` nell'EKU | regola su certificato | certificati nati per altri scopi accettati |
| validità e revoca | CRL, OCSP o short-lived | certificati scaduti o compromessi attivi |
| identità del client | SAN/CN → mapping ruolo | tutti i client sono uguali |

## Cosa mTLS non fa

mTLS autentica **il canale e il possessore della chiave**: non dice nulla su cosa quel client può fare. Un certificato valido per un servizio è un'identità, e l'autorizzazione resta un compito dell'applicazione o del gateway, che mappa il certificato (di solito il SAN) su un ruolo. mTLS non protegge nemmeno da un client compromesso: se l'attaccante controlla la macchina, può usare la chiave per quell'identità finché il certificato è valido. Da qui nascono le pratiche che rendono mTLS gestibile: certificati a vita breve, rotazione automatica, revoca rapida, e separazione dei privilegi in modo che un servizio compromesso non possa impersonarne un altro oltre i propri permessi.

| Scenario | mTLS | Token firmato | VPN |
| --- | --- | --- | --- |
| servizio → servizio interno | primo canale, identità mTLS | base con audience e scadenza | troppo grossolano |
| API esposte a partner | certificate binding per cliente | OAuth client credentials | non adatto |
| utenti finali nel browser | non pratico | OIDC | no |
| dispositivi IoT | adatto con CA dedicata | scomodo su hardware semplice | lavoro supplementare |
| amministrazione interna | sì, con CA e rotazione | con MFA | opzione |

## Service mesh: mTLS gestito

In un cluster Kubernetes manuale, mTLS significa distribuire CA, certificati e revisione degli stessi per ogni servizio; questo è il motivo per cui i service mesh (Istio, Linkerd) lo automatizzano: un sidecar intercetta il traffico, richiede e presenta certificati emessi da una CA interna, ruota ogni giorno o ogni poche ore e negozia la corsa anche per il traffico in chiaro su localhost. Il risultato è che nessun servizio deve modificare il codice per avere una connessione autenticata e cifrata.

| Modello | Chi emette | Rotazione | Attraversa il codice |
| --- | --- | --- | --- |
| CA privata manuale | il team | manuale, 1–2 anni | sì, configurazione client |
| Certificate Manager cloud | servizio del provider | automatica | sì |
| Service mesh | CA interna al cluster | automatica, ore | no |
| Gateway + mTLS | CA aziendale | policy | no, solo gateway |

Un caso spesso richiesto in produzione è la combinazione con OAuth: la RFC 8705 permette di **legare un access token al certificato client** (`cnf.x5t#S256`). Il token viaggia in `Authorization: Bearer` ma vale solo se presentato sulla stessa connessione mTLS usata per ottenerlo, quindi un token rubato non basta per impersonare il client. È la soluzione per chi ha già un'autorizzazione OAuth e vuole aggiungere un vincolo crittografico senza sostituire il modello degli scope.

## Errori comuni

- **Fidarsi di una CA pubblica per i client**: una qualunque entità con certificato della stessa CA può tentare l'accesso; la CA deve essere dedicata.
- **Confondere mTLS con autenticazione utente**: un certificato nel browser è raro e scomodo, e non sostituisce l'SSO degli utenti.
- **Accettare certificati senza vincolo di EKU**: certificati emessi per altro scopo finiscono per autenticare client.
- **Rotazione manuale**: nel momento in cui scade un certificato, il servizio si ferma; la rotazione deve essere automatica e verificata.
- **Revoca non distribuita**: un certificato compromesso resta valido fino alla scadenza se il server non controlla CRL o non usa certificati brevi.

## In sintesi

mTLS mette un certificato al posto del client anonimo e sposta l'affidabilità dal "chi ha aperto la connessione" al "chi possiede quella chiave". Il server verifica catena, EKU e revoca, e l'applicazione deve autorizzare l'identità ricevuta. I service mesh automatizzano il ciclo di vita, ma il rischio del client compromesso resta e si governa con certificati brevi, rotazione e minimo privilegio.

## Fonti

- [RFC 8446 - The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 5280 - Internet X.509 Public Key Infrastructure Certificate](https://www.rfc-editor.org/rfc/rfc5280)
- [RFC 8705 - OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens](https://www.rfc-editor.org/rfc/rfc8705)
- [nginx - ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
