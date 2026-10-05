import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class Mapa extends Command {
	constructor(client: Client) {
		super(client, {
			name: "mapa",
			description: "Obtenha o link do mapa do servidor",
			category: "Info",
			aliases: ["map"],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
   
		ctx.sendMessage({
			content: "<:craftsapiens:905025137869463552> [Clique aqui para acessar o mapa do servidor](<https://mapa.craftsapiens.com.br>)"
		});

		const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
	}
}
