import {
	ComponentInteraction,
	MessageFlags,
	type ModalSubmitInteraction,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import { getCategory, type TicketAnswer } from "./categories";
import { parseCustomId } from "./customIds";
import { memberIsStaff, type TicketsConfig } from "./config";
import type { TicketDoc } from "./model";
import {
	answerSurvey,
	buildPlayerProfile,
	claimTicket,
	closeTicket,
	findOpenTicket,
	findTicketById,
	openTicket,
	toWelcomeView,
	type CloseResult,
	type OpenResult,
} from "./service";
import { surveyMessageAt } from "./survey";
import { categoryModal, closeConfirmMessage, profileEmbed, welcomeMessage } from "./views";

const GENERIC_ERROR = "Não foi possível concluir agora. Tente novamente em alguns minutos.";
const OPEN_FAILED = "Não foi possível abrir o ticket agora, tente em alguns minutos.";
const TICKET_NOT_FOUND = "Ticket não encontrado.";
const CANNOT_CLOSE = "Você não pode fechar este ticket.";

function alreadyOpenText(channelId: string): string {
	return `Você já tem um ticket aberto: <#${channelId}>`;
}

function openResultText(result: OpenResult): string {
	// Sem strictNullChecks, `result.ok` não discrimina a união; `in` funciona.
	if (!("reason" in result)) {
		return `Ticket criado: <#${result.channelId}>`;
	}
	switch (result.reason) {
		case "already-open":
			return alreadyOpenText(result.channelId);
		case "busy":
			return "Seu ticket já está sendo criado.";
		default:
			return OPEN_FAILED;
	}
}

async function handleOpenButton(client: DGClient, interaction: ComponentInteraction, guildId: string, arg: string | null): Promise<void> {
	const category = arg === null ? undefined : getCategory(arg);
	if (!category) {
		await replyEphemeral(interaction, GENERIC_ERROR);
		return;
	}

	const existing = await findOpenTicket(client, guildId, interaction.user.id);
	if (existing) {
		await replyEphemeral(interaction, alreadyOpenText(existing.channelId));
		return;
	}

	await interaction.createModal(categoryModal(category));
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
	const { content, components } = surveyMessageAt(parts[0], result.answered);
	await interaction.editOriginal({ content, components });
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
					await handleOpenButton(client, interaction, guildId, parsed.arg);
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
