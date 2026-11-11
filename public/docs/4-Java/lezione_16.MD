# Lezione 16: Git e GitHub

Git registra la storia del progetto. Ogni **commit** è una fotografia dei file con un messaggio che spiega il cambiamento. Con Git puoi tornare indietro, confrontare versioni e lavorare su più linee di sviluppo.

### Concetti essenziali

| Concetto | Significato |
| --- | --- |
| repository | cartella del progetto tracciata da Git |
| commit | insieme di modifiche salvate con un messaggio |
| branch | linea di sviluppo indipendente |
| remote | copia del repository su un server, di solito `origin` |
| working tree | i file come sono adesso |
| staging area | le modifiche pronte per il prossimo commit |

### Configurazione iniziale

Una volta sola, sul computer:

```bash
git config --global user.name "Nome Cognome"
git config --global user.email "nome@email.it"
git config --global init.defaultBranch main
```

Verifica:

```bash
git config --list
```

### Primo repository

```bash
mkdir rubrica
cd rubrica
git init
```

Crea i file, poi:

```bash
git status
git add Main.java
git commit -m "Aggiunge primo programma"
```

- `git add` mette le modifiche nell'area di staging.
- `git commit` salva lo staging nella storia.
- `git add .` aggiunge tutto, ma controlla prima `git status`: potresti includere file che non vuoi.

### Il ciclo quotidiano

```bash
git status          # cosa è cambiato
git diff            # differenze non ancora in staging
git add Main.java
git diff --staged   # differenze pronte per il commit
git commit -m "Aggiunge menu principale"
git log --oneline   # storia compatta
```

Un buon messaggio di commit:

- al modo imperativo: `Aggiunge validazione email`;
- corto: una riga sotto i 70 caratteri;
- specifico: non `modifiche`, ma `Corregge calcolo IVA su importi negativi`;
- un commit = un cambiamento logico.

### Branch e merge

Un branch permette di lavorare su una funzionalità senza toccare il ramo principale.

```bash
git switch -c feature/ricerca
```

Su Git più vecchi `git checkout -b feature/ricerca` fa lo stesso. Lavora, poi:

```bash
git add .
git commit -m "Aggiunge ricerca contatti"

git switch main
git merge feature/ricerca
```

Dopo il merge puoi cancellare il branch:

```bash
git branch -d feature/ricerca
```

Se due branch modificano la stessa riga, nasce un **conflitto**: Git segnala i file, tu scegli il contenuto finale, poi `git add` e `git commit`.

```bash
git branch            # elenco branch
git switch main       # cambia branch
git merge --abort     # annulla un merge in corso
```

### GitHub

GitHub ospita repository Git remoti. Collega il locale:

```bash
git remote add origin https://github.com/utente/rubrica.git
git branch -M main
git push -u origin main
```

Da quel momento:

```bash
git pull      # scarica e integra le modifiche remote
git push      # invia i commit
git remote -v # verifica l'indirizzo
```

Su GitHub trovi anche:

- **Issues** per attività e bug;
- **Pull Request** per proporre modifiche e farle revisionare;
- **Actions** per compilare e testare a ogni push;
- **Releases** per pubblicare versioni.

### Annullare modifiche

| Situazione | Comando |
| --- | --- |
| Scartare le modifiche non salvate di un file | `git restore Main.java` |
| Togliere un file dallo staging | `git restore --staged Main.java` |
| Modificare l'ultimo commit (non ancora inviato) | `git commit --amend` |
| Tornare a un commit precedente in un nuovo commit | `git revert <hash>` |
| Vedere un file in una versione precedente | `git show <hash>:Main.java` |

`git reset --hard` cancella modifiche non salvate: usalo solo se sai esattamente cosa perdi.

### .gitignore

I file generati non vanno versionati.

```gitignore
target/
build/
out/
*.class
*.jar
.idea/
*.iml
.vscode/
.DS_Store
```

Se un file già tracciato deve essere ignorato:

```bash
git rm --cached file-generato.txt
```

### Esempio: storia leggibile

```text
* 9f2c1a0 Aggiunge ricerca per cognome
* 4b7e3d1 Aggiunge classe Contatto con validazione
* 2a1c9f8 Aggiunge menu principale
* 7d3b5c2 Primo commit
```

Chi legge la storia capisce il percorso del progetto senza aprire il codice. Una storia disordinata (`update`, `fix`, `asdf`) non aiuta nessuno, nemmeno te fra due settimane.

### Errori comuni

- Fare commit di `target/` o di file di configurazione dell'IDE.
- Messaggi generici che non dicono cosa è cambiato.
- Un commit enorme con dieci funzionalità diverse.
- Forzare il push (`--force`) su un branch condiviso: cancella il lavoro altrui.
- Salvare password o token nel repository, anche in un commit vecchio: restano nella storia.
- Lavorare sempre su `main` e non usare mai i branch.

## Esercizi progressivi

**Esercizio 1.** Crea un progetto Java, esegui `git init`, aggiungi un file e fai il primo commit.

**Esercizio 2.** Modifica un file e osserva le differenze con `git status` e `git diff` prima di fare commit.

**Esercizio 3.** Fai tre commit separati per tre cambiamenti diversi e guarda la storia con `git log --oneline`.

**Esercizio 4.** Crea un `.gitignore` per Java e verifica con `git status` che `target/` non compaia.

**Esercizio 5.** Crea un branch `feature/saluto`, aggiungi una classe, fai commit, torna su `main` e unisci.

**Esercizio 6.** Modifica un file e annulla con `git restore`: verifica che le modifiche siano sparite.

**Esercizio 7.** Crea un repository su GitHub, collegalo con `git remote add` e carica il progetto con `git push -u origin main`.

**Esercizio 8.** Apri una issue nel repository e chiudila con un commit che cita il numero.

**Esercizio 9.** Crea un conflitto di proposito su due branch, risolvilo e completa il merge.

**Esercizio 10.** Recupera il contenuto di un file da un commit precedente con `git show` e ripristinalo.

### Varianti

- Scrivi il `README.md` del progetto con descrizione, requisiti e comandi.
- Aggiungi un file `LICENSE` e spiega nel README la licenza scelta.
- Usa `git log --graph --oneline --all` per vedere la struttura dei branch.
