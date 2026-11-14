import cron, { type ScheduledTask } from "node-cron";
import type DGClient from "../../structures/Client";
import type { TicketsConfig } from "./config";
import { purgeExpiredChannels, sendMonthlySummary } from "./service";

// A cada minuto: o aviso "será apagado em X" no canal fica preciso.
const PURGE_INTERVAL_MS = 60_000;

let purgeInterval: NodeJS.Timeout | null = null;
let purging = false;
let summaryTask: ScheduledTask | null = null;

function runPurge(client: DGClient, config: TicketsConfig): void {
	if (purging) {
		return;
	}
	purging = true;
	purgeExpiredChannels(client, config)
		.then((deleted) => {
			if (deleted > 0) {
				console.log(`[TICKETS] ${deleted} canal(is) de ticket fechado(s) apagado(s).`);
			}
		})
		.catch((error) => console.error("[TICKETS]", error))
		.finally(() => {
			purging = false;
		});
}

export function startScheduler(client: DGClient, config: TicketsConfig): void {
	if (purgeInterval) {
		return;
	}
	purgeInterval = setInterval(() => runPurge(client, config), PURGE_INTERVAL_MS);
	runPurge(client, config);
}

export function startMonthlySummary(client: DGClient, config: TicketsConfig): void {
	if (summaryTask || !config.summaryChannelId) {
		return;
	}
	summaryTask = cron.schedule(
		"0 9 1 * *",
		async () => {
			try {
				await sendMonthlySummary(client, config);
			} catch (error) {
				console.error("[TICKETS]", error);
			}
		},
		{ timezone: "America/Sao_Paulo" },
	);
}
