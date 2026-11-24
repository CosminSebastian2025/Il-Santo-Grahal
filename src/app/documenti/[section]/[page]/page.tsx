import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocumentRouteView from "@/components/DocumentRouteView";
import { getSectionById, sections } from "@/lib/sections";

interface DocumentPageProps {
  params: Promise<{ section: string; page: string }>;
}

export function generateStaticParams() {
  return sections.flatMap((section) =>
    section.pages.map((page) => ({ section: section.id, page: page.id })),
  );
}

export async function generateMetadata({
  params,
}: DocumentPageProps): Promise<Metadata> {
  const { section: sectionId, page: pageId } = await params;
  const section = getSectionById(sectionId);
  const page = section?.pages.find((candidate) => candidate.id === pageId);
  if (!section || !page) {
    return { title: "Documento non trovato | Il Santo Grahal" };
  }
  return {
    title: `${page.title} · ${section.title} | Il Santo Grahal`,
    description: page.description,
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { section: sectionId, page: pageId } = await params;
  const section = getSectionById(sectionId);
  const page = section?.pages.find((candidate) => candidate.id === pageId);

  if (!section || !page) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <DocumentRouteView section={section} initialPage={page} />
    </main>
  );
}
