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

