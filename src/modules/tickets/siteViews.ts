import { getCategory, type TicketAnswer } from "./categories";
import type { SurveyAnswer } from "./survey";
import { formatDateBR, type TranscriptEntry } from "./transcript";

export type NameFn = (id: string) => string;

export interface Pessoa {
	id: string;
	nome: string;
}

export interface ListItem {
	id: string;
	number: number;
	categoria: string;
	jogador: Pessoa;
	status: "open" | "closed";
	assumidoPor: Pessoa | null;
	superiores: Pessoa[];
	abertoEm: string;
	tempoAteAssumir: string | null;
	tempoAteFechar: string | null;
	nota: number | null;
	canalApagado: boolean;
}

export interface TicketLike {
	_id: unknown;
	number: number;
	userId: string;
	category: string;
	status: "open" | "closed";
	claimedBy: string | null;
	helpers?: string[];
	closedBy: string | null;
	createdAt: Date;
	claimedAt: Date | null;
	closedAt: Date | null;
	answers: TicketAnswer[];
	survey: SurveyAnswer[];
	transcript?: TranscriptEntry[];
}

// Nota de atendimento (1 a 5); null se a pergunta "service" não foi respondida.
export function serviceScore(survey: SurveyAnswer[]): number | null {
	const answer = (survey ?? []).find((a) => a.questionId === "service");
	return answer ? answer.value : null;
}

export function toListItem(t: TicketLike, nome: NameFn, channelExists: boolean): ListItem {
	const cat = getCategory(t.category);
	const pessoa = (id: string): Pessoa => ({ id, nome: nome(id) });
	return {
		id: String(t._id),
		number: t.number,
		categoria: cat ? `${cat.emoji} ${cat.label}` : t.category,
		jogador: pessoa(t.userId),
		status: t.status,
		assumidoPor: t.claimedBy ? pessoa(t.claimedBy) : null,
		superiores: (t.helpers ?? []).map(pessoa),
		abertoEm: formatDateBR(t.createdAt),
		tempoAteAssumir: null,
		tempoAteFechar: null,
		nota: serviceScore(t.survey),
		canalApagado: t.status === "open" && !channelExists,
	};
}
