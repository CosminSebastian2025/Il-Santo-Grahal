"use client";

import { useSyncExternalStore } from "react";
import {
	getUpdatePreferencesServerSnapshot,
	getUpdatePreferencesSnapshot,
	subscribeToUpdatePreferences,
	type UpdatePreferences,
} from "@/lib/update-preferences";

// Espone le preferenze come store esterno: ogni componente vede subito le modifiche.
export function useUpdatePreferences(): UpdatePreferences {
	return useSyncExternalStore(
		subscribeToUpdatePreferences,
		getUpdatePreferencesSnapshot,
		getUpdatePreferencesServerSnapshot,
	);
}
