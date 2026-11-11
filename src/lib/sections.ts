export interface SubSection {
	id: string;
	title: string;
	description: string;
	icon: string;
	filePath: string;
	order: number;
}

export interface Section {
	id: string;
	title: string;
	description: string;
	icon: string;
	color: string;
	filePath: string;
	pages: SubSection[];
}

export const sections: Section[] = [
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
	}
]

export function getSectionById(id: string): Section | undefined {
	return sections.find(section => section.id === id);
}

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

export function getSortedPages(sections: Section): SubSection[] {
	return [...sections.pages].sort((a, b) => a.order - b.order);
}

