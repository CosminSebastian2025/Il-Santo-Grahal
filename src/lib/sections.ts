// Manifest statico dei percorsi: ogni sezione elenca le pagine Markdown da mostrare.
export interface SubSection {
	id: string;
	title: string;
	description: string;
	icon: string;
	filePath: string;
	order: number;
}

// Un percorso completo con titolo, icona e pagine ordinate.
export interface Section {
	id: string;
	title: string;
	description: string;
	icon: string;
	color: string;
	filePath: string;
	pages: SubSection[];
}

// Titoli e descrizioni delle 30 lezioni Java, riusati per generare le pagine.
const javaLessons: { title: string; description: string }[] = [
	{ title: "Lezione 1: Primo programma", description: "Struttura di una classe, main, stampa, variabili e tipi primitivi." },
	{ title: "Lezione 2: Input e stringhe", description: "Scanner, operatori, metodi delle stringhe e conversioni." },
	{ title: "Lezione 3: Condizioni", description: "if/else, operatori logici, switch e switch expression." },
	{ title: "Lezione 4: Cicli", description: "for, while, do-while, break, continue e cicli annidati." },
	{ title: "Lezione 5: Array e metodi", description: "Array, for-each, parametri, valori di ritorno e overload; progetti della fase 1." },
	{ title: "Lezione 6: Classi e oggetti", description: "Attributi, metodi, riferimenti, toString e membri static." },
	{ title: "Lezione 7: Costruttori e incapsulamento", description: "Costruttori, this, validazione, campi final e composizione." },
	{ title: "Lezione 8: Ereditarietà e polimorfismo", description: "extends, super, override, polimorfismo e instanceof." },
	{ title: "Lezione 9: Classi astratte e interfacce", description: "Astrazione, interfacce, default method e scelta tra i due strumenti." },
	{ title: "Lezione 10: Static, enum e record", description: "Membri statici, enum con campi e record; progetti della fase 2." },
	{ title: "Lezione 11: String, StringBuilder e wrapper", description: "Immutabilità, StringBuilder, autoboxing e formattazione." },
	{ title: "Lezione 12: Eccezioni", description: "try/catch/finally, eccezioni checked, custom e try-with-resources." },
	{ title: "Lezione 13: Liste, set e code", description: "ArrayList, LinkedList, HashSet, Deque e iterazione." },
	{ title: "Lezione 14: Map, generics e ordinamento", description: "HashMap, generics, Comparable e Comparator." },
	{ title: "Lezione 15: File, date, Stream e Optional", description: "NIO, java.time, lambda, Stream e Optional; progetti della fase 3." },
	{ title: "Lezione 16: Git e GitHub", description: "Commit, branch, merge, conflitti e repository remoti." },
	{ title: "Lezione 17: Maven e Gradle", description: "pom.xml, dipendenze, ciclo di vita e build con Gradle." },
	{ title: "Lezione 18: JUnit 5", description: "Test, asserzioni, eccezioni attese e test parametrizzati." },
	{ title: "Lezione 19: Debugging e logging", description: "Errori del compilatore, debugger, log e analisi delle eccezioni." },
	{ title: "Lezione 20: Struttura dei progetti", description: "Package, stratificazione, configurazione e TDD; progetti della fase 4." },
	{ title: "Lezione 21: SQL e PostgreSQL", description: "Tabelle, tipi, vincoli, INSERT, SELECT, UPDATE e indici." },
	{ title: "Lezione 22: JOIN, aggregazioni e transazioni", description: "JOIN, GROUP BY, sottoquery, transazioni e isolamento." },
	{ title: "Lezione 23: JDBC e pool di connessioni", description: "Driver, PreparedStatement, transazioni e HikariCP." },
	{ title: "Lezione 24: Spring Boot e API REST", description: "Controller, routing, codici di stato e JSON." },
	{ title: "Lezione 25: JPA, validazione e sicurezza", description: "Entity, repository, validazione, errori e password; progetti della fase 5." },
	{ title: "Lezione 26: Thread e concorrenza", description: "Thread, race condition, synchronized, AtomicInteger e deadlock." },
	{ title: "Lezione 27: ExecutorService e CompletableFuture", description: "Pool di thread, Future, catene asincrone e virtual thread." },
	{ title: "Lezione 28: JVM e prestazioni", description: "Stack, heap, garbage collector, benchmark e strumenti di analisi." },
	{ title: "Lezione 29: Pattern, Clean Code e SOLID", description: "Singleton, Factory, Builder, Strategy, Observer e principi SOLID." },
	{ title: "Lezione 30: Cache, Docker e CI/CD", description: "Cache, code, Docker, pipeline e monitoraggio; progetti della fase 6." }
];

