This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cache (Redis opzionale)

I documenti Markdown vengono caricati con una cache a due livelli:

1. cache in memoria nel processo Rust (sempre attiva, con TTL e limite di 512 voci);
2. Redis, se configurato, come cache condivisa e persistente tra sessioni.

Senza Redis l'app funziona allo stesso modo: la connessione è lazy, ha un timeout di 2 secondi e in caso di errore si torna automaticamente alla cache in memoria. Redis viene usato solo dal processo Rust: la webview non riceve mai credenziali o connessioni dirette.

Configurazione tramite variabili d'ambiente prima di avviare Tauri:

```bash
# macOS/Linux
ILSG_REDIS_URL=redis://127.0.0.1:6379 npm run tauri:dev
```

```powershell
# Windows (PowerShell)
$env:ILSG_REDIS_URL="redis://127.0.0.1:6379"; npm run tauri:dev
```

Variabili supportate:

- `ILSG_REDIS_URL` (accetta anche `rediss://` per TLS); in alternativa viene letto `REDIS_URL`;
- `ILSG_REDIS_PREFIX` (default `ilsg:v1:`).

Su Windows Redis non è distribuito ufficialmente: servono Docker Desktop, WSL2, Memurai o Valkey. I comandi IPC esposti sono `cache_get`, `cache_set`, `cache_del` e `cache_health`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
