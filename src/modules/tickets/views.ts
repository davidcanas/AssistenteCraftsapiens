import {
	ButtonStyles,
	ComponentTypes,
	MessageFlags,
	TextInputStyles,
	type CreateMessageOptions,
	type EmbedOptions,
	type InteractionContent,
	type ModalData,
} from "oceanic.js";
import { TICKET_CATEGORIES, getCategory, type TicketAnswer, type TicketCategory } from "./categories";
import { buildCustomId } from "./customIds";
import { COLOR_PRIMARY, EMPTY } from "./style";

export interface WelcomeView {
	ticketId: string;
	number: number;
	userId: string;
	categoryId: string;
	answers: TicketAnswer[];
	staffRoleIds: string[];
	claimedBy: string | null;
	// Ticket fechado: todos os botões do card ficam desativados.
	closed?: boolean;
}

export interface PlayerProfile {
	userId: string;
	nick: string | null;
	linked: boolean;
	api: { group: string | null; online: boolean | null; town: string | null; nation: string | null } | "unavailable";
	punishments: { total: number; last: Array<{ tipo?: string; motivo?: string; horario?: string }> } | "unavailable";
}

export interface LogSummary {
	number: number;
	categoryLabel: string;
	userId: string;
	claimedBy: string | null;
	closedBy: string;
	openedAt: Date;
	closedAt: Date;
}

const COLOR_INFO = 0x2b8a3e;
const COLOR_LOG = 0x868e96;
const UNAVAILABLE = "Indisponível";
const MODAL_TITLE_MAX = 45;
const EMBED_FIELD_MAX = 1024;
const LAST_PUNISHMENTS = 3;

export function ticketChannelName(n: number): string {
	return `ticket-${n}`;
}

export function closedChannelName(n: number): string {
	return `closed-${n}`;
}

function formatDuration(ms: number): string {
	const totalMinutes = Math.max(0, Math.floor(ms / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export function panelMessage(): CreateMessageOptions {
	return {
		embeds: [
			{
				title: "Precisa de ajuda?",
				description: [
					"Escolha abaixo o tipo de atendimento. Um canal privado será aberto para você e a equipe.",
					"",
					...TICKET_CATEGORIES.map((category) => `${category.emoji} **${category.label}** — ${category.description}`),
				].join("\n"),
				color: COLOR_PRIMARY,
			},
		],
		components: [
			{
				type: ComponentTypes.ACTION_ROW,
				components: [
					{
						type: ComponentTypes.STRING_SELECT,
						customID: buildCustomId("open"),
						placeholder: "Selecione o tipo de atendimento…",
						minValues: 1,
						maxValues: 1,
						options: TICKET_CATEGORIES.map((category) => ({
							label: category.label,
							value: category.id,
							description: category.description,
							emoji: { name: category.emoji },
						})),
					},
				],
			},
		],
	};
}

export function categoryModal(category: TicketCategory): ModalData {
	return {
		customID: buildCustomId("modal", category.id),
		title: `Ticket — ${category.label}`.slice(0, MODAL_TITLE_MAX),
		components: category.fields.map((field) => ({
			type: ComponentTypes.ACTION_ROW as const,
			components: [
				{
					type: ComponentTypes.TEXT_INPUT as const,
					customID: field.id,
					label: field.label,
					style: field.style === "paragraph" ? TextInputStyles.PARAGRAPH : TextInputStyles.SHORT,
					required: field.required,
					maxLength: field.maxLength,
				},
			],
		})),
	};
}

export function welcomeMessage(v: WelcomeView): CreateMessageOptions {
	const category = getCategory(v.categoryId);
	const label = category ? category.label : v.categoryId;
	const fields = v.answers.map((answer) => ({
		name: answer.label,
		value: (answer.value.trim() === "" ? EMPTY : answer.value).slice(0, EMBED_FIELD_MAX),
	}));
	if (v.claimedBy) {
		fields.push({ name: "Atendido por", value: `<@${v.claimedBy}>` });
	}

	return {
		content: [`<@${v.userId}>`, ...v.staffRoleIds.map((id) => `<@&${id}>`)].join(" "),
		allowedMentions: { users: [v.userId], roles: [...v.staffRoleIds] },
		embeds: [
			{
				title: `Ticket #${v.number} — ${label}`,
				description: "Envie aqui imagens e vídeos que ajudem a equipe a entender o caso.",
				color: COLOR_PRIMARY,
				fields,
			},
		],
		components: [
			{
				type: ComponentTypes.ACTION_ROW,
				components: [
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.SUCCESS,
						customID: buildCustomId("claim", v.ticketId),
						label: "Assumir",
						emoji: { name: "🙋" },
						...(v.claimedBy || v.closed ? { disabled: true } : {}),
					},
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.SECONDARY,
						customID: buildCustomId("profile", v.ticketId),
						label: "Ficha",
						emoji: { name: "📋" },
						...(v.closed ? { disabled: true } : {}),
					},
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.DANGER,
						customID: buildCustomId("close", v.ticketId),
						label: "Fechar",
						emoji: { name: "🔒" },
						...(v.closed ? { disabled: true } : {}),
					},
				],
			},
		],
	};
}

