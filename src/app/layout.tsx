import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "IL Santo Grahal",
  description: "Una biblioteca offline per imparare informatica, un argomento alla volta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
