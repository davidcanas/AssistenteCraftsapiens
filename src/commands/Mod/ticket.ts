import { CommandInteraction } from "oceanic.js";
import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { getTicketsConfig } from "../../modules/tickets";
import { isStaff, type TicketsConfig } from "../../modules/tickets/config";
import { sendMonthlySummary } from "../../modules/tickets/service";
import { panelMessage } from "../../modules/tickets/views";

const EPHEMERAL = 64;

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
				await ctx.sendMessage({ content: "Sistema de tickets desativado.", flags: EPHEMERAL });
				return;
			}

			if (ctx.args[0] === "resumo") {
				await this.sendSummary(ctx, config);
				return;
			}

			if (ctx.args[0] !== "painel") {
				await ctx.sendMessage({ content: "Use /ticket painel ou /ticket resumo.", flags: EPHEMERAL });
				return;
			}

			const member = ctx.member;
			const staff = member ? isStaff(member.roles, member.permissions.has("MANAGE_GUILD"), config.staffRoleIds) : false;
			if (!staff) {
				await ctx.sendMessage({ content: "Só a staff pode publicar o painel.", flags: EPHEMERAL });
				return;
			}

			await ctx.channel.createMessage(panelMessage());
			await ctx.sendMessage({ content: "Painel publicado.", flags: EPHEMERAL });
		} catch (error) {
			console.error("[TICKETS]", error);
		}
	}

	private async sendSummary(ctx: CommandContext, config: TicketsConfig): Promise<void> {
		if (!ctx.member?.permissions.has("MANAGE_GUILD")) {
			await ctx.sendMessage({ content: "Só quem tem Gerenciar Servidor pode enviar o resumo.", flags: EPHEMERAL });
			return;
		}
		if (!config.summaryChannelId) {
			await ctx.sendMessage({ content: "Configure TICKETS_SUMMARY_CHANNEL_ID para usar o resumo.", flags: EPHEMERAL });
			return;
		}

		// ctx.defer() não aceita flags (resposta pública); defere efêmero direto na interação.
		const interaction = ctx.msg instanceof CommandInteraction ? ctx.msg : null;
		if (interaction) {
			await interaction.defer(EPHEMERAL);
		}
		let text = `Resumo enviado em <#${config.summaryChannelId}>.`;
		try {
			await sendMonthlySummary(this.client, config);
		} catch (error) {
			console.error("[TICKETS]", error);
			text = "Não foi possível enviar o resumo agora.";
		}
		if (interaction) {
			await interaction.editOriginal({ content: text });
		} else {
			await ctx.sendMessage({ content: text, flags: EPHEMERAL });
		}
	}
}
