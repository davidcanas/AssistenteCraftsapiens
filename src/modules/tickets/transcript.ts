export const MAX_TRANSCRIPT_MESSAGES = 2000;

export interface TranscriptEntry {
	authorId: string;
	authorTag: string;
	content: string;
	attachments: string[];
	createdAt: Date;
}

export interface TranscriptHeader {
	number: number;
	categoryLabel: string;
	userTag: string;
	openedAt: Date;
	closedAt: Date;
	truncated: boolean;
}

const BR_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

export function formatDateBR(d: Date): string {
	const parts = BR_FORMATTER.formatToParts(d);
	const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "";
	return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatTranscript(h: TranscriptHeader, entries: TranscriptEntry[]): string {
	const lines: string[] = [
		`Ticket #${h.number} — ${h.categoryLabel}`,
		`Jogador: ${h.userTag}`,
		`Aberto: ${formatDateBR(h.openedAt)}`,
		`Fechado: ${formatDateBR(h.closedAt)}`,
	];
	if (h.truncated) {
		lines.push(`(transcrição limitada às últimas ${MAX_TRANSCRIPT_MESSAGES} mensagens)`);
	}
	lines.push("");

	const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	for (const entry of sorted) {
		lines.push(`[${formatDateBR(entry.createdAt)}] ${entry.authorTag} (${entry.authorId}): ${entry.content}`);
		for (const url of entry.attachments) {
			lines.push(`    📎 ${url}`);
		}
	}
	return lines.join("\n");
}
