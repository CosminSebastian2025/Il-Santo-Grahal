"use client";

import React, { useState } from "react";
import { sections, Section } from "@/lib/sections";
import SectionCard from "@/components/SectionCard";
import DocViewer from "@/components/DocViewer";

export default function Home () {
    // const [status, setStatus] = useState<string>("Benvenuto nel Santo Grahal");
    // const [updating, setUpdating] = useState<boolean>(false);
    //
    // async function pingRust(){
    //     try {
    //         const { invoke } = await import("@tauri-apps/api/core");
    //         const result = await invoke<string>("ping");
    //         setStatus(result);
    //     }
    //     catch (e) {
    //         setStatus(`Errore Rust: ${String(e)}`);
    //     }
    // };
    //
    // async function checkUpdates(){
    //     try {
    //         const { check } = await import("@tauri-apps/plugin-updater");
    //         const { relaunch } = await import("@tauri-apps/plugin-process");
    //
    //         const update = await check();
    //
    //         if (!update) {
    //             setStatus("Nesun aggiornamento disponibile");
    //             return;
    //         }
    //         setStatus("Aggiornamento trovato. Download in corso ...");
    //         await update.downloadAndInstall();
    //
    //         setStatus("Aggiornamento installato. Riavvio...");
    //         await relaunch();
    //     }
    //     catch (error){
    //         setStatus(`Errore aggiornamento: ${String(error)}`);
    //     }
    //     finally {
    //         setUpdating(false);
    //     }
    // };

    const [selectedSection, setSelectedSection] = useState<Section | null>(null);

    const handleSectionClick = (section: Section) => {
        setSelectedSection(section);
        // Qui puoi aggiungere la logica per navigare alla sezione selezionata
    };

    const handleBack = () => {
        setSelectedSection(null);
    }

    if(selectedSection) {
        return (
            <main className={"min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"}>
                <DocViewer section={selectedSection} onBack={handleBack} />
            </main>
        );
    }

    return (
        <main className={"min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"}>
            {/* Header */}
            <header className={"bg-white shadow"}>
                <div className={"max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"}>
                    <h1 className={"text-3xl font-bold text-gray-900"}>Il Santo Grahal</h1>
                    <p className={"mt-2 text-lg text-gray-600"}>Biblioteca offline per informatica generale</p>
                </div>
            </header>

            {/* Grid Card */}
            <div className={"max-w-7xl mx-auto px-6 py-12"}>
                <div className={"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
                    {
                        sections.map((section) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                onClick={() => handleSectionClick(section)}
                            />
                        ))
                    }
                </div>
            </div>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
                <p>Funziona 100% offline • Creato con Tauri + Next.js</p>
            </footer>
        </main>
    );
}
