export type TicketCategoryId = "denuncia" | "duvida" | "bug" | "recurso" | "vip";

export interface TicketAnswer {
	label: string;
	value: string;
}

export interface TicketField {
	id: string;
	label: string;
	style: "short" | "paragraph";
	required: boolean;
	maxLength: number;
}

export interface TicketCategory {
	id: TicketCategoryId;
	label: string;
	emoji: string;
	fields: TicketField[];
}

const SHORT_MAX = 100;
const PARAGRAPH_MAX = 1000;

function short(id: string, label: string, required: boolean): TicketField {
	return { id, label, style: "short", required, maxLength: SHORT_MAX };
}

function paragraph(id: string, label: string, required: boolean): TicketField {
	return { id, label, style: "paragraph", required, maxLength: PARAGRAPH_MAX };
}

export const TICKET_CATEGORIES: readonly TicketCategory[] = [
	{
		id: "denuncia",
		label: "Denúncia",
		emoji: "🚨",
		fields: [
			short("reported_nick", "Nick do denunciado", true),
			paragraph("what_happened", "O que aconteceu", true),
			paragraph("evidence_links", "Links de provas", false),
		],
	},
	{
		id: "duvida",
		label: "Dúvida",
		emoji: "❓",
		fields: [paragraph("question", "Sua dúvida", true)],
	},
	{
		id: "bug",
		label: "Bug",
		emoji: "🐛",
		fields: [
			paragraph("what_happened", "O que aconteceu", true),
			paragraph("how_to_reproduce", "Como reproduzir", false),
		],
	},
	{
		id: "recurso",
		label: "Recorrer de punição",
		emoji: "⚖️",
		fields: [
			short("punished_nick", "Nick punido", true),
			paragraph("why_review", "Por que a punição deve ser revista", true),
		],
	},
	{
		id: "vip",
		label: "VIP / Compras",
		emoji: "💎",
		fields: [
			short("nick", "Nick", true),
			paragraph("problem", "Descreva o problema", true),
			short("purchase_id", "ID ou comprovante da compra", false),
		],
	},
];

export function getCategory(id: string): TicketCategory | undefined {
	return TICKET_CATEGORIES.find((category) => category.id === id);
}
