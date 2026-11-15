import { ComponentInteraction, ModalSubmitInteraction, type Interaction, type Message } from "oceanic.js";
import type DGClient from "../../structures/Client";
import { parseTicketsConfig, type TicketsConfig } from "./config";
import { TICKET_PREFIX } from "./customIds";
import { emitTicketEvent, shouldLookupMessage, ticketEvents } from "./events";
import { routeTicketInteraction } from "./handlers";
import { syncCounter, Ticket } from "./model";
import { startMonthlySummary, startScheduler } from "./scheduler";
import { panelMessage } from "./views";

export { memberIsStaff, type TicketsConfig } from "./config";
export { sendMonthlySummary } from "./service";
export { ticketEvents, sseFrame } from "./events";

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

// Chamado pelo messageCreate sem await: sai na hora se ninguém escuta ou se não é canal "ticket-".
export function notifyTicketMessage(message: Message): void {
	const channel = message.channel;
	const channelName = channel && "name" in channel ? channel.name : undefined;
	if (!shouldLookupMessage(channelName, ticketEvents.listenerCount("ticket"))) {
		return;
	}
	Ticket.findOne({ channelId: message.channelID, status: "open" }, { _id: 1, number: 1 })
		.lean()
		.then((ticket) => {
			if (!ticket) {
				return;
			}
			emitTicketEvent({
				tipo: "mensagem",
				ticketId: String(ticket._id),
				number: ticket.number,
				autorId: message.author.id,
				autorTag: message.author.tag,
				conteudo: message.content,
				anexos: message.attachments.map((a) => a.url),
				em: new Date().toISOString(),
			});
		})
		.catch((error) => console.error("[TICKETS]", error));
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
