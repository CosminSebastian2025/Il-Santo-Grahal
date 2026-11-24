// Intestazione e piè di pagina condivisi dalle pagine del catalogo.
import Link from "next/link";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/argomenti/", label: "Argomenti" },
  { href: "/percorsi/", label: "Percorsi" },
  { href: "/glossario/", label: "Glossario" },
  { href: "/copertura/", label: "Copertura" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <span
            className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
              <path d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h12v15h-12a2.75 2.75 0 0 0-2.75 2.75V5.75Z" />
              <path d="M4.75 18A2.75 2.75 0 0 1 7.5 15.25h12M9 7h6m-6 3h6" />
            </svg>
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Il Santo Grahal
          </span>
        </Link>

        <nav aria-label="Navigazione principale">
          <ul className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-600">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-8 sm:text-left">
        <p>Una piccola guida per grandi idee.</p>
        <p>
          Funziona offline <span aria-hidden="true">·</span> Realizzato con Tauri e Next.js
        </p>
      </div>
    </footer>
  );
}
