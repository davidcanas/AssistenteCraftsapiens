export const TICKET_PREFIX = "ticket:";

const TICKET_ACTIONS = ["open", "modal", "claim", "profile", "close", "close-confirm", "rate"] as const;

export type TicketAction = typeof TICKET_ACTIONS[number];

export function buildCustomId(action: TicketAction, arg?: string): string {
	return arg === undefined ? `${TICKET_PREFIX}${action}` : `${TICKET_PREFIX}${action}:${arg}`;
}

export function parseCustomId(customID: string): { action: TicketAction; arg: string | null } | null {
	if (!customID.startsWith(TICKET_PREFIX)) {
		return null;
	}

	const rest = customID.slice(TICKET_PREFIX.length);
	const separator = rest.indexOf(":");
	const actionRaw = separator === -1 ? rest : rest.slice(0, separator);
	const argRaw = separator === -1 ? "" : rest.slice(separator + 1);

	const action = TICKET_ACTIONS.find((candidate) => candidate === actionRaw);
	if (action === undefined) {
		return null;
	}

	return { action, arg: argRaw.length > 0 ? argRaw : null };
}