// Genera le pagine Java con id, percorso e ordinamento coerenti.
const javaLessonPages: SubSection[] = javaLessons.map((lesson, index) => {
	const n = String(index + 1).padStart(2, "0");
	return {
		id: `java-lezione-${n}`,
		title: lesson.title,
		description: lesson.description,
		icon: `lezione_${n}`,
		filePath: `/docs/4-Java/lezione_${n}.MD`,
		order: index + 2
	};
});

// Elenco dei percorsi mostrati nella home, nell'ordine in cui compaiono.
export const sections: Section[] = [
	// Percorso C.
	{
		id: "c",
		title: "Imparare il C",
		description: "Impara il linguaggio di programmazione C, uno dei più potenti e versatili.",
		icon: "c",
		color: "blue",
		filePath: "/docs/1-C",
		pages: [
			{
				id: "c-introduction",
				title: "Introduzione al C",
				description: "Cos'è il C, perché si studia e come è organizzato il corso.",
				icon: "c-introduction",
				filePath: "/docs/1-C/intro_c.MD",
				order: 1
			},
			{
				id: "lezione-0",
				title: "Lezione 0: Compilatore e Hello World",
				description: "Installa il compilatore, scrivi e compila il primo programma.",
				icon: "lezione_0",
				filePath: "/docs/1-C/lezione_0.MD",
				order: 2
			},
			{
				id: "lezione-1",
				title: "Lezione 1: Variabili e printf",
				description: "Dichiarare variabili, usare i tipi e stampare con printf.",
				icon: "lezione_1",
				filePath: "/docs/1-C/lezione_1.MD",
				order: 3
			},
			{
				id: "lezione-2",
				title: "Lezione 2: Input con scanf",
				description: "Leggere dati da tastiera con scanf e controllare l'input.",
				icon: "lezione_2",
				filePath: "/docs/1-C/lezione_2.MD",
				order: 4
			},
			{
				id: "lezione-3",
				title: "Lezione 3: Condizioni if",
				description: "Scegliere tra più percorsi con if, else e gli operatori logici.",
				icon: "lezione_3",
				filePath: "/docs/1-C/lezione_3.MD",
				order: 5
			},
			{
				id: "lezione-4",
				title: "Lezione 4: Cicli while e for",
				description: "Ripetere istruzioni con while e for.",
				icon: "lezione_4",
				filePath: "/docs/1-C/lezione_4.MD",
				order: 6
			},
			{
				id: "lezione-5",
				title: "Lezione 5: Funzioni",
				description: "Dividere il programma in funzioni riutilizzabili.",
				icon: "lezione_5",
				filePath: "/docs/1-C/lezione_5.MD",
				order: 7
			},
			{
				id: "lezione-6",
				title: "Lezione 6: Array",
				description: "Memorizzare più valori dello stesso tipo e attraversarli con un ciclo.",
				icon: "lezione_6",
				filePath: "/docs/1-C/lezione_6.MD",
				order: 8
			},
			{
				id: "lezione-7",
				title: "Lezione 7: Stringhe",
				description: "Gestire testo con array di char e le funzioni di string.h.",
				icon: "lezione_7",
				filePath: "/docs/1-C/lezione_7.MD",
				order: 9
			},
			{
				id: "lezione-8",
				title: "Lezione 8: Puntatori",
				description: "Capire indirizzi, dereferenziamento e passaggio per indirizzo.",
				icon: "lezione_8",
				filePath: "/docs/1-C/lezione_8.MD",
				order: 10
			},
			{
				id: "lezione-9",
				title: "Lezione 9: Memoria dinamica",
				description: "Allocare e liberare memoria a runtime con malloc, calloc e realloc.",
				icon: "lezione_9",
				filePath: "/docs/1-C/lezione_9.MD",
				order: 11
			},
			{
				id: "lezione-10",
				title: "Lezione 10: Strutture e file",
				description: "Raggruppare dati con struct e salvarli su file.",
				icon: "lezione_10",
				filePath: "/docs/1-C/lezione_10.MD",
				order: 12
			}
		]
	},
	// Percorso C++.
	{
		id: "cpp",
		title: "Imparare il C++",
		description: "Percorso di 30 giorni per imparare il C++ moderno partendo da zero.",
		icon: "C++",
		color: "blue",
		filePath: "/docs/2-C++",
		pages: [
			{
				id: "cpp-introduction",
				title: "Introduzione al C++",
				description: "Obiettivo del mese, metodo e strumenti per iniziare.",
				icon: "cpp-introduction",
				filePath: "/docs/2-C++/intro_cpp.MD",
				order: 1
			},
			{
				id: "cpp-giorno-1",
				title: "Giorno 1: Introduzione e primo programma",
				description: "Compilatore, struttura di un programma e Hello World.",
				icon: "giorno_01",
				filePath: "/docs/2-C++/giorno_01.MD",
				order: 2
			},
			{
				id: "cpp-giorno-2",
				title: "Giorno 2: Variabili e tipi base",
				description: "int, double, bool, char, std::string e const.",
				icon: "giorno_02",
				filePath: "/docs/2-C++/giorno_02.MD",
				order: 3
			},
			{
				id: "cpp-giorno-3",
				title: "Giorno 3: Input e output",
				description: "std::cout, std::cin, getline e gestione degli spazi.",
				icon: "giorno_03",
				filePath: "/docs/2-C++/giorno_03.MD",
				order: 4
			},
			{
				id: "cpp-giorno-4",
				title: "Giorno 4: Operatori ed espressioni",
				description: "Operatori aritmetici, confronti, logici e incremento.",
				icon: "giorno_04",
				filePath: "/docs/2-C++/giorno_04.MD",
				order: 5
			},
			{
				id: "cpp-giorno-5",
				title: "Giorno 5: Condizioni con if",
				description: "if, else, else if e condizioni booleane.",
				icon: "giorno_05",
				filePath: "/docs/2-C++/giorno_05.MD",
				order: 6
			},
			{
				id: "cpp-giorno-6",
				title: "Giorno 6: Cicli while",
				description: "while, contatori e condizioni di uscita.",
				icon: "giorno_06",
				filePath: "/docs/2-C++/giorno_06.MD",
				order: 7
			},
			{
				id: "cpp-giorno-7",
				title: "Giorno 7: Cicli for",
				description: "for, range-based for e cicli annidati.",
				icon: "giorno_07",
				filePath: "/docs/2-C++/giorno_07.MD",
				order: 8
			},
			{
				id: "cpp-giorno-8",
				title: "Giorno 8: Funzioni semplici",
				description: "Funzioni, parametri, return e void.",
				icon: "giorno_08",
				filePath: "/docs/2-C++/giorno_08.MD",
				order: 9
			},
			{
				id: "cpp-giorno-9",
				title: "Giorno 9: Funzioni e scope",
				description: "Scope, passaggio per valore e funzioni helper.",
				icon: "giorno_09",
				filePath: "/docs/2-C++/giorno_09.MD",
				order: 10
			},
			{
				id: "cpp-giorno-10",
				title: "Giorno 10: Array e std::vector",
				description: "Array C, std::vector, push_back e size.",
				icon: "giorno_10",
				filePath: "/docs/2-C++/giorno_10.MD",
				order: 11
			},
			{
				id: "cpp-giorno-11",
				title: "Giorno 11: std::string",
				description: "Lunghezza, concatenazione, accesso e confronto.",
				icon: "giorno_11",
				filePath: "/docs/2-C++/giorno_11.MD",
				order: 12
			},
			{
				id: "cpp-giorno-12",
				title: "Giorno 12: Iterare vector e stringhe",
				description: "for classico, range-based for e const auto&.",
				icon: "giorno_12",
				filePath: "/docs/2-C++/giorno_12.MD",
				order: 13
			},
			{
				id: "cpp-giorno-13",
				title: "Giorno 13: Struct",
				description: "Struct, campi e operatore punto.",
				icon: "giorno_13",
				filePath: "/docs/2-C++/giorno_13.MD",
				order: 14
			},
			{
				id: "cpp-giorno-14",
				title: "Giorno 14: Vector di struct",
				description: "Aggiungere, stampare e cercare elementi.",
				icon: "giorno_14",
				filePath: "/docs/2-C++/giorno_14.MD",
				order: 15
			},
			{
				id: "cpp-giorno-15",
				title: "Giorno 15: Classi base",
				description: "Classi, public/private, membri e metodi.",
				icon: "giorno_15",
				filePath: "/docs/2-C++/giorno_15.MD",
				order: 16
			},
			{
				id: "cpp-giorno-16",
				title: "Giorno 16: Costruttori",
				description: "Costruttori e member initializer list.",
				icon: "giorno_16",
				filePath: "/docs/2-C++/giorno_16.MD",
				order: 17
			},
			{
				id: "cpp-giorno-17",
				title: "Giorno 17: Metodi const e incapsulamento",
				description: "Metodi const, getter, setter e dati protetti.",
				icon: "giorno_17",
				filePath: "/docs/2-C++/giorno_17.MD",
				order: 18
			},
			{
				id: "cpp-giorno-18",
				title: "Giorno 18: Valore e riferimento",
				description: "Passaggio per valore, riferimento e const reference.",
				icon: "giorno_18",
				filePath: "/docs/2-C++/giorno_18.MD",
				order: 19
			},
			{
				id: "cpp-giorno-19",
				title: "Giorno 19: Puntatori, solo basi",
				description: "Indirizzi, dereferenziazione e nullptr.",
				icon: "giorno_19",
				filePath: "/docs/2-C++/giorno_19.MD",
				order: 20
			},
			{
				id: "cpp-giorno-20",
				title: "Giorno 20: Stack, heap e RAII",
				description: "Memoria automatica, RAII e smart pointer.",
				icon: "giorno_20",
				filePath: "/docs/2-C++/giorno_20.MD",
				order: 21
			},
			{
				id: "cpp-giorno-21",
				title: "Giorno 21: Smart pointer",
				description: "unique_ptr, make_unique, ownership e shared_ptr.",
				icon: "giorno_21",
				filePath: "/docs/2-C++/giorno_21.MD",
				order: 22
			},
			{
				id: "cpp-giorno-22",
				title: "Giorno 22: Mappe",
				description: "std::map e std::unordered_map.",
				icon: "giorno_22",
				filePath: "/docs/2-C++/giorno_22.MD",
				order: 23
			},
			{
				id: "cpp-giorno-23",
				title: "Giorno 23: Algoritmi STL",
				description: "sort, find, count e reverse su vector.",
				icon: "giorno_23",
				filePath: "/docs/2-C++/giorno_23.MD",
				order: 24
			},
			{
				id: "cpp-giorno-24",
				title: "Giorno 24: Lambda",
				description: "Lambda semplici e comparatori per std::sort.",
				icon: "giorno_24",
				filePath: "/docs/2-C++/giorno_24.MD",
				order: 25
			},
			{
				id: "cpp-giorno-25",
				title: "Giorno 25: Eccezioni",
				description: "try, catch, throw e quando usarle.",
				icon: "giorno_25",
				filePath: "/docs/2-C++/giorno_25.MD",
				order: 26
			},
			{
				id: "cpp-giorno-26",
				title: "Giorno 26: File input/output",
				description: "ofstream, ifstream e lettura riga per riga.",
				icon: "giorno_26",
				filePath: "/docs/2-C++/giorno_26.MD",
				order: 27
			},
			{
				id: "cpp-giorno-27",
				title: "Giorno 27: Debug e warning",
				description: "Warning del compilatore, debugger e breakpoint.",
				icon: "giorno_27",
				filePath: "/docs/2-C++/giorno_27.MD",
				order: 28
			},
			{
				id: "cpp-giorno-28",
				title: "Giorno 28: Progetto, parte 1",
				description: "Rubrica con struct, vector, menu e aggiunta contatti.",
				icon: "giorno_28",
				filePath: "/docs/2-C++/giorno_28.MD",
				order: 29
			},
			{
				id: "cpp-giorno-29",
				title: "Giorno 29: Progetto, parte 2",
				description: "Ricerca, cancellazione, ordinamento e file.",
				icon: "giorno_29",
				filePath: "/docs/2-C++/giorno_29.MD",
				order: 30
			},
			{
				id: "cpp-giorno-30",
				title: "Giorno 30: Revisione e prossimi passi",
				description: "Refactoring, test manuale e prossimo progetto.",
				icon: "giorno_30",
				filePath: "/docs/2-C++/giorno_30.MD",
				order: 31
			}
		]
	},
	// Percorso C#.
	{
		id: "csharp",
		title: "Imparare il C#",
		description: "Percorso di 12 settimane per imparare il C# e la programmazione a oggetti.",
		icon: "C#",
		color: "blue",
		filePath: "/docs/3-C%23",
		pages: [
			{
				id: "csharp-introduction",
				title: "Introduzione al C#",
				description: "Obiettivo del percorso, metodo, strumenti e organizzazione delle settimane.",
				icon: "csharp-introduction",
				filePath: "/docs/3-C%23/intro_csharp.MD",
				order: 1
			},
			{
				id: "csharp-settimana-1",
				title: "Settimana 1: Variabili e input/output",
				description: "Primi programmi, tipi, lettura da tastiera e operatori.",
				icon: "settimana_01",
				filePath: "/docs/3-C%23/settimana_01.MD",
				order: 2
			},
			{
				id: "csharp-settimana-2",
				title: "Settimana 2: Condizioni e cicli",
				description: "if, switch, while, for e foreach con esercizi progressivi.",
				icon: "settimana_02",
				filePath: "/docs/3-C%23/settimana_02.MD",
				order: 3
			},
			{
				id: "csharp-settimana-3",
				title: "Settimana 3: Metodi",
				description: "Parametri, valori di ritorno, overload e metodi di validazione.",
				icon: "settimana_03",
				filePath: "/docs/3-C%23/settimana_03.MD",
				order: 4
			},
			{
				id: "csharp-settimana-4",
				title: "Settimana 4: Array, liste e stringhe",
				description: "Collezioni, ricerca dei massimi e manipolazione del testo.",
				icon: "settimana_04",
				filePath: "/docs/3-C%23/settimana_04.MD",
				order: 5
			},
			{
				id: "csharp-settimana-5",
				title: "Settimana 5: Classi e proprietà",
				description: "Oggetti, proprietà, incapsulamento e proprietà calcolate.",
				icon: "settimana_05",
				filePath: "/docs/3-C%23/settimana_05.MD",
				order: 6
			},
			{
				id: "csharp-settimana-6",
				title: "Settimana 6: Eredità e polimorfismo",
				description: "Costruttori, classi astratte, interfacce e polimorfismo.",
				icon: "settimana_06",
				filePath: "/docs/3-C%23/settimana_06.MD",
				order: 7
			},
			{
				id: "csharp-settimana-7",
				title: "Settimana 7: Eccezioni e file",
				description: "Gestire gli errori, leggere e scrivere file di testo e CSV.",
				icon: "settimana_07",
				filePath: "/docs/3-C%23/settimana_07.MD",
				order: 8
			},
			{
				id: "csharp-settimana-8",
				title: "Settimana 8: CSV, JSON, Dictionary e LINQ",
				description: "Dati strutturati, serializzazione e query sulle collezioni.",
				icon: "settimana_08",
				filePath: "/docs/3-C%23/settimana_08.MD",
				order: 9
			},
			{
				id: "csharp-settimana-9",
				title: "Settimana 9: Generics, delegates ed eventi",
				description: "Codice riutilizzabile e comunicazione tra oggetti.",
				icon: "settimana_09",
				filePath: "/docs/3-C%23/settimana_09.MD",
				order: 10
			},
			{
				id: "csharp-settimana-10",
				title: "Settimana 10: Lambda, async/await e HTTP",
				description: "Lambda, operazioni asincrone e chiamate a API web.",
				icon: "settimana_10",
				filePath: "/docs/3-C%23/settimana_10.MD",
				order: 11
			},
			{
				id: "csharp-settimana-11",
				title: "Settimana 11: Testing, debugging e refactoring",
				description: "Test con xUnit, uso del debugger e codice più pulito.",
				icon: "settimana_11",
				filePath: "/docs/3-C%23/settimana_11.MD",
				order: 12
			},
			{
				id: "csharp-settimana-12",
				title: "Settimana 12: Progetto finale",
				description: "Organizzazione del codice e rubrica contatti completa.",
				icon: "settimana_12",
				filePath: "/docs/3-C%23/settimana_12.MD",
				order: 13
			}
		]
	},
	// Percorso Java: le pagine sono generate da javaLessonPages.
	{
		id: "java",
		title: "Imparare Java",
		description: "Percorso in 30 lezioni, dalle basi al codice in produzione con database, Spring Boot e Docker.",
		icon: "Java",
		color: "blue",
		filePath: "/docs/4-Java",
		pages: [
			{
				id: "java-introduction",
				title: "Introduzione a Java",
				description: "Obiettivo del percorso, metodo, strumenti e organizzazione delle lezioni.",
				icon: "java-introduction",
				filePath: "/docs/4-Java/intro_java.MD",
				order: 1
			},
			...javaLessonPages
		]
	},
	// Percorso Kotlin.
	{
		id: "kotlin",
		title: "Imparare Kotlin",
		description: "Percorso in 8 settimane: basi, oggetti, coroutine, file e un progetto completo.",
		icon: "Kotlin",
		color: "blue",
		filePath: "/docs/5-Kotlin",
		pages: [
			{
				id: "kotlin-introduction",
				title: "Introduzione a Kotlin",
				description: "Obiettivo del percorso, metodo, strumenti e organizzazione delle settimane.",
				icon: "kotlin-introduction",
				filePath: "/docs/5-Kotlin/intro_kotlin.MD",
				order: 1
			},
			{
				id: "kotlin-settimana-1",
				title: "Settimana 1: basi",
				description: "Primo programma, val e var, tipi, stringhe, input, condizioni e cicli.",
				icon: "settimana_01",
				filePath: "/docs/5-Kotlin/settimana_01.MD",
				order: 2
			},
			{
				id: "kotlin-settimana-2",
				title: "Settimana 2: funzioni e collezioni",
				description: "Funzioni, liste, set, mappe, when e lambda semplici.",
				icon: "settimana_02",
				filePath: "/docs/5-Kotlin/settimana_02.MD",
				order: 3
			},
			{
				id: "kotlin-settimana-3",
				title: "Settimana 3: oggetti e null safety",
				description: "Classi, proprietà, data class, enum e tipi nullable.",
				icon: "settimana_03",
				filePath: "/docs/5-Kotlin/settimana_03.MD",
				order: 4
			},
			{
				id: "kotlin-settimana-4",
				title: "Settimana 4: Kotlin moderno",
				description: "Funzioni di ordine superiore, scope functions, sealed class ed errori.",
				icon: "settimana_04",
				filePath: "/docs/5-Kotlin/settimana_04.MD",
				order: 5
			},
			{
				id: "kotlin-settimana-5",
				title: "Settimana 5: coroutine",
				description: "launch, async, funzioni suspend, dispatcher e concorrenza strutturata.",
				icon: "settimana_05",
				filePath: "/docs/5-Kotlin/settimana_05.MD",
				order: 6
			},
			{
				id: "kotlin-settimana-6",
				title: "Settimana 6: file, JSON e dipendenze",
				description: "Lettura e scrittura file, serializzazione JSON, HTTP e Gradle.",
				icon: "settimana_06",
				filePath: "/docs/5-Kotlin/settimana_06.MD",
				order: 7
			},
			{
				id: "kotlin-settimana-7",
				title: "Settimana 7: progetto, prima parte",
				description: "Scelta del progetto, MVP, architettura e sviluppo del flusso principale.",
				icon: "settimana_07",
				filePath: "/docs/5-Kotlin/settimana_07.MD",
				order: 8
			},
			{
				id: "kotlin-settimana-8",
				title: "Settimana 8: test e consegna",
				description: "Test, rifinitura, README, consegna e idee per continuare.",
				icon: "settimana_08",
				filePath: "/docs/5-Kotlin/settimana_08.MD",
				order: 9
			}
		]
	},
	// Percorso Jetpack Compose.
	{
		id: "compose",
		title: "Imparare Jetpack Compose",
		description: "Percorso in 6 livelli: dalla prima schermata a runtime, performance e Compose Multiplatform.",
		icon: "Compose",
		color: "blue",
		filePath: "/docs/6-Compose",
		pages: [
			{
				id: "compose-introduction",
				title: "Introduzione a Compose",
				description: "Obiettivo del percorso, metodo, strumenti, versioni e organizzazione dei livelli.",
				icon: "compose-introduction",
				filePath: "/docs/6-Compose/intro_compose.MD",
				order: 1
			},
			{
				id: "compose-livello-1",
				title: "Livello 1: fondamenta",
				description: "Progetto, Text, Button, TextField, layout, Modifier, stato con remember e anteprime.",
				icon: "livello_01",
				filePath: "/docs/6-Compose/livello_01.MD",
				order: 2
			},
			{
				id: "compose-livello-2",
				title: "Livello 2: UI reale",
				description: "Scaffold, Material 3, TopAppBar, LazyColumn, Card, immagini con Coil, dialog e bottom sheet.",
				icon: "livello_02",
				filePath: "/docs/6-Compose/livello_02.MD",
				order: 3
			},
			{
				id: "compose-livello-3",
				title: "Livello 3: stato serio e architettura",
				description: "State hoisting, ViewModel, StateFlow, UiState, effetti e stati di caricamento.",
				icon: "livello_03",
				filePath: "/docs/6-Compose/livello_03.MD",
				order: 4
			},
			{
				id: "compose-livello-4",
				title: "Livello 4: animazioni, navigazione e componenti avanzati",
				description: "Navigation Compose, route tipizzate, animazioni, rememberSaveable, Paging e deep link.",
				icon: "livello_04",
				filePath: "/docs/6-Compose/livello_04.MD",
				order: 5
			},
			{
				id: "compose-livello-5",
				title: "Livello 5: livello avanzato vero",
				description: "Composable personalizzati, Layout, Canvas, gesti, stabilità, test UI e accessibilità.",
				icon: "livello_05",
				filePath: "/docs/6-Compose/livello_05.MD",
				order: 6
			},
			{
				id: "compose-livello-6",
				title: "Livello 6: oltre i limiti",
				description: "Runtime, slot table, compilatore, misurazione, Macrobenchmark, baseline profile e Multiplatform.",
				icon: "livello_06",
				filePath: "/docs/6-Compose/livello_06.MD",
				order: 7
			}
		]
	},
	// Percorso Kotlin Multiplatform, con piano di 90 giorni.
	{
		id: "kmp",
		title: "Imparare Kotlin Multiplatform",
		description: "Percorso in 4 settimane più un piano di 90 giorni: Kotlin, architettura e primo modulo condiviso Android/iOS.",
		icon: "KMP",
		color: "blue",
		filePath: "/docs/7-KMP",
		pages: [
			{
				id: "kmp-introduction",
				title: "Introduzione a Kotlin Multiplatform",
				description: "Obiettivo del percorso, tre fasi, metodo, strumenti, versioni e organizzazione.",
				icon: "kmp-introduction",
				filePath: "/docs/7-KMP/intro_kmp.MD",
				order: 1
			},
			{
				id: "kmp-settimana-1",
				title: "Settimana 1: Kotlin base",
				description: "Variabili, tipi, funzioni, condizioni, cicli, classi, null safety e calcolatrice testuale.",
				icon: "settimana_01",
				filePath: "/docs/7-KMP/settimana_01.MD",
				order: 2
			},
			{
				id: "kmp-settimana-2",
				title: "Settimana 2: Kotlin serio",
				description: "Collezioni, lambda, funzioni di ordine superiore, extension functions, data class e progetti.",
				icon: "settimana_02",
				filePath: "/docs/7-KMP/settimana_02.MD",
				order: 3
			},
			{
				id: "kmp-settimana-3",
				title: "Settimana 3: app, stato e dati",
				description: "UI e logica, stato, eventi, coroutine, Ktor, JSON, repository e dependency injection.",
				icon: "settimana_03",
				filePath: "/docs/7-KMP/settimana_03.MD",
				order: 4
			},
			{
				id: "kmp-settimana-4",
				title: "Settimana 4: primo modulo KMP",
				description: "Progetto shared e androidApp, expect/actual, validazione, sconto, valute, repository JSON e test comuni.",
				icon: "settimana_04",
				filePath: "/docs/7-KMP/settimana_04.MD",
				order: 5
			},
			{
				id: "kmp-piano-90-giorni",
				title: "Piano di 90 giorni",
				description: "Tre mesi, progetto finale, milestone, catalogo di idee, consegna e passi successivi.",
				icon: "piano_90_giorni",
				filePath: "/docs/7-KMP/piano_90_giorni.MD",
				order: 6
			}
		]
	}
]

// Cerca un percorso tramite il suo id.
export function getSectionById(id: string): Section | undefined {
	return sections.find(section => section.id === id);
}

// Trova percorso e pagina a partire dal percorso file Markdown.
export function getSubSectionById(filePath: string): { section: Section; subSection: SubSection } | undefined {
	for (const section of sections) {
		for (const subSection of section.pages) {
			if (subSection.filePath === filePath) {
				return {section, subSection};
			}
		}
	}
	return undefined;
}

// Copia delle pagine ordinate per il campo order, senza mutare il manifest.
export function getSortedPages(sections: Section): SubSection[] {
	return [...sections.pages].sort((a, b) => a.order - b.order);
}

