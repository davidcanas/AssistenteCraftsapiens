import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class blacklistMusic extends Command {
	constructor(client: Client) {
		super(client, {
			name: "bl_music",
			description: "[STAFF] Adiciona um usuário/canal na blacklist do sistema de musica",
			category: "DG",
			aliases: ["blacklist_music", "bl_music", "blacklistmusic", "blmusic"],
			options: [
				{
					name: "listar",
					description: "Lista os usuários/canais na blacklist de comandos de música",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND
				},
				{
					name: "add",
					description: "Banir um jogador ou canal de usar comandos de música",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: [
						{
							type: Constants.ApplicationCommandOptionTypes.USER,
							name: "user",
							description: "Usuário que deseja banir de usar comandos de música",
							required: false
						},
						{
							type: Constants.ApplicationCommandOptionTypes.CHANNEL,
							name: "channel",
							description: "Canal que deseja banir de usar comandos de música",
							required: false
						}
					]
				},
				{
					name: "remove",
					description: "Remove um jogador ou canal da blacklist de comandos de musica",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: [
						{
							type: Constants.ApplicationCommandOptionTypes.USER,
							name: "user",
							description: "Usuário que deseja desbanir de usar comandos de música",
							required: false
						},
						{
							type: Constants.ApplicationCommandOptionTypes.CHANNEL,
							name: "channel",
							description: "Canal que deseja desbanir de usar comandos de música",
							required: false
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
			let channels = "";

			for (const user of db.music.blacklistedUsers) {
				users += `<@${this.client.users.get(user)?.id}>\n`;
			}

			for (const channel of db.music.restrictedChannels) {
				channels += `<#${this.client.guilds.get(this.client.guildID).channels.get(channel)?.id}>\n`;
			}

			ctx.sendMessage({
				content: `**LISTA NEGRA - UTILIZAÇÃO DO SISTEMA DE MÚSICA**\n\n**Jogadores:**\n${users}\n**Canais:**\n${channels}`,
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
					if (db.music.blacklistedUsers.includes(target)) {
						ctx.sendMessage({
							content: "Esse usuário já está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.music.blacklistedUsers.push(target);
						await db.save();
						ctx.sendMessage({
							content: `O usuário ${user.username} foi adicionado na blacklist!`,
							flags: 1 << 6
						});
					}
				} else {
					if (!db.music.blacklistedUsers.includes(target)) {
						ctx.sendMessage({
							content: "Esse usuário não está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.music.blacklistedUsers.splice(db.music.blacklistedUsers.indexOf(target), 1);
						await db.save();
						ctx.sendMessage({
							content: `O usuário ${user.username} foi removido da blacklist!`,
							flags: 1 << 6
						});
					}
				}
			} else if (channel && channel.type === 2) { 
				if (action === "add") {
					if (db.music.restrictedChannels.includes(target)) {
						ctx.sendMessage({
							content: "Esse canal já está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.music.restrictedChannels.push(target);
						await db.save();
						ctx.sendMessage({
							content: `O canal ${channel.name} foi adicionado na blacklist!`,
							flags: 1 << 6
						});
					}
				} else {
					if (!db.music.restrictedChannels.includes(target)) {
						ctx.sendMessage({
							content: "Esse canal não está na blacklist!",
							flags: 1 << 6
						});
					} else {
						db.music.restrictedChannels.splice(db.music.restrictedChannels.indexOf(target), 1);
						await db.save();
						ctx.sendMessage({
							content: `O canal ${channel.name} foi removido da blacklist!`,
							flags: 1 << 6
						});
					}
				}
			} else {
				ctx.sendMessage({
					content: "Você deve especificar um usuário ou um canal de voz válido!",
					flags: 1 << 6
				});
			}
		}
	}
}
