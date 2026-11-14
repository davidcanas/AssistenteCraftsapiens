import {
	ComponentInteraction,
	MessageFlags,
	type ModalSubmitInteraction,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import { deleteReplyLater } from "./autoDelete";
import { getCategory, type TicketAnswer } from "./categories";
import { parseCustomId } from "./customIds";
import { memberCanTakeEscalation, memberIsStaff, type TicketsConfig } from "./config";
import type { TicketDoc } from "./model";
import {
	answerSurvey,
	buildPlayerProfile,
	claimTicket,
	closeTicket,
	findOpenTickets,
	findTicketById,
	MAX_OPEN_TICKETS,
	openTicket,
	requestEscalation,
	takeEscalation,
	toWelcomeView,
	type CloseResult,
	type OpenResult,
} from "./service";
import { surveyMessageAt } from "./survey";
import {
	categoryModal,
	closeConfirmMessage,
	escalationClaimedMessage,
	openConfirmMessage,
	openLimitText,
	panelMessage,
	profileEmbed,
	welcomeMessage,
} from "./views";

const GENERIC_ERROR = "Não foi possível concluir agora. Tente novamente em alguns minutos.";
const OPEN_FAILED = "Não foi possível abrir o ticket agora, tente em alguns minutos.";
const TICKET_NOT_FOUND = "Ticket não encontrado.";
const CANNOT_CLOSE = "Você não pode fechar este ticket.";

function openResultText(result: OpenResult): string {
	// Sem strictNullChecks, `result.ok` não discrimina a união; `in` funciona.
	if (!("reason" in result)) {
		return `Ticket criado: <#${result.channelId}>`;
	}
	switch (result.reason) {
		case "limit":
			return openLimitText(result.channelIds);
		case "busy":
			return "Seu ticket já está sendo criado.";
		default:
			return OPEN_FAILED;
	}
}

async function handleOpen(client: DGClient, interaction: ComponentInteraction, guildId: string, arg: string | null): Promise<void> {
	// Painel novo: menu de seleção (categoria no valor escolhido).
	// Painéis antigos: um botão por categoria (categoria no customID).
	const fromSelect = arg === null && "values" in interaction.data;
	const categoryId = fromSelect && "values" in interaction.data ? interaction.data.values.raw[0] : arg;
	const category = categoryId ? getCategory(categoryId) : undefined;
	if (!category) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		deleteReplyLater(interaction);
		return;
	}

	const openChannelIds = (await findOpenTickets(client, guildId, interaction.user.id)).map((ticket) => ticket.channelId);
	if (openChannelIds.length >= MAX_OPEN_TICKETS) {
		await replyEphemeral(interaction, openLimitText(openChannelIds));
		deleteReplyLater(interaction);
	} else if (openChannelIds.length > 0) {
		// Some também depois de "Abrir outro" ou "Cancelar" (que só editam esta mensagem).
		await interaction.createMessage(openConfirmMessage(category, openChannelIds));
		deleteReplyLater(interaction);
	} else {
		await interaction.createModal(categoryModal(category));
	}

	if (fromSelect) {
		// O Discord deixa a opção marcada no menu; reeditar o painel limpa a seleção
		// para que o jogador possa escolher a mesma categoria de novo.
		await interaction.message.edit({ components: panelMessage().components })
			.catch((error) => console.error("[TICKETS]", error));
	}
}

// "Abrir outro": o limite volta a ser conferido no envio do formulário (openTicket).
async function handleOpenConfirm(interaction: ComponentInteraction, arg: string | null): Promise<void> {
	const category = arg === null ? undefined : getCategory(arg);
	if (!category) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}
	await interaction.createModal(categoryModal(category));
}

async function handleOpenCancel(interaction: ComponentInteraction): Promise<void> {
	await interaction.editParent({ content: "Cancelado.", components: [] });
}

async function replyEphemeral(interaction: ComponentInteraction | ModalSubmitInteraction, content: string): Promise<void> {
	await interaction.createMessage({ content, flags: MessageFlags.EPHEMERAL });
}

async function handleClaimButton(config: TicketsConfig, interaction: ComponentInteraction, arg: string | null): Promise<void> {
	if (!memberIsStaff(interaction.member, config)) {
		await replyEphemeral(interaction, "Só a staff pode assumir.");
		return;
	}
	if (arg === null) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.deferUpdate();
	const result = await claimTicket(arg, interaction.user.id);
	if ("ticket" in result) {
		const { content, allowedMentions, embeds, components } = welcomeMessage(toWelcomeView(result.ticket, config.staffRoleIds));
		await interaction.editOriginal({ content, allowedMentions, embeds, components });
		return;
	}
	const text = result.closed
		? "Este ticket está fechado."
		: result.claimedBy
			? `Este ticket já está sendo atendido por <@${result.claimedBy}>.`
			: GENERIC_ERROR;
	await interaction.createFollowup({ content: text, flags: MessageFlags.EPHEMERAL });
}

