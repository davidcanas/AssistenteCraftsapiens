import cron, { type ScheduledTask } from "node-cron";
import type DGClient from "../../structures/Client";
import type { TicketsConfig } from "./config";
import { purgeExpiredChannels, sendMonthlySummary } from "./service";

const PURGE_INTERVAL_MS = 600_000;

let purgeInterval: NodeJS.Timeout | null = null;
let summaryTask: ScheduledTask | null = null;

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
