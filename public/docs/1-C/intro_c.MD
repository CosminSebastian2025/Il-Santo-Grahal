# Introduzione al C

Il C è un linguaggio di programmazione di basso livello 
che comunica con la macchina attraverso istruzioni che vengono tradotte 
in codice binario. È stato sviluppato negli anni '70 da Dennis Ritchie
presso i Bell Labs ed è diventato uno dei linguaggi più utilizzati 
per lo sviluppo di software di sistema, come sistemi operativi e compilatori.
Questo linguaggio è noto per la sua efficienza e portabilità e il suo utilizzo
per la gestione della memoria e delle risorse hardware lo rende adatto per le 
applicazioni che richiedono prestazioni elevate.

### Vi chiederete il perchè viene usato il C per imparare a programmare invece di un altro linguaggio di programmazione come Python, Java o altri?

Perché il C è un linguaggio di programmazione di basso livello 
più vicino alla macchina per capire esattamente come funziona
il computer. Soprattutto per chi vuole diventare un programmatore 
professionista. Il C è la base di programmazione che viene insegnata 
alle superiori per apprendere i concetti di base e le nozioni che si ripeteranno
anche negli altri linguaggi di programmazione e dove diventa molto più facile da
imparare e utilizzare. Il C è un linguaggio di programmazione che permette di comprendere
come funziona la memoria, come vengono gestite le variabili e come vengono eseguite
le istruzioni.

### Perché il C è un linguaggio di programmazione di basso livello?

Il C è considerato un linguaggio di programmazione di basso livello 
perché permette di interagire direttamente con la memoria e con le risorse hardware,
offrendo un controllo più granulare sul funzionamento del sistema rispetto
ai linguaggi di alto livello.

### Quali programmi software o compilatori online si possono fare per iniziare?

Vi suggerirò dei compilatori a vostra scelta che potete usare per programmare

- [**OnlineGDB**](https://www.google.com/url?sa=t&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwiv9uHRnbyXAxW_nP0HHUhyI3AQFnoECA8QAQ&url=https%3A%2F%2Fwww.onlinegdb.com%2F&usg=AOvVaw1s757DV8W5UIWqP5vJtGqt&opi=89978449):  senza dover installare nessun software per chi vuola iniziare a programmare.
- [**Visual Studio Code**](https://code.visualstudio.com/): per chi vuole scrivere sul vostro editor di testo personale \[ **Pesa 1GB di memoria** \]. Dovete installare un compilatore per C e C++ come MSYS2 o altri se eseguite dei programmi.
- [**CLion**](https://www.google.com/aclk?sa=L&ai=DChsSEwiqlbbmnryXAxWtlIMHHRypDm8YACICCAEQABoCZWY&co=1&gclid=CjwKCAjw88HWBhA3EiwAo2Zd6Ehyq9zSZAFF5G-S9mUDB5p0oZ5p86YARwsq98RQvmJ5GaMXdVVSLBoCquUQAvD_BwE&cid=CAASmAHkaILG2v027DCoD5lbUtlgYxUrnyjzLkCz6bxQCSXBOGuENrYE7GKkFzYJjvmoOjUlGE0TSSRtE77UYuRAKF1pEK8-h_lY-zDNopDkxoVF58U5CramhL0zCnQbCCCUOd_qM4U2zDIAWrJlbfzUdDiJwnE8fHbxwWDu7I4QiTND7IFvkptxXE7OPq9_X1IULfvrkytQGtsPzQ&cce=2&sig=AOD64_0ghdv57h_SUqr-Qsgk8ZcbkAIR0Q&q&adurl&ved=2ahUKEwj3qq3mnryXAxWnlP0HHaErLNwQ0Qx6BAgOEAE): e un altro editor di testo professionale siviluppato da Jetbrains per avere tutto ciò che serve sul quell'ambito di lavoro. \[ Pesa all'incirca 2-3 GB di memoria ROM e dovete avere almeno 8 se non 16 GB+ di RAM \]. È c'è l'avete tutto a portata di mano



Se installate CLio vi chiederà se volete usare la Licenza *Free for Non-commerciale use* e cliccate per usufruirlo gratuitamente, c'è anche la versione a pagamento che costa all'incirca 100€/anno.

> Per iniziare vi consiglio di usare OnlineGDB per programmare C se non volete installare altri software. Oppure se non volete cercate altri compilatori che vi permettono non solo di scrivere ma anche che restituisce degli output da terminal o editor vi consiglio fortemente di usare anche [**Compilebytes.com**](https://compilebytes.com) ma vi offre anche tool

---

### Navigazione rapida

Se vuoi muoverti velocemente nel corso, ecco il percorso completo:

- [Introduzione](./intro_c.MD)
- [1. Variabili e tipi](./page_1.MD)
- [2. Librerie](./page_2.MD)
- [3. Acquisizione e restituzione dati](./page_3.MD)
- [4. Operazioni e condizioni](./page_4.MD)
- [5. Cicli](./page_5.MD)
- [6. Funzioni](./page_6.MD)
- [7. Array](./page_7.MD)
- [8. Stringhe](./page_8.MD)
- [9. Puntatori](./page_9.MD)
- [10. Memoria dinamica](./page_10.MD)
- [11. File](./page_11.MD)
- [12. Progetto finale](./page_12.MD)
- [13. Indice conclusivo](./page_13.MD)

---

### Che cosa si andrà a programmare?

In questo corso si andrà a programmare principalmente in C, le cose principali saranno:


1. [**Le variabili e i tipi**](./page_1.MD): che è la parte fondamentale per scrivere, raccogliere  e stampare informazioni.
2. [**Le librerie**](./page_2.MD): cosa sono e cosa servono esattamente all'interno del nostro programma
3. [**Acquisizione e Restituzione dati**](./page_3.MD): capire come acquisire dati dal terminale e stampare dei messaggi all'utente.
4. [**Operazioni e condizioni**](./page_4.MD): si entra nella logica della programmazione
5. [**Cicli**](./page_5.MD):il programma deve ripetere le stesse operazioni all'infinito
6. [**Definizione di Funzione**](./page_6.MD): cos'è una funzione e che tipi di funzioni esistono
7. [**Array**](./page_7.MD): come gestire insiemi di valori dello stesso tipo.
8. [**Stringhe**](./page_8.MD): gestire parole e frasi all'interno del programma.
9. [**Puntatori**](./page_9.MD): è il punto forte di C su cui si può gestire la memoria.
10. [**Memoria Dinamica**](./page_10.MD): dove vengono allocate e liberate le informazioni in modo flessibile.
11. [**File**](./page_11.MD): gestione di file `.txt` per leggere e scrivere dati.
12. [**Progetto finale**](./page_12.MD): le competenze acquisite dopo aver completato il percorso.
13. [**Indice conclusivo del percorso C**](./page_13.MD): riepilogo completo delle lezioni e delle sfide.

---


E ora passiamo alla prossima lezione e inizieremo ad aprire le porte verso nuovi mondi