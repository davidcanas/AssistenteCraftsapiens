import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class vipCommand extends Command {
	constructor(client: Client) {
		super(client, {
			name: "vip",
			description: "Comandos relacionados a vip/premium/sapiens na craftsapiens",
			category: "Info",
			aliases: [],
			options: [
				{
					name: "comprar",
					description: "Link do site para comprar vip/premium/sapiens na craftsapiens",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: []
				},
			],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
	
		if (ctx.args[0] === "comprar") {
			ctx.sendMessage({
				content: "<:craftsapiens:905025137869463552> [Clique aqui para comprar VIP/Premium/Sapiens](<https://craftsapiens.com.br/loja/>)",
			});
			return;
		}
       
        
		const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
	}
} 