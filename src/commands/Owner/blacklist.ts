import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class blacklist extends Command {
	constructor(client: Client) {
		super(client, {
			name: "bl",
			description: "[STAFF] Adiciona um usuário na blacklist do assistente",
			category: "DG",
			aliases: [],
			options: [
				{
					name: "listar",
					description: "Lista os usuários na blacklist",
					type: 1
				},
				{
					name: "add",
					description: "Banir um jogador de usar o assistente",
					type: 1,
					options: [
						{
							type: 6,
							name: "user",
							description: "Usuário que deseja banir de usar o assistente",
							required: true
						}
					]
				},
				{
					name: "remove",
					description: "Permite um jogador de usar o assistente",
					type: 1,
					options: [
						{
							type: 6,
							name: "user",
							description: "Usuário que deseja desbanir de usar comandos de música",
							required: true
						}
					]
				},
			]
		});
	}

	async execute(ctx: CommandContext): Promise<void> {

		if (!this.client.allowedUsers.includes(ctx.author.id)) {
			ctx.sendMessage({
				content: "Você não tem acesso a esse comando!",
				flags: 1 << 6
			});
			return;
		}

		const db = await this.client.db.global.findOne({ id: ctx.guild.id });

		if (!db) return;

		if (ctx.args[0] === "listar") {
			let users = "";

			for (const user of db.blacklistedUsers) {
				users += `<@${this.client.users.get(user)?.id}>\n`;
			}


			ctx.sendMessage({
				content: `**LISTA NEGRA - UTILIZAÇÃO DO ASSISTENTE**\n\n**Jogadores:**\n${users}`,
				flags: 1 << 6
			});
			return;
		}

		const action = ctx.args[0];
		const target = ctx.args[1];


		if (action === "add" || action === "remove") {
			const user = this.client.users.get(target);
			const channel = this.client.guilds.get("892472046729179136").channels.get(target);
        
			if (user && user.username) {
				
				if (action === "add") {
					if (db.blacklistedUsers.includes(target)) {
						ctx.sendMessage({
							content: "Esse usuário já está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.blacklistedUsers.push(target);
						await db.save();
						ctx.sendMessage({
							content: `O usuário ${user.username} foi adicionado na blacklist!`,
							flags: 1 << 6
						});
					}
				} else {
					if (!db.blacklistedUsers.includes(target)) {
						ctx.sendMessage({
							content: "Esse usuário não está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.blacklistedUsers.splice(db.blacklistedUsers.indexOf(target), 1);
						await db.save();
						ctx.sendMessage({
							content: `O usuário ${user.username} foi removido da blacklist!`,
							flags: 1 << 6
						});
					}
				}
			} else {
				ctx.sendMessage({
					content: "Você deve especificar um usuário válido!",
					flags: 1 << 6
				});
			}
		}
	}
}
