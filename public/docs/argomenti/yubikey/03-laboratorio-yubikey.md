In questo laboratorio usi una YubiKey 5 (o un dispositivo FIDO2 equivalente) per tre scopi concreti: registrarla come credenziale WebAuthn su un sito di test, usarla come smart card PIV per l'accesso SSH a un server e riservare una seconda chiave come backup. Il criterio non è "la chiave funziona", ma "so rifare tutto il percorso, so dimostrare che la credenziale non è esportabile e so cosa fare se il dispositivo si perde".

## Obiettivi

- Verificare che il sistema operativo veda tutte le interfacce della chiave.
- Mostrare le informazioni di FIDO2 e PIV con gli strumenti ufficiali Yubico.
- Registrare una passkey su una relying party di test e vedere la credenziale salvata.
- Configurare PIV slot 9a per SSH con PKCS#11 e provare la firma con il PIN.
- Scrivere la procedura di backup e sostituzione e verificare il secondo fattore.

## Passo 1: riconoscere le interfacce

Su Windows il dispositivo appare come smart card e come token FIDO; su Linux compare come `hidraw` e come lettore PC/SC. Se `ykman` non vede la chiave, il problema è quasi sempre l'accesso alle regole udev o l'uso di un hub USB: prima di cambiare configurazione va esclusa la causa fisica.

```bash
# macOS: brew install ykman ; Linux: sudo apt install yubikey-manager
ykman info              # seriale, versione firmware, form factor
ykman list --serials
ykman fido info         # versione FIDO2, PIN configurato
ykman piv info          # slot con certificati

# Linux: permessi sui dispositivi HID
ls -l /dev/hidraw* ; udevadm info -q property -n /dev/hidraw3 | grep -i yubico
```

| Interfaccia | Cosa espone | Strumento |
| --- | --- | --- |
| FIDO2 | credenziali non esportabili | `ykman fido`, WebAuthn API |
| PIV | certificati X.509 negli slot 9a/9c/9d/9e | `ykman piv`, `pkcs11-tool` |
| OATH | segreti TOTP/HOTP | `ykman oath` |
| OTP | codice a tastiera | `ykman otp` |

## Passo 2: una passkey su sito di test

Usa una relying party di test che mostra i dati grezzi (`webauthn.io` o il tuo laboratorio SSO della lezione precedente). Prima di registrare, imposta il PIN FIDO2 e verifica che il tocco sia richiesto: una chiave che firma senza tocco è un secondo fattore più debole, perché chiunque abbia accesso fisico la usa.

```bash
ykman fido access change-pin      # PIN FIDO2, diverso dal PIN PIV
ykman fido config toggle-always-uv  # richiedi sempre la verifica utente (o il tocco)
ykman fido credentials list        # elenco delle credenziali residenti
```

Nella pagina di test registra la chiave con "user verification required". Alla fine della cerimonia il sito mostra `credentialId` e la chiave pubblica in COSE: salva questi valori, servono per il test di verifica. Poi fai login: il browser chiede il tocco e il PIN, e il server verifica la firma. Prova a ripetere la registrazione su un dominio simile (`http://localhost` contro `http://127.0.0.1`): il secondo tentativo non deve produrre la stessa credenziale, perché cambiare origine significa cambiare `rpId`.

## Passo 3: PIV per SSH

Qui la chiave diventa una smart card certificata. Si genera la chiave privata **dentro** il dispositivo con `ykman piv keys generate`, si crea un certificato sullo slot 9a e si estrae la chiave pubblica in formato OpenSSH.

