import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { getTicketsConfig } from "../../modules/tickets";
import { isStaff } from "../../modules/tickets/config";
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

			if (ctx.args[0] !== "painel") {
				await ctx.sendMessage({ content: "Use /ticket painel.", flags: EPHEMERAL });
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
}
