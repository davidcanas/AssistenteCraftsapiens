import path from "node:path";
import { attachmentName } from "./attachments";
import { formatDuration } from "./metrics";
import { getCategory, type TicketAnswer } from "./categories";
import { SURVEY_QUESTIONS, type SurveyAnswer } from "./survey";
import { formatDateBR, type StoredFile, type TranscriptEntry } from "./transcript";

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
		tempoAteAssumir: t.claimedAt ? formatDuration(t.claimedAt.getTime() - t.createdAt.getTime()) : null,
		tempoAteFechar: t.closedAt ? formatDuration(t.closedAt.getTime() - t.createdAt.getTime()) : null,
		nota: serviceScore(t.survey),
		canalApagado: t.status === "open" && !channelExists,
	};
}

export interface ConversaItem {
	autor: { id: string; tag: string; papel: "jogador" | "staff" | "bot" };
	conteudo: string;
	quando: string;
	anexos: { nome: string; url: string; local: boolean }[];
}

export interface Detalhe extends ListItem {
	ficha: TicketAnswer[];
	fechadoPor: Pessoa | null;
	assumidoEm: string | null;
	fechadoEm: string | null;
	avaliacao: { pergunta: string; resposta: string }[];
	canalApagadoSemTranscricao: boolean;
}

export function toDetail(t: TicketLike, nome: NameFn, channelExists: boolean): Detalhe {
	const item = toListItem(t, nome, channelExists);
	const avaliacao: { pergunta: string; resposta: string }[] = [];
	for (const question of SURVEY_QUESTIONS) {
		const answer = (t.survey ?? []).find((a) => a.questionId === question.id);
		if (!answer) continue;
		const option = question.options.find((o) => o.value === answer.value);
		avaliacao.push({ pergunta: question.text, resposta: option ? option.label : String(answer.value) });
	}
	return {
		...item,
		ficha: t.answers ?? [],
		fechadoPor: t.closedBy ? { id: t.closedBy, nome: nome(t.closedBy) } : null,
		assumidoEm: t.claimedAt ? formatDateBR(t.claimedAt) : null,
		fechadoEm: t.closedAt ? formatDateBR(t.closedAt) : null,
		avaliacao,
		canalApagadoSemTranscricao: t.status === "closed" && (t.transcript ?? []).length === 0 && !t.closedBy,
	};
}

export function toConversation(ticketId: string, userId: string, botId: string, entries: TranscriptEntry[]): ConversaItem[] {
	return entries.map((e) => ({
		autor: {
			id: e.authorId,
			tag: e.authorTag,
			papel: e.authorId === userId ? "jogador" : e.authorId === botId ? "bot" : "staff",
		},
		conteudo: e.content,
		quando: formatDateBR(e.createdAt),
		anexos: e.attachments.map((url, i) => {
			const file = e.files?.[i];
			const nomeArquivo = file?.name ?? attachmentName(url);
			return file?.stored
				? { nome: nomeArquivo, url: `/tickets/anexos/${ticketId}/${encodeURIComponent(file.stored)}`, local: true }
				: { nome: nomeArquivo, url, local: false };
		}),
	}));
}

export function isNotFoundError(error: unknown): boolean {
	return (error as { status?: number })?.status === 404;
}

// Só devolve caminho para arquivo gravado e listado no ticket; qualquer outra coisa (traversal incluso) vira null.
export function resolveAttachment(root: string, ticketId: string, files: StoredFile[], arquivo: string): string | null {
	if (!ticketId || path.basename(ticketId) !== ticketId) return null;
	if (!arquivo || path.basename(arquivo) !== arquivo) return null;
	if (!files.some((f) => f.stored === arquivo)) return null;
	return path.join(root, ticketId, arquivo);
}

const INLINE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm", ".mov"]);

export function isInlineFile(fileName: string): boolean {
	return INLINE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}
