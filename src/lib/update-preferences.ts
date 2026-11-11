// Preferenze di aggiornamento persistenti e stato di sessione usato dal banner.
export interface UpdatePreferences {
	autoCheck: boolean;
	autoInstall: boolean;
}

const PREFERENCES_KEY = "grahal.updates.preferences";
// Evento interno: lo storage event non scatta nella stessa scheda che scrive.
const PREFERENCES_EVENT = "grahal:update-preferences";
const DISMISSED_KEY = "grahal.updates.dismissed";
const DISMISSED_EVENT = "grahal:update-dismissed";
const AUTO_INSTALL_KEY = "grahal.updates.auto-install-attempted";

// Il controllo all'avvio è attivo di default, l'installazione automatica no.
const DEFAULT_PREFERENCES: UpdatePreferences = {
	autoCheck: true,
	autoInstall: false,
};

// Cache dello snapshot: useSyncExternalStore richiede riferimenti stabili.
let cachedRaw: string | null | undefined;
let cachedPreferences: UpdatePreferences = DEFAULT_PREFERENCES;

// Accetta solo valori booleani validi e ricade sui default in caso di JSON corrotto.
function parsePreferences(raw: string | null): UpdatePreferences {
	if (!raw) {
		return DEFAULT_PREFERENCES;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<UpdatePreferences>;
		return {
			autoCheck:
				typeof parsed.autoCheck === "boolean"
					? parsed.autoCheck
					: DEFAULT_PREFERENCES.autoCheck,
			autoInstall:
				typeof parsed.autoInstall === "boolean"
					? parsed.autoInstall
					: DEFAULT_PREFERENCES.autoInstall,
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

// Lettura una tantum, utile fuori dai componenti React.
export function readUpdatePreferences(): UpdatePreferences {
	if (typeof window === "undefined") {
		return DEFAULT_PREFERENCES;
	}

	try {
		return parsePreferences(window.localStorage.getItem(PREFERENCES_KEY));
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

// Snapshot per useSyncExternalStore: rilegge localStorage solo se il valore grezzo cambia.
export function getUpdatePreferencesSnapshot(): UpdatePreferences {
	if (typeof window === "undefined") {
		return DEFAULT_PREFERENCES;
	}

	try {
		const raw = window.localStorage.getItem(PREFERENCES_KEY);
		if (raw !== cachedRaw) {
			cachedRaw = raw;
			cachedPreferences = parsePreferences(raw);
		}
		return cachedPreferences;
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

// In SSR si usano i default per evitare mismatch di idratazione.
export function getUpdatePreferencesServerSnapshot(): UpdatePreferences {
	return DEFAULT_PREFERENCES;
}

// Ascolta sia modifiche da altre schede sia l'evento interno di scrittura.
export function subscribeToUpdatePreferences(listener: () => void): () => void {
	if (typeof window === "undefined") {
		return () => undefined;
	}

	const onStorage = (event: StorageEvent) => {
		if (event.key === PREFERENCES_KEY) {
			listener();
		}
	};

	window.addEventListener("storage", onStorage);
	window.addEventListener(PREFERENCES_EVENT, listener);

	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(PREFERENCES_EVENT, listener);
	};
}

// Scrive la preferenza, invalida la cache e notifica i componenti sottoscritti.
export function writeUpdatePreferences(preferences: UpdatePreferences): void {
	if (typeof window === "undefined") {
		return;
	}

	cachedRaw = undefined;

	try {
		window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
	} catch {
		// La preferenza resta valida per la sessione corrente anche senza storage.
	}

	window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

// La chiusura del banner vale per la sessione corrente, non per sempre.
export function getDismissedVersion(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.sessionStorage.getItem(DISMISSED_KEY);
	} catch {
		return null;
	}
}

// Notifica il cambio di versione ignorata dal banner.
export function subscribeToDismissedVersion(listener: () => void): () => void {
	if (typeof window === "undefined") {
		return () => undefined;
	}

	window.addEventListener(DISMISSED_EVENT, listener);

	return () => window.removeEventListener(DISMISSED_EVENT, listener);
}

// Nasconde il banner per questa versione fino alla fine della sessione.
export function dismissVersion(version: string): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.sessionStorage.setItem(DISMISSED_KEY, version);
	} catch {
		// Ignora: il banner verrà nascosto solo nello stato React.
	}

	window.dispatchEvent(new Event(DISMISSED_EVENT));
}

// Evita di tentare l'installazione automatica più volte per la stessa versione.
export function wasAutoInstallAttempted(version: string): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	try {
		return window.sessionStorage.getItem(AUTO_INSTALL_KEY) === version;
	} catch {
		return false;
	}
}

// Registra il tentativo automatico per la versione indicata.
export function markAutoInstallAttempted(version: string): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.sessionStorage.setItem(AUTO_INSTALL_KEY, version);
	} catch {
		// Ignora: il tentativo verrà comunque registrato nello stato React.
	}
}
