import type DGClient from "../../structures/Client";
import { purgeExpiredChannels } from "./service";

const PURGE_INTERVAL_MS = 600_000;

let purgeInterval: NodeJS.Timeout | null = null;

function runPurge(client: DGClient): void {
	purgeExpiredChannels(client)
		.then((deleted) => {
			if (deleted > 0) {
				console.log(`[TICKETS] ${deleted} canal(is) de ticket fechado(s) apagado(s).`);
			}
		})
		.catch((error) => console.error("[TICKETS]", error));
}

export function startScheduler(client: DGClient): void {
	if (purgeInterval) {
		return;
	}
	purgeInterval = setInterval(() => runPurge(client), PURGE_INTERVAL_MS);
	runPurge(client);
}
