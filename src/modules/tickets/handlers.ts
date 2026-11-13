import {
	ComponentInteraction,
	MessageFlags,
	type ModalSubmitInteraction,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import { getCategory } from "./categories";
import { parseCustomId } from "./customIds";
import type { TicketsConfig } from "./config";
import { findOpenTicket, openTicket, type OpenResult } from "./service";
import { categoryModal, type TicketAnswer } from "./views";

const GENERIC_ERROR = "Não foi possível concluir agora. Tente novamente em alguns minutos.";
const OPEN_FAILED = "Não foi possível abrir o ticket agora, tente em alguns minutos.";

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
		return;
	}

	const existing = await findOpenTicket(client, guildId, interaction.user.id);
	if (existing) {
		await interaction.createMessage({ content: alreadyOpenText(existing.channelId), flags: MessageFlags.EPHEMERAL });
		return;
	}

	await interaction.createModal(categoryModal(category));
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
			}
			// As demais ações de botão (claim, profile, close, close-confirm) chegam nas próximas etapas.
			return;
		}

		if (parsed.action === "modal") {
			await handleModalSubmit(client, config, interaction, guildId, parsed.arg);
		}
	} catch (error) {
		console.error("[TICKETS]", error);
		if (!interaction.acknowledged) {
			await interaction
				.createMessage({ content: GENERIC_ERROR, flags: MessageFlags.EPHEMERAL })
				.catch((replyError) => console.error("[TICKETS]", replyError));
		}
	}
}