async function handleProfileButton(
	client: DGClient,
	config: TicketsConfig,
	interaction: ComponentInteraction,
	guildId: string,
	arg: string | null,
): Promise<void> {
	if (!memberIsStaff(interaction.member, config)) {
		await replyEphemeral(interaction, "Só a staff pode ver a ficha.");
		return;
	}
	if (arg === null) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.defer(MessageFlags.EPHEMERAL);

	const ticket = await findTicketById(arg);
	const guild = client.guilds.get(guildId);
	if (!ticket || !guild) {
		await interaction.editOriginal({ content: GENERIC_ERROR });
		return;
	}

	const profile = await buildPlayerProfile(client, guild, ticket.userId);
	await interaction.editOriginal({ embeds: [profileEmbed(profile)] });
}

async function handleEscalateButton(
	client: DGClient,
	config: TicketsConfig,
	interaction: ComponentInteraction,
	arg: string | null,
): Promise<void> {
	if (!memberIsStaff(interaction.member, config)) {
		await replyEphemeral(interaction, "Só a staff pode chamar um superior.");
		return;
	}
	if (!config.escalationChannelId) {
		await replyEphemeral(interaction, "Chamar superior não está configurado (TICKETS_ESCALATION_CHANNEL_ID).");
		return;
	}
	if (arg === null) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.defer(MessageFlags.EPHEMERAL);
	const result = await requestEscalation(client, config, arg, interaction.user.id);
	const text = "ticket" in result
		? "Pedido enviado aos superiores. O jogador não vê esse pedido."
		: result.reason === "closed" ? "Este ticket está fechado." : TICKET_NOT_FOUND;
	await interaction.editOriginal({ content: text });
}

async function handleEscalateClaimButton(
	client: DGClient,
	config: TicketsConfig,
	interaction: ComponentInteraction,
	arg: string | null,
): Promise<void> {
	if (!memberCanTakeEscalation(interaction.member, config)) {
		await replyEphemeral(interaction, "Só superiores podem assumir este pedido.");
		return;
	}
	const [ticketId, requestedBy] = arg === null ? [] : arg.split(":");
	if (!ticketId || !requestedBy) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.deferUpdate();
	const result = await takeEscalation(client, config, ticketId, interaction.user.id);
	if (!("ticket" in result)) {
		const text = result.reason === "closed" ? "Este ticket já foi fechado." : TICKET_NOT_FOUND;
		await interaction.createFollowup({ content: text, flags: MessageFlags.EPHEMERAL });
		return;
	}

	const { ticket } = result;
	const view = { ticketId, number: ticket.number, channelId: ticket.channelId, requestedBy, roleIds: config.escalationRoleIds };
	const { embeds, components } = escalationClaimedMessage(view, interaction.user.id);
	await interaction.editOriginal({ embeds, components });
	await interaction.createFollowup({ content: `Você assumiu: <#${ticket.channelId}>`, flags: MessageFlags.EPHEMERAL });
}

function canClose(config: TicketsConfig, interaction: ComponentInteraction, ticket: TicketDoc): boolean {
	return ticket.userId === interaction.user.id || memberIsStaff(interaction.member, config);
}

function closeResultText(result: CloseResult): string {
	if (!("reason" in result)) {
		return "Ticket fechado.";
	}
	return result.reason === "already-closed" ? "Este ticket já estava fechado." : TICKET_NOT_FOUND;
}

async function handleCloseButton(config: TicketsConfig, interaction: ComponentInteraction, arg: string | null): Promise<void> {
	if (arg === null) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.defer(MessageFlags.EPHEMERAL);

	const ticket = await findTicketById(arg);
	if (!ticket) {
		await interaction.editOriginal({ content: TICKET_NOT_FOUND });
		return;
	}
	if (!canClose(config, interaction, ticket)) {
		await interaction.editOriginal({ content: CANNOT_CLOSE });
		return;
	}

	const { content, components } = closeConfirmMessage(String(ticket._id));
	await interaction.editOriginal({ content, components });
}

