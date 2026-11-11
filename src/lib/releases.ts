// Metadati delle release, formati di download e URL di fallback della pagina Download.
import packageJson from "../../package.json";

// Repository pubblico da cui vengono lette le release.
export const REPO_OWNER = "CosminSebastian2025";
export const REPO_NAME = "Il-Santo-Grahal";
export const RELEASES_LATEST_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
// Versione dell'app usata come fallback quando GitHub non è raggiungibile.
export const APP_VERSION = packageJson.version;

export type OperatingSystem = "windows" | "macos" | "linux";
export type Architecture = "x64" | "arm64" | "any";

export interface DownloadFormat {
	id: string;
	label: string;
	extension: string;
	description: string;
	architecture: Architecture;
	recommended: boolean;
	fileName: string;
	url: string;
	size: number | null;
}

export interface OsDownloads {
	id: OperatingSystem;
	name: string;
	shortName: string;
	subtitle: string;
	formats: DownloadFormat[];
}

interface FormatDefinition {
	id: string;
	os: OperatingSystem;
	label: string;
	extension: string;
	description: string;
	architecture: Architecture;
	recommended: boolean;
	matches: (name: string) => boolean;
	fileName: (version: string) => string;
}

interface GitHubAsset {
	name: string;
	size: number;
	browser_download_url: string;
}

interface GitHubRelease {
	tag_name: string;
	html_url?: string;
	published_at?: string;
	assets?: GitHubAsset[];
}

export interface LatestRelease {
	version: string;
	tag: string;
	publishedAt: string | null;
	htmlUrl: string;
	assets: { name: string; size: number; url: string }[];
}

const FORMAT_DEFINITIONS: FormatDefinition[] = [
	// Ogni voce descrive un asset pubblicato da tauri-action nella release.
	{
		id: "windows-nsis",
		os: "windows",
		label: "Installer NSIS",
		extension: ".exe",
		description:
			"Installazione guidata con collegamenti nel menu Start. Consigliata per la maggior parte degli utenti.",
		architecture: "x64",
		recommended: true,
		matches: (name) => /x64-setup\.exe$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_x64-setup.exe`,
	},
	{
		id: "windows-msi",
		os: "windows",
		label: "Pacchetto MSI",
		extension: ".msi",
		description:
			"Windows Installer, adatto ad ambienti aziendali o a installazioni gestite.",
		architecture: "x64",
		recommended: false,
		matches: (name) => /\.msi$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_x64_en-US.msi`,
	},
	{
		id: "macos-arm64",
		os: "macos",
		label: "DMG Apple Silicon",
		extension: ".dmg",
		description: "Per Mac con chip M1, M2, M3 o M4.",
		architecture: "arm64",
		recommended: true,
		matches: (name) => /aarch64\.dmg$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_aarch64.dmg`,
	},
	{
		id: "macos-x64",
		os: "macos",
		label: "DMG Intel",
		extension: ".dmg",
		description: "Per Mac con processore Intel.",
		architecture: "x64",
		recommended: false,
		matches: (name) => /_x64\.dmg$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_x64.dmg`,
	},
	{
		id: "linux-appimage",
		os: "linux",
		label: "AppImage",
		extension: ".AppImage",
		description:
			"Portable: un solo file, nessuna installazione. Rendi eseguibile il file prima dell'avvio.",
		architecture: "x64",
		recommended: true,
		matches: (name) => /\.AppImage$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_amd64.AppImage`,
	},
	{
		id: "linux-deb",
		os: "linux",
		label: "Pacchetto DEB",
		extension: ".deb",
		description: "Per Debian, Ubuntu, Linux Mint e distribuzioni derivate.",
		architecture: "x64",
		recommended: false,
		matches: (name) => /\.deb$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal_${version}_amd64.deb`,
	},
	{
		id: "linux-rpm",
		os: "linux",
		label: "Pacchetto RPM",
		extension: ".rpm",
		description: "Per Fedora, RHEL, openSUSE e distribuzioni derivate.",
		architecture: "x64",
		recommended: false,
		matches: (name) => /\.rpm$/i.test(name),
		fileName: (version) => `Il.Santo.Grahal-${version}-1.x86_64.rpm`,
	},
];

