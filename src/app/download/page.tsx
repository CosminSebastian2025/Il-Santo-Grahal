// Rotta statica /download: metadata per i motori di ricerca e pagina client.
import type { Metadata } from "next";
import DownloadPage from "@/components/DownloadPage";

// Titolo e descrizione usati nell'HTML generato in fase di build.
export const metadata: Metadata = {
	title: "Download | Il Santo Grahal",
	description:
		"Scarica Il Santo Grahal per Windows, macOS e Linux e scegli il formato di installazione.",
};

// La rotta resta un server component: la pagina interattiva è un client component.
export default function Page() {
	return <DownloadPage />;
}
