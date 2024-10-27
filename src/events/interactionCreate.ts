import Client from "../structures/Client";
import {
	Interaction,
	CommandInteraction,
	ComponentInteraction,
	AutocompleteInteraction,
	InteractionOptionsWithValue
} from "oceanic.js";
import CommandContext from "../structures/CommandContext";

export default class InteractionCreate {
	client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async run(interaction: Interaction) {
		if (interaction instanceof AutocompleteInteraction) {

			if (!interaction.member) return;
			const cmd = this.client.commands.find(c => c.name === interaction.data.name);

			if (!cmd) throw new Error("Command not found");

			const options = interaction.data.options.raw as InteractionOptionsWithValue[];

			const focusedField = options.find(o => o.focused);

			cmd.runAutoComplete?.(interaction, focusedField!.value as string, options);
			return;
		}

		if (interaction instanceof CommandInteraction) {
			const cmd = this.client.commands.find(
				(c) => c.name === interaction.data.name,
			);
			if (!cmd) throw new Error("<!> Command not found");

			const db = await this.client.db.global.findOne({ id: interaction.guild.id });
            if (db.blacklistedUsers.includes(interaction.user.id)) {
				const embed = new this.client.embed()
					.setDescription(":x: **Você foi proibido por um administrador de usar comandos**\nMotivo: `Utilização indevida do sistema`")
					.setColor("16711680");

				interaction.createMessage({
					embeds: [embed],
					flags: 1 << 6
				});

				return;

			}
			
			if (cmd.category === "Music") {
				
				if (db.music.blacklistedUsers.includes(interaction.user.id)) {
					const embed = new this.client.embed()
						.setDescription(":x: **Você foi proibido por um administrador de usar comandos de Música**\nMotivo: `Utilização indevida do sistema`")
						.setColor("16711680");

					interaction.createMessage({
						embeds: [embed],
						flags: 1 << 6
					});

					return;
				}
				if (!this.client.getDiscordByNick(interaction.member.nick)) {
					const embed = new this.client.embed()
						.setDescription("**Para usar o sistema de música da Craftsapiens, você precisa de ter a sua conta discord vinculada com o minecraft!**")
						.addField("Como vincular?", "> Para vincular sua conta use o comando `/discord link` no minecraft da Craftsapiens!")
						.setColor("16711680")
						.setFooter("Qualquer duvida, contacte um STAFF");

					interaction.createMessage({
						embeds: [embed],
						flags: 1 << 6
					});

					return;
				}
			}

            db.helped++;

			const ctx = new CommandContext(this.client, interaction);
       
			cmd.execute(ctx);
		}
		if (!(interaction instanceof CommandInteraction)) {
			if (interaction instanceof ComponentInteraction) {

				if (interaction.data.customID === "silenciar") {
					const autor = interaction.message.mentions.users[0];
					if (interaction.member.id !== autor.id) {
						interaction.createMessage({
							content:
								"Esse botão é de @" +
								autor.username +
								" , apenas ele pode silenciar!",
							flags: 1 << 6
						});
						return;
					}

					const db = await this.client.db.global.findOne({ id: interaction.guild.id });
					db.ignoredUsers.push(interaction.member.id);
					await db.save();
					interaction.createMessage({ content: "Agora você não receberá mais informações sobre as aulas quando perguntar sobre aulas.\nPara ativar novamente use o comando `/silenciar aviso_aulas`", flags: 1 << 6 });
				}

				if (interaction.data.customID === "delmsgeval") {
					if (interaction.member?.id !== "733963304610824252") return;
					interaction.channel.messages.get(interaction.message.id).delete();
				}

				if (interaction.data.customID === "confirm") {
					const dbremove = await this.client.db.global.findOne({ id: interaction.guild.id });
					const autor = interaction.message.mentions.users[0];

					if (
						interaction.member.roles.includes("959259258829021255") ||
						interaction.member.roles.includes("917900552225054750") ||
						interaction.member.roles.includes("901251917991256124")
					) {
						interaction.message.channel.deleteMessage(
							interaction.message.messageReference.messageID
						);

						interaction.message.delete();

						dbremove.usersInCooldown.splice(dbremove.usersInCooldown.indexOf(autor.id), 1);
						dbremove.save();

						return interaction.createMessage({
							content:
								"**[ADMIN]** Você acaba de usar poderes de fontes suspeitas e apagou essa mensagem com sucesso!",
							flags: 1 << 6
						});
					}

					if (interaction.member.id !== autor.id) {
						return interaction.createMessage({
							content:
								"Esse botão é de @" +
								autor.username +
								" , apenas ele pode confirmar a leitura!",
							flags: 1 << 6
						});
					}

					interaction.createMessage({
						content: "Obrigado por confirmar a sua leitura :D.",
						flags: 1 << 6
					});

					interaction.message.channel.deleteMessage(
						interaction.message.messageReference.messageID
					);
					interaction.message.delete();
					dbremove.usersInCooldown.splice(dbremove.usersInCooldown.indexOf(autor.id), 1);
					dbremove.save();
				}

			if (interaction.data.customID === "confirm_read") {
				const autor = interaction.message.mentions.users.find((u) => u.id !== "968686499409313804");
				const sender = interaction.member.id || interaction.user.id;

				if (sender !== autor.id) {
					return interaction.createMessage({
						content:
							"<:bruh:1257632851797606441> cai fora imbecil, apenas " +
							autor.username +
							" pode clicar nesse lindo botão ^^",
						flags: 1 << 6
					});
				}

				interaction.message.messageReference ? interaction.channel.messages.get(interaction.message.messageReference.messageID).delete() : 
				
				interaction.message.delete();
				
				
				} 
			}
			return;
		}

	}
}