```bash
# 1. chiave privata generata nel dispositivo (MAI esportata)
ykman piv keys generate --algorithm ECCP256 --pin-policy ONCE --touch-policy ALWAYS 9a -

# 2. certificato autofirmato sullo slot 9a
ykman piv certificates generate --subject "CN=admin-mario" -a ECCP256 9a

# 3. chiave pubblica OpenSSH ricavata dal certificato dello slot
ykman piv certificates export 9a - | openssl x509 -noout -pubkey \
  | ssh-keygen -i -m PKCS8 -f /dev/stdin > mario_ssh.pub
ssh-copy-id -i mario_ssh.pub admin@lab-web-01

# 4. uso: lo slot 9a richiede PIN una volta e tocco a ogni firma
ssh -o PKCS11Provider=/usr/lib/x86_64-linux-gnu/libykcs11.so admin@lab-web-01
```

Il PIN su `ONCE` significa una digitazione per sessione SSH; `touch-policy ALWAYS` impone il tocco fisico a ogni firma. Se il server rifiuta la chiave, controlla prima `ssh -v` per l'offerta della chiave, poi il contenuto di `authorized_keys`: la chiave pubblica estratta da un certificato X.509 deve essere convertita nel formato OpenSSH, altrimenti la verifica non parte nemmeno.

## Passo 4: backup e sostituzione

La chiave persa è una scena da copione, non un'imprevista. Due dispositivi registrati sulla stessa identità, uno in uso e uno in luogo sicuro, sono il minimo; entrambi devono essere provati periodicamente, perché una chiave in un cassetto non si guasta da sola ma la sua registrazione può essere revocata per errore.

| Rischio | Mitigazione | Verifica |
| --- | --- | --- |
| Chiave persa | seconda chiave registrata | login con la seconda ogni 6 mesi |
| Chiave rubata | PIN FIDO2 robusto, tocco richiesto | tentativo con PIN errato e blocco |
| Credenziale revocata per errore | elenco credenziali e procedura di re-enrolment | prova controllata di revoca e ri-registrazione |
| Dispositivo vecchio | migrazione pianificata prima della dismissione | inventario con seriale e holder |

```bash
# documenta l'inventario: seriale, interfaccia, uso, custodia
ykman info --format json | jq '{serial: ."Serial number", fw: ."Firmware version"}'
```

Il registro dell'inventario è ciò che rende possibile una revoca ordinata: quando un dipendente lascia l'organizzazione, si revoca la credenziale WebAuthn, si cancella il certificato PIV dalle CA e si riassegna la chiave con `ykman piv reset`, che azzera gli slot ma non rende riutilizzabile la credenziale FIDO2 registrata altrove: quella va revocata dal server.

## Errori comuni

- **Copiare o esportare la chiave privata PIV**: `ykman` genera la chiave in hardware proprio per impedirlo; non esiste un "backup" del profilo PIV, si fa backup del certificato, non della chiave.
- **PIN uguale per FIDO2 e PIV**: la compromissione di uno espone l'altro; sono due domini distinti con due PIN e due politiche.
- **Nessun tocco richiesto**: la firma avviene su richiesta di ogni software, e un malware può usare la chiave inserita come fattore senza interazione.
- **Reset del dispositivo prima di revocare le credenziali**: le credenziali FIDO2 restano sui server e vanno rimosse esplicitamente.
- **Testare solo su Linux e consegnare su Windows**: la PIV richiede middleware e il driver CCID va verificato sulla macchina di destinazione.

## In sintesi

La YubiKey si configura con due PIN distinti e due politiche di tocco, e si usa per WebAuthn e per PIV senza esportare alcuna chiave. Il test più importante non è il login riuscito ma la verifica della seconda chiave, della revoca e della re-registrazione. L'inventario con seriale e holder è ciò che permette una gestione ordinata quando il dispositivo si perde, si guasta o cambia proprietario.

## Fonti

- [Yubico Developers - yubico-piv-tool](https://developers.yubico.com/yubico-piv-tool/)
- [Yubico - YubiKey Hardware](https://www.yubico.com/products/yubikey-hardware/)
- [W3C - Web Authentication (WebAuthn)](https://www.w3.org/TR/webauthn-3/)
- [Yubico Support](https://support.yubico.com/)
