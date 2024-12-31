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

			db.helped++;
			const ctx = new CommandContext(this.client, interaction);
			cmd.execute(ctx);
		}

		if (interaction instanceof ComponentInteraction) {
			const customID = interaction.data.customID;
			const logChannel = interaction.guild.channels.get("940725594835025980")


			if (customID.startsWith("confirm_mute")) {
				console.log(customID);
				const [_, __, userID, moderatorID, tempoStr, ...reasonParts] = customID.split("_");

				console.log(moderatorID);
				const reason = reasonParts.join("_");
				const tempo = parseFloat(tempoStr);

				if (interaction.member.id !== moderatorID) {
					return interaction.createMessage({
						content: "❌ Apenas o moderador que iniciou a ação pode confirmar o silenciamento!",
						flags: 1 << 6,
					});
				}

				const member = interaction.guild.members.get(userID);
				if (!member) {
					return interaction.createMessage({
						content: "❌ O membro não foi encontrado no servidor!",
						flags: 1 << 6,
					});
				}

				const muteUntil = new Date(Date.now() + tempo).toISOString();

				try {
					await member.edit({ communicationDisabledUntil: muteUntil });

					function MsToTime(time) {
						time = Math.round(time / 1000);

						const s = time % 60; 
						const m = Math.floor(time / 60) % 60; 
						const h = Math.floor(time / 3600) % 24; 
						const d = Math.floor(time / 86400); 

						const parts = [];
						if (d > 0) parts.push(d === 1 ? "1 dia" : `${d} dias`);
						if (h > 0) parts.push(h === 1 ? "1 hora" : `${h} horas`);
						if (m > 0) parts.push(m === 1 ? "1 minuto" : `${m} minutos`);
						if (s > 0 && parts.length === 0) parts.push(s === 1 ? "1 segundo" : `${s} segundos`);

						return parts.join(" e ");
					}

					const embed = new this.client.embed()
						.setTitle("<:mute:1308134804533987338> Membro Silenciado")
						.setDescription(`<:Steve:905024599274684477> **Usuário:** ${member.user.mention} (${member.user.id})\n🕰️ **Duração:** ${MsToTime(tempo)}\n <:text:1308134831946862732> **Motivo:**\n\`\`\`\n${reason}\n\`\`\``)
						.setColor(0xff4757)
						.setFooter(`Silenciado por ${interaction.member.tag}`, interaction.member.avatarURL())
						.setThumbnail(member.user.avatarURL())
						.setTimestamp();


					interaction.createMessage({ content: "✅ O membro foi silenciado com sucesso!" });
					interaction.message.delete();

					if (logChannel?.type === 0) {
						logChannel.createMessage({
							embeds: [embed],
						});
					}

				} catch (err) {
					interaction.createMessage({
						content: "❌ Ocorreu um erro ao tentar silenciar o membro.\nErro: " + err,
						flags: 1 << 6,
					});
				}

				return;
			}

			if (customID.startsWith("cancel_mute")) {
				const [_, __, userID, moderatorID] = customID.split("_");

				if (interaction.member.id !== moderatorID) {
					return interaction.createMessage({
						content: "❌ Apenas o moderador que iniciou a ação pode cancelar o silenciamento!",
						flags: 1 << 6,
					});
				}

				interaction.createMessage({
					content: "✅ A ação de silenciamento foi cancelada.",
					flags: 1 << 6,
				});

				interaction.message.delete();

				return;
			}

			if (customID.startsWith("confirm_kick")) {
				const [_, __, userID, moderatorID, ...reasonParts] = customID.split("_");
				const reason = reasonParts.join("_");

				if (interaction.member.id !== moderatorID) {
					return interaction.createMessage({
						content: "❌ Apenas o moderador que iniciou a ação pode confirmar a expulsão!",
						flags: 1 << 6,
					});
				}

				const member = interaction.guild.members.get(userID);
				if (!member) {
					return interaction.createMessage({
						content: "❌ O membro não foi encontrado no servidor!",
						flags: 1 << 6,
					});
				}

				try {
					await member.kick(reason);

					const embed = new this.client.embed()
						.setTitle("<:mine_no:939943857754365962> Membro Expulso")
						.setDescription(`<:Steve:905024599274684477> **Usuário:** ${member.user.mention} (${member.user.id})\n<:text:1308134831946862732> **Motivo:**\n\`\`\`\n${reason}\n\`\`\``)
						.setColor(0xff4757)
						.setFooter(`Expulso por ${interaction.member.tag}`, interaction.member.avatarURL())
						.setThumbnail(member.user.avatarURL())
						.setTimestamp();


					interaction.createMessage({ content: "✅ O membro foi expulso com sucesso!" });
					interaction.message.delete();

					if (logChannel?.type === 0) {
						logChannel.createMessage({
							embeds: [embed],
						});
					}
				} catch (err) {
					interaction.createMessage({
						content: "❌ Ocorreu um erro ao tentar expulsar o membro.",
						flags: 1 << 6,
					});
				}

				return;
			}

			if (customID.startsWith("cancel_kick")) {
				const [_, __, userID, moderatorID] = customID.split("_");

				if (interaction.member.id !== moderatorID) {
					return interaction.createMessage({
						content: "❌ Apenas o moderador que iniciou a ação pode cancelar a expulsão!",
						flags: 1 << 6,
					});
				}

				interaction.createMessage({
					content: "✅ A ação de expulsão foi cancelada.",
					flags: 1 << 6,
				});
				interaction.message.delete();

				return;
			}
		}
	}
}
