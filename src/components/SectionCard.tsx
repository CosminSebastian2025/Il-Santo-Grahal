import { Section } from "@/lib/sections";

interface SectionCardProps {
    section: Section;
    onClick: (section: Section) => void;
}

export default function SectionCard({ section, onClick }: SectionCardProps) {
    return (
        <button
            onClick={() => onClick(section)}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left transition-all hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
                borderLeftWidth: "4px",
                borderLeftColor: section.color,
            }}
        >
            <div className="flex items-start gap-4">
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl transition-transform group-hover:scale-110"
                    style={{
                        backgroundColor: `${section.color}20`,
                    }}
                >
                    {section.icon}
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {section.description}
                    </p>
                </div>
            </div>

            {/* Effetto hover */}
            <div
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-5"
                style={{ backgroundColor: section.color }}
            />
        </button>
    );
}