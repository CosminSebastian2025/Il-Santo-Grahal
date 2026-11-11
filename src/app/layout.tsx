import type { Metadata } from "next";
import "./global.css";

// Metadati globali applicati a tutte le pagine statiche.
export const metadata: Metadata = {
  title: "Il Santo Grahal",
  description: "Una biblioteca offline per imparare informatica, un argomento alla volta.",
};

// Layout radice: lingua italiana e stili comuni a ogni pagina.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
