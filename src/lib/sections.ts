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
				description: "Scopri le basi del linguaggio C e come iniziare a programmare.",
				icon: "c-introduction",
				filePath: "/docs/1-C/intro_c.MD",
				order: 1
			},
			{
				id: "page 1",
				title: "Variabili e tipi",
				description: "Cos'è una variabile e quali sono i tipi di dati in C.",
				icon: "page_1",
				filePath: "/docs/1-C/page_1.MD",
				order: 2
			},
			{
				id: "page 2",
				title: "Librerie",
				description: "Scopri cos'è una libreria e quali tipi di librerie si usano in C.",
				icon: "page_2",
				filePath: "/docs/1-C/page_2.MD",
				order: 3
			},
			{
				id: "page 3",
				title: "Acquisizione e restituzione dei dati in C",
				description: "Impara a usare printf, scanf e gli operatori logici e aritmetici.",
				icon: "page_3",
				filePath: "/docs/1-C/page_3.MD",
				order: 4
			},
			{
				id: "page 4",
				title: "Strutture condizionali",
				description: "Approfondisci if-else, gli operatori logici e aritmetici e come funzionano le condizioni.",
				icon: "page_4",
				filePath: "/docs/1-C/page_4.MD",
				order: 5
			},
			{
				id: "page 5",
				title: "Cicli for",
				description: "Scopri cos'è il ciclo for e come viene usato in C.",
				icon: "page_5",
				filePath: "/docs/1-C/page_5.MD",
				order: 6
			}
		]
	},
	{
		id: "cpp",
		title: "Imparare il C++",
		description: "Percorso pratico per iniziare da zero con il C++ moderno, mettendo al centro logica, codice e piccoli progetti.",
		icon: "cpp",
		color: "cyan",
		filePath: "/docs/2-C++",
		pages: [
			{
				id: "cpp-introduction",
				title: "Introduzione al C++",
				description: "Scopri perché imparare C++ e la struttura del percorso da zero.",
				icon: "cpp-introduction",
				filePath: "/docs/2-C++/intro_cpp.MD",
				order: 1
			},
			{
				id: "cpp-page-1",
				title: "Primo programma e compilatore",
				description: "Struttura base di un programma C++, funzione main e primo output.",
				icon: "page_1",
				filePath: "/docs/2-C++/page_1.MD",
				order: 2
			},
			{
				id: "cpp-page-2",
				title: "Variabili e tipi",
				description: "Impara i tipi principali e come dichiarare correttamente le variabili.",
				icon: "page_2",
				filePath: "/docs/2-C++/page_2.MD",
				order: 3
			},
			{
				id: "cpp-page-3",
				title: "Input e output",
				description: "Usa std::cout e std::cin per interagire con l'utente.",
				icon: "page_3",
				filePath: "/docs/2-C++/page_3.MD",
				order: 4
			},
			{
				id: "cpp-page-4",
				title: "Operatori e condizioni",
				description: "Scopri operatori, if, else e logica booleana.",
				icon: "page_4",
				filePath: "/docs/2-C++/page_4.MD",
				order: 5
			},
			{
				id: "cpp-page-5",
				title: "Cicli",
				description: "Approfondisci while e for per ripetere istruzioni in modo controllato.",
				icon: "page_5",
				filePath: "/docs/2-C++/page_5.MD",
				order: 6
			},
			{
				id: "cpp-page-6",
				title: "Funzioni",
				description: "Organizza il codice in blocchi riutilizzabili con parametri e return.",
				icon: "page_6",
				filePath: "/docs/2-C++/page_6.MD",
				order: 7
			},
			{
				id: "cpp-page-7",
				title: "Vettori e stringhe",
				description: "Gestisci collezioni di dati e testi con std::vector e std::string.",
				icon: "page_7",
				filePath: "/docs/2-C++/page_7.MD",
				order: 8
			},
			{
				id: "cpp-page-8",
				title: "Struct",
				description: "Raggruppa dati correlati con struct e crea tipi personalizzati.",
				icon: "page_8",
				filePath: "/docs/2-C++/page_8.MD",
				order: 9
			},
			{
				id: "cpp-page-9",
				title: "Classi",
				description: "Introduzione alle classi, ai membri e ai metodi.",
				icon: "page_9",
				filePath: "/docs/2-C++/page_9.MD",
				order: 10
			},
			{
				id: "cpp-page-10",
				title: "Puntatori e memoria",
				description: "Comprendi il concetto di puntatore e i fondamenti della memoria.",
				icon: "page_10",
				filePath: "/docs/2-C++/page_10.MD",
				order: 11
			},
			{
				id: "cpp-page-11",
				title: "STL, file ed eccezioni",
				description: "Inizia a usare le strutture della libreria standard e i file.",
				icon: "page_11",
				filePath: "/docs/2-C++/page_11.MD",
				order: 12
			},
			{
				id: "cpp-page-12",
				title: "Progetto finale",
				description: "Unisci tutto ciò che hai imparato in un piccolo progetto pratico.",
				icon: "page_12",
				filePath: "/docs/2-C++/page_12.MD",
				order: 13
			},
			{
				id: "cpp-page-13",
				title: "Indice conclusivo",
				description: "Riepilogo finale e prossimi passi per continuare il percorso.",
				icon: "page_13",
				filePath: "/docs/2-C++/page_13.MD",
				order: 14
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
				return { section, subSection };
			}
		}
	}
	return undefined;
}

export function getSortedPages(sections: Section): SubSection[] {
	return [...sections.pages].sort((a, b) => a.order - b.order);
}

