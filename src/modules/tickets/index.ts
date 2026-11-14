import { ComponentInteraction, ModalSubmitInteraction, type Interaction } from "oceanic.js";
import type DGClient from "../../structures/Client";
import { parseTicketsConfig, type TicketsConfig } from "./config";
import { TICKET_PREFIX } from "./customIds";
import { routeTicketInteraction } from "./handlers";
import { syncCounter, Ticket } from "./model";
import { startMonthlySummary, startScheduler } from "./scheduler";
import { panelMessage } from "./views";

export { memberIsStaff, type TicketsConfig } from "./config";
export { sendMonthlySummary } from "./service";

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

// Diferencia os canais deste sistema dos canais "ticket-NNNN" do Ticket Tool (mesmo padrão de nome).
export async function isTicketChannel(channelId: string): Promise<boolean> {
	try {
		return (await Ticket.exists({ channelId })) !== null;
	} catch (error) {
		console.error("[TICKETS]", error);
		return false;
	}
}

export async function publishPanel(client: DGClient, channelId: string): Promise<void> {
	await client.rest.channels.createMessage(channelId, panelMessage());
}

export async function startTickets(client: DGClient): Promise<void> {
	const config = getTicketsConfig();
	if (!config) {
		return;
	}
	startScheduler(client, config);
	startMonthlySummary(client, config);
	try {
		await syncCounter(config.startNumber);
	} catch (error) {
		// Não é fatal: nextTicketNumber aplica o mesmo piso a cada ticket.
		console.error("[TICKETS]", error);
	}
	console.log(`[TICKETS] Sistema de tickets ativo para ${client.user.username}.`);
}