async function handleCloseConfirmButton(
	client: DGClient,
	config: TicketsConfig,
	interaction: ComponentInteraction,
	arg: string | null,
): Promise<void> {
	if (arg === null) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.deferUpdate();

	const ticket = await findTicketById(arg);
	if (!ticket) {
		await interaction.editOriginal({ content: TICKET_NOT_FOUND, components: [] });
		return;
	}
	if (!canClose(config, interaction, ticket)) {
		await interaction.editOriginal({ content: CANNOT_CLOSE, components: [] });
		return;
	}

	const result = await closeTicket(client, config, arg, interaction.user.id);
	await interaction.editOriginal({ content: closeResultText(result), components: [] });
}

async function handleRateButton(interaction: ComponentInteraction, arg: string | null): Promise<void> {
	const parts = arg === null ? [] : arg.split(":");
	const index = Number(parts[1]);
	const value = Number(parts[2]);
	if (parts.length !== 3 || !Number.isInteger(index) || !Number.isInteger(value)) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.deferUpdate();
	const result = await answerSurvey(parts[0], interaction.user.id, index, value);
	if (!("answered" in result)) {
		await interaction.createFollowup({ content: "Só quem abriu o ticket pode avaliar.", flags: MessageFlags.EPHEMERAL });
		return;
	}
	if (result.answered === null) {
		return;
	}

	// Mostra a próxima pergunta pendente (ou a conclusão); nunca repete as respostas.
	const { content, embeds, components } = surveyMessageAt(parts[0], result.answered);
	await interaction.editOriginal({ content, embeds, components });
}

async function handleModalSubmit(
	client: DGClient,
	config: TicketsConfig,
	interaction: ModalSubmitInteraction,
	guildId: string,
	arg: string | null,
): Promise<void> {
	const category = arg === null ? undefined : getCategory(arg);
	if (!category) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	await interaction.defer(MessageFlags.EPHEMERAL);
	deleteReplyLater(interaction); // "Ticket criado", limite ou erro: tudo some depois de 5 min.

	const answers: TicketAnswer[] = category.fields.map((field) => ({
		label: field.label,
		value: (interaction.data.components.getTextInput(field.id) ?? "").trim(),
	}));

	const guild = client.guilds.get(guildId);
	if (!guild) {
		console.error("[TICKETS]", `Servidor ${guildId} não está em cache.`);
		await interaction.editOriginal({ content: OPEN_FAILED });
		return;
	}

	const result = await openTicket(client, config, { guild, userId: interaction.user.id, category, answers });
	await interaction.editOriginal({ content: openResultText(result) });
}

export async function routeTicketInteraction(
	client: DGClient,
	config: TicketsConfig,
	interaction: ComponentInteraction | ModalSubmitInteraction,
): Promise<void> {
	try {
		// Só atende o servidor configurado (e nunca DMs).
		const guildId = interaction.guildID;
		if (guildId !== config.guildId) {
			return;
		}

		const parsed = parseCustomId(interaction.data.customID);
		if (!parsed) {
			await replyEphemeral(interaction, GENERIC_ERROR);
			return;
		}

		if (interaction instanceof ComponentInteraction) {
			switch (parsed.action) {
				case "open":
					await handleOpen(client, interaction, guildId, parsed.arg);
					return;
				case "open-confirm":
					await handleOpenConfirm(interaction, parsed.arg);
					return;
				case "open-cancel":
					await handleOpenCancel(interaction);
					return;
				case "claim":
					await handleClaimButton(config, interaction, parsed.arg);
					return;
				case "profile":
					await handleProfileButton(client, config, interaction, guildId, parsed.arg);
					return;
				case "close":
					await handleCloseButton(config, interaction, parsed.arg);
					return;
				case "close-confirm":
					await handleCloseConfirmButton(client, config, interaction, parsed.arg);
					return;
				case "rate":
					await handleRateButton(interaction, parsed.arg);
					return;
				case "escalate":
					await handleEscalateButton(client, config, interaction, parsed.arg);
					return;
				case "escalate-claim":
					await handleEscalateClaimButton(client, config, interaction, parsed.arg);
					return;
			}
		} else if (parsed.action === "modal") {
			await handleModalSubmit(client, config, interaction, guildId, parsed.arg);
			return;
		}

		// customID de ticket válido, mas sem handler para este tipo de interação.
		await replyEphemeral(interaction, GENERIC_ERROR);
	} catch (error) {
		console.error("[TICKETS]", error);
		const reply = { content: GENERIC_ERROR, flags: MessageFlags.EPHEMERAL };
		const send = interaction.acknowledged ? interaction.createFollowup(reply) : interaction.createMessage(reply);
		await send.catch((replyError) => console.error("[TICKETS]", replyError));
	}
}
