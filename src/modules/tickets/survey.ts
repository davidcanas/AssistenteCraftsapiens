import { ButtonStyles, ComponentTypes, type CreateMessageOptions, type EmbedOptions } from "oceanic.js";
import { getCategory } from "./categories";
import { buildCustomId } from "./customIds";

export interface SurveyOption { label: string; value: number; }
export interface SurveyQuestion { id: "resolved" | "service" | "speed"; text: string; options: SurveyOption[]; }
export interface SurveyAnswer { questionId: string; value: number; answeredAt: Date; }

export interface MonthTicket { claimedBy: string | null; category: string; survey: Array<{ questionId: string; value: number }>; }
export interface StaffStats { staffId: string | null; handled: number; rated: number; resolvedPct: number | null; serviceAvg: number | null; speedAvg: number | null; }
export interface MonthSummary { total: number; byCategory: Record<string, number>; overall: StaffStats; perStaff: StaffStats[]; }

const scale = (): SurveyOption[] => [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));

export const SURVEY_QUESTIONS: readonly SurveyQuestion[] = [
	{
		id: "resolved",
		text: "Seu problema foi resolvido?",
		options: [{ label: "Sim", value: 2 }, { label: "Em parte", value: 1 }, { label: "Não", value: 0 }],
	},
	{ id: "service", text: "Como você avalia o atendimento?", options: scale() },
	{ id: "speed", text: "E o tempo até ser atendido?", options: scale() },
];

const COLOR_SUMMARY = 0x5865f2;
const EMPTY = "—";
const SP_OFFSET_HOURS = 3;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const RESOLVED_SCORE: Record<number, number> = { 2: 100, 1: 50, 0: 0 };

export function surveyQuestionMessage(ticketId: string, index: number): CreateMessageOptions {
	const question = SURVEY_QUESTIONS[index];
	return {
		content: `${question.text}\nSuas respostas são anônimas para a staff (${index + 1}/${SURVEY_QUESTIONS.length})`,
		components: [{
			type: ComponentTypes.ACTION_ROW,
			components: question.options.map((option) => ({
				type: ComponentTypes.BUTTON as const,
				style: (question.id === "resolved" ? ButtonStyles.PRIMARY : ButtonStyles.SECONDARY) as ButtonStyles.PRIMARY | ButtonStyles.SECONDARY,
				label: option.label,
				customID: buildCustomId("rate", `${ticketId}:${index}:${option.value}`),
			})),
		}],
	};
}

export function surveyDoneMessage(): CreateMessageOptions {
	return { content: "Avaliação registrada. Obrigado!", components: [] };
}

export function previousMonthRange(now: Date): { start: Date; end: Date; label: string } {
	const local = new Date(now.getTime() - SP_OFFSET_HOURS * 3_600_000);
	const year = local.getUTCFullYear();
	const month = local.getUTCMonth();
	const end = new Date(Date.UTC(year, month, 1, SP_OFFSET_HOURS));
	const start = new Date(Date.UTC(year, month - 1, 1, SP_OFFSET_HOURS));
	const startLocal = new Date(start.getTime() - SP_OFFSET_HOURS * 3_600_000);
	return { start, end, label: `${MONTHS[startLocal.getUTCMonth()]} de ${startLocal.getUTCFullYear()}` };
}

function average(values: number[]): number | null {
	return values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;
}

function statsFor(staffId: string | null, group: MonthTicket[]): StaffStats {
	const answers = (questionId: string): number[] =>
		group.flatMap((t) => t.survey.filter((a) => a.questionId === questionId).map((a) => a.value));
	return {
		staffId,
		handled: group.length,
		rated: group.filter((t) => t.survey.length > 0).length,
		resolvedPct: average(answers("resolved").map((v) => RESOLVED_SCORE[v] ?? 0)),
		serviceAvg: average(answers("service")),
		speedAvg: average(answers("speed")),
	};
}

export function summarizeMonth(tickets: MonthTicket[]): MonthSummary {
	const byCategory: Record<string, number> = {};
	const groups = new Map<string | null, MonthTicket[]>();
	for (const ticket of tickets) {
		byCategory[ticket.category] = (byCategory[ticket.category] ?? 0) + 1;
		groups.set(ticket.claimedBy, [...(groups.get(ticket.claimedBy) ?? []), ticket]);
	}

	const perStaff = [...groups.entries()]
		.map(([staffId, group]) => statsFor(staffId, group))
		.sort((a, b) => {
			if (a.staffId === null) { return b.staffId === null ? 0 : 1; }
			if (b.staffId === null) { return -1; }
			return b.handled - a.handled;
		});

	return { total: tickets.length, byCategory, overall: statsFor(null, tickets), perStaff };
}

function fmtAvg(value: number | null): string {
	return value === null ? EMPTY : value.toFixed(1);
}

function fmtPct(value: number | null): string {
	return value === null ? EMPTY : `${Math.round(value)}%`;
}

function statsLine(s: StaffStats): string {
	return `${s.handled} atendidos · ${s.rated} avaliados · resolvido ${fmtPct(s.resolvedPct)} · atendimento ${fmtAvg(s.serviceAvg)} · tempo ${fmtAvg(s.speedAvg)}`;
}

export function monthlySummaryEmbed(s: MonthSummary, label: string): EmbedOptions {
	const categories = Object.entries(s.byCategory)
		.map(([id, count]) => `${getCategory(id)?.label ?? id}: ${count}`)
		.join("\n");
	const staff = s.perStaff
		.map((p) => `${p.staffId === null ? "Sem atendente" : `<@${p.staffId}>`} — ${statsLine(p)}`)
		.join("\n");

	return {
		title: `Resumo de tickets — ${label}`,
		color: COLOR_SUMMARY,
		description: `Total de tickets: ${s.total}`,
		fields: [
			{ name: "Por tipo", value: categories || EMPTY },
			{ name: "Geral", value: statsLine(s.overall) },
			{ name: "Por staff", value: staff || EMPTY },
		],
	};
}
