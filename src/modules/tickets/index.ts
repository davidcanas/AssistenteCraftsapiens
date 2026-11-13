import { ComponentInteraction, ModalSubmitInteraction, type Interaction } from "oceanic.js";
import type DGClient from "../../structures/Client";
import { parseTicketsConfig, type TicketsConfig } from "./config";
import { TICKET_PREFIX } from "./customIds";
import { routeTicketInteraction } from "./handlers";
import { syncCounter } from "./model";

let cachedConfig: TicketsConfig | null | undefined;

export function getTicketsConfig(): TicketsConfig | null {
	if (cachedConfig === undefined) {
		const { config, error } = parseTicketsConfig(process.env);
		if (error) {
			console.error(`[TICKETS] ${error}`);
		}
		cachedConfig = config;
	}
	return cachedConfig;
}

export function isTicketInteraction(i: Interaction): i is ComponentInteraction | ModalSubmitInteraction {
	if (!(i instanceof ComponentInteraction) && !(i instanceof ModalSubmitInteraction)) {
		return false;
	}
	if (!getTicketsConfig()) {
		return false;
	}
	return i.data.customID.startsWith(TICKET_PREFIX);
}

export async function handleTicketInteraction(client: DGClient, interaction: ComponentInteraction | ModalSubmitInteraction): Promise<void> {
	const config = getTicketsConfig();
	if (!config) {
		return;
	}
	await routeTicketInteraction(client, config, interaction);
}

export async function startTickets(client: DGClient): Promise<void> {
	const config = getTicketsConfig();
	if (!config) {
		return;
	}
	await syncCounter(config.startNumber);
	console.log(`[TICKETS] Sistema de tickets ativo para ${client.user.username}.`);
}