function channelList(channelIds: string[]): string {
	return channelIds.map((id) => `<#${id}>`).join(", ");
}

function openCountText(channelIds: string[]): string {
	const count = channelIds.length;
	return `Você já tem ${count} ${count === 1 ? "ticket aberto" : "tickets abertos"}: ${channelList(channelIds)}`;
}

export function openLimitText(channelIds: string[]): string {
	return `${openCountText(channelIds)}\nFeche um deles antes de abrir outro.`;
}

/** Jogador que já tem ticket aberto confirma antes de abrir mais um. */
export function openConfirmMessage(category: TicketCategory, channelIds: string[]): InteractionContent {
	return {
		content: `${openCountText(channelIds)}\nQuer abrir outro de ${category.emoji} **${category.label}** mesmo assim?`,
		flags: MessageFlags.EPHEMERAL,
		components: [
			{
				type: ComponentTypes.ACTION_ROW,
				components: [
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.PRIMARY,
						customID: buildCustomId("open-confirm", category.id),
						label: "Abrir outro",
					},
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.SECONDARY,
						customID: buildCustomId("open-cancel"),
						label: "Cancelar",
					},
				],
			},
		],
	};
}

export function closeConfirmMessage(ticketId: string): InteractionContent {
	return {
		content: "Tem certeza que deseja fechar este ticket?",
		flags: MessageFlags.EPHEMERAL,
		components: [
			{
				type: ComponentTypes.ACTION_ROW,
				components: [
					{
						type: ComponentTypes.BUTTON,
						style: ButtonStyles.DANGER,
						customID: buildCustomId("close-confirm", ticketId),
						label: "Confirmar fechamento",
					},
				],
			},
		],
	};
}

export function profileEmbed(p: PlayerProfile): EmbedOptions {
	const fields: Array<{ name: string; value: string; inline?: boolean }> = [
		{ name: "Discord", value: `<@${p.userId}>${p.nick ? ` (${p.nick})` : ""}`, inline: true },
		{ name: "Vínculo", value: p.linked ? "Vinculado" : "Não vinculado", inline: true },
	];

	if (p.api === "unavailable") {
		fields.push({ name: "Dados do jogo", value: UNAVAILABLE });
	} else {
		const online = p.api.online === null ? EMPTY : p.api.online ? "Online" : "Offline";
		fields.push(
			{ name: "Grupo", value: p.api.group ?? EMPTY, inline: true },
			{ name: "Status", value: online, inline: true },
			{ name: "Cidade", value: p.api.town ?? EMPTY, inline: true },
			{ name: "Nação", value: p.api.nation ?? EMPTY, inline: true },
		);
	}

	let punishments: string;
	if (p.punishments === "unavailable") {
		punishments = UNAVAILABLE;
	} else if (p.punishments.total === 0) {
		punishments = "Nenhuma";
	} else {
		const lines = p.punishments.last.slice(0, LAST_PUNISHMENTS).map((item) => {
			const horario = item.horario ? ` (${item.horario})` : "";
			return `${item.tipo ?? EMPTY} — ${item.motivo ?? EMPTY}${horario}`;
		});
		punishments = [`Total: ${p.punishments.total}`, ...lines].join("\n").slice(0, EMBED_FIELD_MAX);
	}
	fields.push({ name: "Punições", value: punishments });

	return { title: "Ficha do jogador", color: COLOR_INFO, fields };
}

export function closedNoticeMessage(closedBy: string, deleteAt: Date): CreateMessageOptions {
	const unix = Math.floor(deleteAt.getTime() / 1000);
	return {
		embeds: [
			{
				title: "🔒 Ticket fechado",
				color: COLOR_PRIMARY,
				description: `Fechado por <@${closedBy}>\nEste canal será apagado <t:${unix}:R>`,
			},
		],
		allowedMentions: {},
	};
}

export function logMessage(s: LogSummary, transcriptText: string): CreateMessageOptions {
	return {
		embeds: [
			{
				title: `Ticket #${s.number} fechado`,
				color: COLOR_LOG,
				fields: [
					{ name: "Número", value: `#${s.number}`, inline: true },
					{ name: "Tipo", value: s.categoryLabel, inline: true },
					{ name: "Jogador", value: `<@${s.userId}>`, inline: true },
					{ name: "Assumido por", value: s.claimedBy ? `<@${s.claimedBy}>` : EMPTY, inline: true },
					{ name: "Fechado por", value: `<@${s.closedBy}>`, inline: true },
					{ name: "Duração", value: formatDuration(s.closedAt.getTime() - s.openedAt.getTime()), inline: true },
				],
			},
		],
		allowedMentions: {},
		files: [{ name: `ticket-${s.number}.txt`, contents: Buffer.from(transcriptText, "utf8") }],
	};
}
