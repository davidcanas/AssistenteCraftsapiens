import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class silentClassClass extends Command {
	constructor(client: Client) {
		super(client, {
			name: "silenciar",
			description: "Desativa as notificações de aulas",
			category: "Util",
			aliases: ["traduzir", "tradutor"],
			options: [
				{
					name: "aviso_aulas",
					description: "Silencia os avisos de aulas enviados pelo bot quando é perguntado sobre aula",
					type: 1,
				}
			],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
       
		const db = await this.client.db.global.findOne({ id: ctx.guild.id });
		if (!db) {
			ctx.sendMessage("Ocorreu um erro ao tentar silenciar as aulas, tente novamente mais tarde.");
			return; 
		}

		if(db.ignoredUsers.includes(ctx.member.id)) {
			db.ignoredUsers = db.ignoredUsers.filter((id) => id !== ctx.member.id);
			await db.save();
			ctx.sendMessage({content: "Agora você voltará a receber informações sobre as aulas quando perguntar pelas aulas.", flags: 1 << 6});
			return;
		} else {
			db.ignoredUsers.push(ctx.member.id);
			await db.save();
			ctx.sendMessage({content: "Agora você não receberá mais informações sobre as aulas quando perguntar pelas aulas.", flags: 1 << 6});
			return;
		}


       
	}
}