"use client";

import { useState } from "react";

export default function Home () {
    const [status, setStatus] = useState<string>("Benvenuto nel Santo Grahal");
    const [updating, setUpdating] = useState<boolean>(false);

    async function pingRust(){
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const result = await invoke<string>("ping");
            setStatus(result);
        }
        catch (e) {
            setStatus(`Errore Rust: ${String(e)}`);
        }
    };

    async function checkUpdates(){
        try {
            const { check } = await import("@tauri-apps/plugin-updater");
            const { relaunch } = await import("@tauri-apps/plugin-process");

            const update = await check();

            if (!update) {
                setStatus("Nesun aggiornamento disponibile");
                return;
            }
            setStatus("Aggiornamento trovato. Download in corso ...");
            await update.downloadAndInstall();

            setStatus("Aggiornamento installato. Riavvio...");
            await relaunch();
        }
        catch (error){
            setStatus(`Errore aggiornamento: ${String(error)}`);
        }
        finally {
            setUpdating(false);
        }
    };

    return (
        <main style={{
                fontFamily: "system-ui, sans-serif",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
            }}>
            <h1>Il Santo Grahal</h1>
            <p>Biblioteca offline per informatica generale</p>

            <button onClick={pingRust}>Test Rust</button>

            <button onClick={checkUpdates} disabled={updating}>
                {updating ? "Controllo aggiornamenti..." : "Controlla aggiornamenti"}
            </button>

            <p>{status}</p>
        </main>
    );
}
