import {
	ComponentInteraction,
	MessageFlags,
	type ModalSubmitInteraction,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import { getCategory } from "./categories";
import { parseCustomId } from "./customIds";
import { isStaff, type TicketsConfig } from "./config";
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
import { surveyDoneMessage, surveyQuestionMessage } from "./survey";
import { categoryModal, closeConfirmMessage, profileEmbed, welcomeMessage, type TicketAnswer } from "./views";

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
		await interaction.createMessage({ content: alreadyOpenText(existing.channelId), flags: MessageFlags.EPHEMERAL });
		return;
	}

	await interaction.createModal(categoryModal(category));
}

function memberIsStaff(config: TicketsConfig, interaction: ComponentInteraction): boolean {
	const member = interaction.member;
	return !!member && isStaff(member.roles, member.permissions.has("MANAGE_GUILD"), config.staffRoleIds);
}

async function replyEphemeral(interaction: ComponentInteraction, content: string): Promise<void> {
	await interaction.createMessage({ content, flags: MessageFlags.EPHEMERAL });
}

async function handleClaimButton(config: TicketsConfig, interaction: ComponentInteraction, arg: string | null): Promise<void> {
	if (!memberIsStaff(config, interaction)) {
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
	if (!memberIsStaff(config, interaction)) {
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
	return ticket.userId === interaction.user.id || memberIsStaff(config, interaction);
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
	if ("reason" in result) {
		if (result.reason === "not-owner") {
			await interaction.createFollowup({ content: "Só quem abriu o ticket pode avaliar.", flags: MessageFlags.EPHEMERAL });
		}
		return;
	}

	const { content, components } = result.next === null ? surveyDoneMessage() : surveyQuestionMessage(parts[0], result.next);
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
		await interaction.createMessage({ content: GENERIC_ERROR, flags: MessageFlags.EPHEMERAL });
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
		const guildId = interaction.guildID;
		if (!guildId) {
			return;
		}

		const parsed = parseCustomId(interaction.data.customID);
		if (!parsed) {
			return;
		}

		if (interaction instanceof ComponentInteraction) {
			if (parsed.action === "open") {
				await handleOpenButton(client, interaction, guildId, parsed.arg);
			} else if (parsed.action === "claim") {
				await handleClaimButton(config, interaction, parsed.arg);
			} else if (parsed.action === "profile") {
				await handleProfileButton(client, config, interaction, guildId, parsed.arg);
			} else if (parsed.action === "close") {
				await handleCloseButton(config, interaction, parsed.arg);
			} else if (parsed.action === "close-confirm") {
				await handleCloseConfirmButton(client, config, interaction, parsed.arg);
			} else if (parsed.action === "rate") {
				await handleRateButton(interaction, parsed.arg);
			}
			return;
		}

		if (parsed.action === "modal") {
			await handleModalSubmit(client, config, interaction, guildId, parsed.arg);
		}
	} catch (error) {
		console.error("[TICKETS]", error);
		const reply = { content: GENERIC_ERROR, flags: MessageFlags.EPHEMERAL };
		const send = interaction.acknowledged ? interaction.createFollowup(reply) : interaction.createMessage(reply);
		await send.catch((replyError) => console.error("[TICKETS]", replyError));
	}
}
