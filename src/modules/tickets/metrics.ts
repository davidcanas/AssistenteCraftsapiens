import { TICKET_CATEGORIES, TicketCategoryId } from "./categories";

// America/Sao_Paulo tratado como UTC-3 fixo (mesmo valor de survey.ts).
const SP_OFFSET_HOURS = 3;
const DAY_MS = 86_400_000;
const ID_REGEX = /^\d{17,20}$/;

export const PAGE_SIZE = 25;

export interface TicketFilters {
	status: "open" | "closed" | null;
	categoria: TicketCategoryId | null;
	atendente: string | null;
	de: string | null;
	ate: string | null;
	jogador: string | null;
}

export interface BuiltFilter {
	mongo: Record<string, unknown>;
	filtros: TicketFilters;
	pagina: number;
	aviso: string | null;
}

/** "AAAA-MM-DD" -> 00:00 em São Paulo; null se a data for inválida. */
export function spDayStart(ymd: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) return null;
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const date = new Date(Date.UTC(year, month - 1, day, SP_OFFSET_HOURS));
	const local = new Date(date.getTime() - SP_OFFSET_HOURS * 3_600_000);
	if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day) return null;
	return date;
}

function str(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

export function buildTicketFilter(guildId: string, query: Record<string, unknown>, resolveNick: (nick: string) => string | null): BuiltFilter {
	const filtros: TicketFilters = { status: null, categoria: null, atendente: null, de: null, ate: null, jogador: null };
	const mongo: Record<string, unknown> = { guildId };
	let aviso: string | null = null;

	const status = str(query.status);
	if (status === "open" || status === "closed") {
		filtros.status = status;
		mongo.status = status;
	}

	const categoria = str(query.categoria);
	const found = TICKET_CATEGORIES.find((category) => category.id === categoria);
	if (found) {
		filtros.categoria = found.id;
		mongo.category = found.id;
	}

	const atendente = str(query.atendente);
	if (atendente && ID_REGEX.test(atendente)) {
		filtros.atendente = atendente;
		mongo.$or = [{ claimedBy: atendente }, { helpers: atendente }];
	}

	const jogador = str(query.jogador);
	if (jogador) {
		filtros.jogador = jogador;
		if (ID_REGEX.test(jogador)) {
			mongo.userId = jogador;
		} else {
			const id = resolveNick(jogador);
			if (id) {
				mongo.userId = id;
			} else {
				mongo.userId = { $in: [] };
				aviso = `O nick ${jogador} não tem conta do Discord vinculada.`;
			}
		}
	}

	const range: { $gte?: Date; $lt?: Date } = {};
	const de = str(query.de);
	const inicio = de ? spDayStart(de) : null;
	if (de && inicio) {
		filtros.de = de;
		range.$gte = inicio;
	}
	const ate = str(query.ate);
	const fim = ate ? spDayStart(ate) : null;
	if (ate && fim) {
		filtros.ate = ate;
		range.$lt = new Date(fim.getTime() + DAY_MS);
	}
	if (range.$gte || range.$lt) mongo.createdAt = range;

	const parsed = parseInt(str(query.pagina) ?? "", 10);
	const pagina = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;

	return { mongo, filtros, pagina, aviso };
}
