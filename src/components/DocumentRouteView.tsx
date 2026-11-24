"use client";

// Adatta DocViewer alla navigazione per rotta: URL condivisibili per ogni pagina.
import { useRouter } from "next/navigation";
import DocViewer from "@/components/DocViewer";
import type { Section, SubSection } from "@/lib/sections";

interface DocumentRouteViewProps {
  section: Section;
  initialPage?: SubSection;
}

export default function DocumentRouteView({
  section,
  initialPage,
}: DocumentRouteViewProps) {
  const router = useRouter();

  return (
    <DocViewer
      section={section}
      initialPage={initialPage}
      onBack={() => router.push("/")}
      onPageSelect={(page) =>
        router.push(`/documenti/${section.id}/${page.id}/`)
      }
    />
  );
}