// Etichette mostrate nel selettore del sistema operativo.
const OS_META: Record<OperatingSystem, Omit<OsDownloads, "formats">> = {
	windows: {
		id: "windows",
		name: "Windows",
		shortName: "WIN",
		subtitle: "Windows 10 o 11, 64 bit",
	},
	macos: {
		id: "macos",
		name: "macOS",
		shortName: "MAC",
		subtitle: "Mac con Apple Silicon o Intel",
	},
	linux: {
		id: "linux",
		name: "Linux",
		shortName: "LNX",
		subtitle: "Distribuzioni x86_64 recenti",
	},
};

// Rileva il sistema operativo dallo user agent; null se sconosciuto o in SSR.
export function detectOperatingSystem(): OperatingSystem | null {
	if (typeof navigator === "undefined") {
		return null;
	}

	const userAgent = navigator.userAgent;

	if (/Windows/i.test(userAgent)) {
		return "windows";
	}
	if (/Mac OS X|Macintosh/i.test(userAgent)) {
		return "macos";
	}
	if (/Linux|X11/i.test(userAgent) && !/Android/i.test(userAgent)) {
		return "linux";
	}

	return null;
}

// Su mobile il download desktop non è utile: la pagina mostra un avviso.
export function isMobileDevice(): boolean {
	if (typeof navigator === "undefined") {
		return false;
	}

	return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Combina release e definizioni: usa l'asset reale se presente, altrimenti l'URL canonico.
export function buildOsDownloads(release: LatestRelease | null): OsDownloads[] {
	const version = release?.version ?? APP_VERSION;
	const tag = release?.tag ?? `v${version}`;
	const assets = release?.assets ?? [];

	return (Object.keys(OS_META) as OperatingSystem[]).map((os) => ({
		...OS_META[os],
		formats: FORMAT_DEFINITIONS.filter((format) => format.os === os).map(
			(format) => {
				// Nome atteso per questa versione: base del fallback e del confronto.
				const expectedName = format.fileName(version);
				const asset = assets.find(
					(candidate) =>
						candidate.name === expectedName ||
						format.matches(candidate.name),
				);

				return {
					id: format.id,
					label: format.label,
					extension: format.extension,
					description: format.description,
					architecture: format.architecture,
					recommended: format.recommended,
					fileName: asset?.name ?? expectedName,
					url:
						asset?.url ??
						`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${tag}/${expectedName}`,
					size: asset?.size ?? null,
				};
			},
		),
	}));
}

// Legge l'ultima release pubblicata tramite l'API pubblica di GitHub.
export async function loadLatestRelease(
	signal?: AbortSignal,
): Promise<LatestRelease> {
	const response = await fetch(LATEST_RELEASE_API, {
		signal,
		headers: {
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub ha risposto con stato ${response.status}`);
	}

	const data = (await response.json()) as GitHubRelease;
	// Il tag GitHub è nella forma "v0.3.3": la versione mostrata è senza la "v".
	const tag = data.tag_name;
	const version = tag.startsWith("v") ? tag.slice(1) : tag;

	return {
		version,
		tag,
		publishedAt: data.published_at ?? null,
		htmlUrl:
			data.html_url ??
			`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${tag}`,
		assets: (data.assets ?? []).map((asset) => ({
			name: asset.name,
			size: asset.size,
			url: asset.browser_download_url,
		})),
	};
}

// Converte i byte in MB leggibili; null quando la dimensione non è disponibile.
export function formatFileSize(bytes: number | null): string | null {
	if (!bytes) {
		return null;
	}

	const megabytes = bytes / (1024 * 1024);
	return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}
