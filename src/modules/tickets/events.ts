import { EventEmitter } from "events";

export type TicketEvent =
	| { tipo: "aberto"; ticketId: string; number: number; userId: string; categoria: string; em: string }
	| { tipo: "assumido"; ticketId: string; number: number; staffId: string; em: string }
	| { tipo: "superior-chamado"; ticketId: string; number: number; pedidoPor: string; em: string }
	| { tipo: "superior-assumiu"; ticketId: string; number: number; staffId: string; em: string }
	| { tipo: "fechado"; ticketId: string; number: number; fechadoPor: string; em: string }
	| { tipo: "mensagem"; ticketId: string; number: number; autorId: string; autorTag: string; conteudo: string; anexos: string[]; em: string };

// Barramento interno: o service emite, o stream SSE do site escuta. Evento único: "ticket".
export const ticketEvents = new EventEmitter();
// Um listener por aba aberta do site: sem limite, para não gerar MaxListenersExceededWarning após 10 abas.
ticketEvents.setMaxListeners(0);

/** Nunca lança: um listener com defeito não pode derrubar o fluxo do ticket. */
export function emitTicketEvent(event: TicketEvent): void {
	try {
		ticketEvents.emit("ticket", event);
	} catch (error) {
		console.error("[TICKETS]", error);
	}
}

/** Só vale consultar o Mongo se alguém está ouvindo e o canal parece um canal de ticket. */
export function shouldLookupMessage(channelName: string | undefined, listeners: number): boolean {
	return listeners > 0 && typeof channelName === "string" && channelName.startsWith("ticket-");
}

export function sseFrame(event: TicketEvent): string {
	return `data: ${JSON.stringify(event)}\n\n`;
}
