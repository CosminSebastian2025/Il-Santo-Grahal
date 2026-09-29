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
        title: "Imparare Il C",
        description: "Impara il linguaggio di programmazione C, uno dei linguaggi più potenti e versatili.",
        icon: "c",
        color: "blue",
        filePath: "/docs/1-C",
        pages: []
    }
]

export function getSectionById(id: string): Section | undefined {
    return sections.find(section => section.id === id);
}

export function getSubSectionById(filePath: string): { section: Section; subSection: SubSection } | undefined {
    for(const section of sections) {
        for(const subSection of section.pages) {
            if(subSection.filePath === filePath) {
                return { section, subSection };
            }
        }
    }
    return undefined;
}

export function getSortedPages(sections: Section): SubSection[] {
    return [...sections.pages].sort((a,b) => a.order - b.order);
}

