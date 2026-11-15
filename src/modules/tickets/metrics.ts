import { TICKET_CATEGORIES, TicketCategoryId } from "./categories";
import { summarizeMonth, type MonthTicket, type StaffStats } from "./survey";

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

/** Duração em texto curto: arredonda para baixo e mostra no máximo 2 unidades. */
export function formatDuration(ms: number): string {
	const minutes = Math.floor(Math.max(0, ms) / 60_000);
	if (minutes < 1) return "<1min";
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const mins = minutes % 60;
	if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
	if (hours > 0) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
	return `${mins}min`;
}

export interface TimedTicket { claimedBy: string | null; createdAt: Date; claimedAt: Date | null; closedAt: Date | null; }
export interface TimeStats { ateAssumirMs: number | null; ateFecharMs: number | null; }

function mean(values: number[]): number | null {
	return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function timeStats(tickets: TimedTicket[]): TimeStats {
	return {
		ateAssumirMs: mean(tickets.filter((t) => t.claimedAt).map((t) => t.claimedAt.getTime() - t.createdAt.getTime())),
		ateFecharMs: mean(tickets.filter((t) => t.closedAt).map((t) => t.closedAt.getTime() - t.createdAt.getTime())),
	};
}

/** Tempos médios até assumir e até fechar; por atendente só conta quem assumiu o ticket. */
export function responseTimes(tickets: TimedTicket[]): { geral: TimeStats; porAtendente: Map<string, TimeStats> } {
	const groups = new Map<string, TimedTicket[]>();
	for (const ticket of tickets) {
		if (!ticket.claimedBy) continue;
		groups.set(ticket.claimedBy, [...(groups.get(ticket.claimedBy) ?? []), ticket]);
	}
	const porAtendente = new Map<string, TimeStats>();
	for (const [id, group] of groups) porAtendente.set(id, timeStats(group));
	return { geral: timeStats(tickets), porAtendente };
}

export interface Period { start: Date; end: Date; de: string; ate: string; label: string; }

function ymd(date: Date): string {
	return new Date(date.getTime() - SP_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

function dmy(value: string): string {
	return value.split("-").reverse().join("/");
}

/** Período por dia (fuso de São Paulo); padrão: últimos 30 dias, hoje incluso. */
export function parsePeriod(query: Record<string, unknown>, now: Date): Period {
	const today = ymd(now);
	const todayStart = spDayStart(today);
	let de = str(query.de);
	let ate = str(query.ate);
	if (!de || !spDayStart(de)) de = ymd(new Date(todayStart.getTime() - 29 * DAY_MS));
	if (!ate || !spDayStart(ate)) ate = today;
	if (de > ate) [de, ate] = [ate, de];
	return {
		start: spDayStart(de),
		end: new Date(spDayStart(ate).getTime() + DAY_MS),
		de,
		ate,
		label: `${dmy(de)} a ${dmy(ate)}`,
	};
}

export interface StaffRow {
	id: string | null;
	nome: string;
	atendidos: number;
	avaliados: number;
	resolvidoPct: number | null;
	atendimentoMedia: number | null;
	tempoMedia: number | null;
	mediaAteAssumir: string | null;
	mediaAteFechar: string | null;
	comoSuperior: number;
}

function row(stats: StaffStats, nome: string, times: TimeStats | undefined, comoSuperior: number): StaffRow {
	return {
		id: stats.staffId,
		nome,
		atendidos: stats.handled,
		avaliados: stats.rated,
		resolvidoPct: stats.resolvedPct,
		atendimentoMedia: stats.serviceAvg,
		tempoMedia: stats.speedAvg,
		mediaAteAssumir: times?.ateAssumirMs != null ? formatDuration(times.ateAssumirMs) : null,
		mediaAteFechar: times?.ateFecharMs != null ? formatDuration(times.ateFecharMs) : null,
		comoSuperior,
	};
}

export function staffRows(tickets: (MonthTicket & TimedTicket)[], nome: (id: string) => string): { linhas: StaffRow[]; geral: StaffRow } {
	const summary = summarizeMonth(tickets);
	const times = responseTimes(tickets);
	const linhas = summary.perStaff.map((stats) => {
		if (stats.staffId === null) return row(stats, "Sem atendente", undefined, 0);
		const id = stats.staffId;
		const comoSuperior = tickets.filter((t) => (t.helpers ?? []).includes(id)).length;
		return row(stats, nome(id), times.porAtendente.get(id), comoSuperior);
	});
	return { linhas, geral: row(summary.overall, "Geral", times.geral, 0) };
}
