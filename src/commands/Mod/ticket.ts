import { CommandInteraction, MessageFlags } from "oceanic.js";
import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { getTicketsConfig, memberIsStaff, publishPanel, sendMonthlySummary, type TicketsConfig } from "../../modules/tickets";

const GENERIC_ERROR = "Não foi possível concluir agora. Tente novamente em alguns minutos.";

function logError(error: unknown): void {
	console.error("[TICKETS]", error);
}

export default class Ticket extends Command {
	constructor(client: Client) {
		super(client, {
			name: "ticket",
			description: "Sistema de tickets",
			category: "Mod",
			aliases: [],
			options: [
				{
					type: 1,
					name: "painel",
					description: "Publica o painel de tickets neste canal",
				},
				{
					type: 1,
					name: "resumo",
					description: "Envia agora o resumo de tickets do mês anterior",
				},
			],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		try {
			const config = getTicketsConfig();
			if (!config) {
				await this.replyEphemeral(ctx, "Sistema de tickets desativado.");
				return;
			}

			if (ctx.args[0] === "resumo") {
				await this.sendSummary(ctx, config);
				return;
			}
			if (ctx.args[0] === "painel") {
				await this.sendPanel(ctx, config);
				return;
			}
			await this.replyEphemeral(ctx, "Use /ticket painel ou /ticket resumo.");
		} catch (error) {
			logError(error);
			await this.replyEphemeral(ctx, GENERIC_ERROR).catch(logError);
		}
	}

	private async sendPanel(ctx: CommandContext, config: TicketsConfig): Promise<void> {
		if (!memberIsStaff(ctx.member, config)) {
			await this.replyEphemeral(ctx, "Só a staff pode publicar o painel.");
			return;
		}

		await this.deferEphemeral(ctx);
		try {
			await publishPanel(this.client, ctx.msg.channelID);
		} catch (error) {
			logError(error);
			await this.replyEphemeral(ctx, "Não foi possível publicar o painel aqui (verifique as permissões do bot).").catch(logError);
			return;
		}
		await this.replyEphemeral(ctx, "Painel publicado.");
	}

	private async sendSummary(ctx: CommandContext, config: TicketsConfig): Promise<void> {
		if (!ctx.member?.permissions.has("MANAGE_GUILD")) {
			await this.replyEphemeral(ctx, "Só quem tem Gerenciar Servidor pode enviar o resumo.");
			return;
		}
		if (!config.summaryChannelId) {
			await this.replyEphemeral(ctx, "Configure TICKETS_SUMMARY_CHANNEL_ID para usar o resumo.");
			return;
		}

		await this.deferEphemeral(ctx);
		try {
			await sendMonthlySummary(this.client, config);
		} catch (error) {
			logError(error);
			await this.replyEphemeral(ctx, "Não foi possível enviar o resumo agora.").catch(logError);
			return;
		}
		await this.replyEphemeral(ctx, `Resumo enviado em <#${config.summaryChannelId}>.`);
	}

	/** ctx.defer() não aceita flags (resposta pública); defere efêmero direto na interação. */
	private async deferEphemeral(ctx: CommandContext): Promise<void> {
		const interaction = ctx.msg instanceof CommandInteraction ? ctx.msg : null;
		if (interaction && !interaction.acknowledged) {
			await interaction.defer(MessageFlags.EPHEMERAL);
		}
	}

	private async replyEphemeral(ctx: CommandContext, content: string): Promise<void> {
		const interaction = ctx.msg instanceof CommandInteraction ? ctx.msg : null;
		if (interaction?.acknowledged) {
			await interaction.editOriginal({ content });
			return;
		}
		await ctx.sendMessage({ content, flags: MessageFlags.EPHEMERAL });
	}
}
