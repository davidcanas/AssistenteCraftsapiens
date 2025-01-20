import Client from "../structures/Client";
import {
    Interaction,
    CommandInteraction,
    ComponentInteraction,
    AutocompleteInteraction,
    InteractionOptionsWithValue,
	TextChannel
} from "oceanic.js";
import CommandContext from "../structures/CommandContext";

export default class InteractionCreate {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(interaction: Interaction) {
        if (interaction instanceof AutocompleteInteraction) {
            await this.handleAutocompleteInteraction(interaction);
        } else if (interaction instanceof CommandInteraction) {
            await this.handleCommandInteraction(interaction);
        } else if (interaction instanceof ComponentInteraction) {
            await this.handleComponentInteraction(interaction);
        }
    }

    private async handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
        if (!interaction.member) return;

        const cmd = this.client.commands.find(c => c.name === interaction.data.name);
        if (!cmd) throw new Error("Command not found");

        const options = interaction.data.options.raw as InteractionOptionsWithValue[];
        const focusedField = options.find(o => o.focused);

        cmd.runAutoComplete?.(interaction, focusedField!.value as string, options);
    }

    private async handleCommandInteraction(interaction: CommandInteraction) {
        const cmd = this.client.commands.find(c => c.name === interaction.data.name);
        if (!cmd) throw new Error("<!> Command not found");

        const db = await this.client.db.global.findOne({ id: interaction.guild.id });
        if (db.blacklistedUsers.includes(interaction.user.id)) {
            this.sendBlacklistMessage(interaction, "Você foi proibido por um administrador de usar comandos");
            return;
        }

        if (cmd.category === "Music") {
            if (this.isMusicBlacklisted(db, interaction)) return;
            if (!this.isDiscordLinked(interaction)) return;
        }

        db.helped++;
        const ctx = new CommandContext(this.client, interaction);
        cmd.execute(ctx);
    }

    private async handleComponentInteraction(interaction: ComponentInteraction) {
        const customID = interaction.data.customID;

        switch (true) {
            case customID === "silenciar":
                await this.handleSilenceInteraction(interaction);
                break;
            case customID === "delmsgeval":
                await this.handleDeleteMessageEvaluation(interaction);
                break;
            case customID === "confirm":
                await this.handleConfirmInteraction(interaction);
                break;
            case customID === "confirm_read":
                await this.handleConfirmReadInteraction(interaction);
                break;
            case customID.startsWith("confirm_ban"):
                await this.handleConfirmBanInteraction(interaction, customID);
                break;
            case customID.startsWith("cancel_ban"):
                await this.handleCancelBanInteraction(interaction, customID);
                break;
            case customID.startsWith("confirm_mute"):
                await this.handleConfirmMuteInteraction(interaction, customID);
                break;
            case customID.startsWith("cancel_mute"):
                await this.handleCancelMuteInteraction(interaction, customID);
                break;
            case customID.startsWith("confirm_kick"):
                await this.handleConfirmKickInteraction(interaction, customID);
                break;
            case customID.startsWith("cancel_kick"):
                await this.handleCancelKickInteraction(interaction, customID);
                break;
            default:
                break;
        }
    }

    private sendBlacklistMessage(interaction: CommandInteraction, message: string) {
        const embed = new this.client.embed()
            .setDescription(`:x: **${message}**\nMotivo: \`Utilização indevida do sistema\``)
            .setColor("16711680");

        interaction.createMessage({
            embeds: [embed],
            flags: 1 << 6
        });
    }

    private isMusicBlacklisted(db: any, interaction: CommandInteraction): boolean {
        if (db.music.blacklistedUsers.includes(interaction.user.id)) {
            this.sendBlacklistMessage(interaction, "Você foi proibido por um administrador de usar comandos de Música");
            return true;
        }
        return false;
    }

    private isDiscordLinked(interaction: CommandInteraction): boolean {
        if (!this.client.getDiscordByNick(interaction.member.nick)) {
            const embed = new this.client.embed()
                .setDescription("**Para usar o sistema de música da Craftsapiens, você precisa de ter a sua conta discord vinculada com o minecraft!**")
                .addField("Como vincular?", "> Para vincular sua conta use o comando /discord link no minecraft da Craftsapiens!")
                .setColor("16711680")
                .setFooter("Qualquer duvida, contacte um STAFF");

            interaction.createMessage({
                embeds: [embed],
                flags: 1 << 6
            });

            return false;
        }
        return true;
    }

    private async handleSilenceInteraction(interaction: ComponentInteraction) {
        const author = interaction.message.mentions.users[0];
        if (interaction.member.id !== author.id) {
            interaction.createMessage({
                content: `Esse botão é de @${author.username}, apenas ele pode silenciar!`,
                flags: 1 << 6
            });
            return;
        }

        const db = await this.client.db.global.findOne({ id: interaction.guild.id });
        db.ignoredUsers.push(interaction.member.id);
        await db.save();

        interaction.createMessage({
            content: "Agora você não receberá mais informações sobre as aulas quando perguntar sobre aulas.\nPara ativar novamente use o comando /silenciar aviso_aulas",
            flags: 1 << 6
        });
    }

    private async handleDeleteMessageEvaluation(interaction: ComponentInteraction) {
        if (interaction.member?.id !== "733963304610824252") return;

        (interaction.channel as TextChannel)?.messages.get(interaction.message.id).delete();
    }

    private async handleConfirmInteraction(interaction: ComponentInteraction) {
        const db = await this.client.db.global.findOne({ id: interaction.guild.id });
        const author = interaction.message.mentions.users[0];

        if (
            interaction.member.roles.includes("959259258829021255") ||
            interaction.member.roles.includes("917900552225054750") ||
            interaction.member.roles.includes("901251917991256124")
        ) {
            interaction.message.channel.deleteMessage(
                interaction.message.messageReference.messageID
            );

            interaction.message.delete();

            db.usersInCooldown.splice(db.usersInCooldown.indexOf(author.id), 1);
            db.save();

            interaction.createMessage({
                content: "**[ADMIN]** Você acaba de usar poderes de fontes suspeitas e apagou essa mensagem com sucesso!",
                flags: 1 << 6
            });

            return;
        }

        if (interaction.member.id !== author.id) {
            interaction.createMessage({
                content: `Esse botão é de @${author.username}, apenas ele pode confirmar a leitura!`,
                flags: 1 << 6
            });
            return;
        }

        interaction.createMessage({
            content: "Obrigado por confirmar a sua leitura :D.",
            flags: 1 << 6
        });

        interaction.message.channel.deleteMessage(
            interaction.message.messageReference.messageID
        );
        interaction.message.delete();

        db.usersInCooldown.splice(db.usersInCooldown.indexOf(author.id), 1);
        db.save();
    }

    private async handleConfirmReadInteraction(interaction: ComponentInteraction) {
        const author = interaction.message.mentions.users.find((u) => u.id !== "968686499409313804");
        const sender = interaction.member.id || interaction.user.id;

        if (sender !== author.id) {
            interaction.createMessage({
                content: `<:bruh:1257632851797606441> cai fora imbecil, apenas ${author.username} pode clicar nesse lindo botão ^^`,
                flags: 1 << 6
            });
            return;
        }

        interaction.message.messageReference
            ? (interaction.channel as TextChannel)?.messages.get(interaction.message.messageReference.messageID).delete()
            : interaction.message.delete();
    }

	private async handleConfirmBanInteraction(interaction: ComponentInteraction, customID: string) {
		const [_, __, userID, moderatorID, ...reasonParts] = customID.split("_");
		const reason = reasonParts.join("_");
	
		if (interaction.member.id !== moderatorID) {
			interaction.createMessage({
				content: "❌ Apenas o moderador que iniciou a ação pode confirmar o banimento!",
				flags: 1 << 6
			});
			return;
		}
	
		const member = interaction.guild.members.get(userID);
		if (!member) {
			interaction.createMessage({
				content: "❌ O membro não foi encontrado no servidor!",
				flags: 1 << 6
			});
			return;
		}
	
		try {
			await member.ban({ deleteMessageDays: 7, reason });
	
			const embed = new this.client.embed()
				.setTitle("<:ban:1308134804533987339> Membro Banido")
				.setDescription(`<:Steve:905024599274684477> **Usuário:** ${member.user.mention} (${member.user.id})\n <:text:1308134831946862732> **Motivo:**\n\`\`\`\n${reason}\n\`\`\``)
				.setColor(0xff0000)
				.setFooter(`Banido por ${interaction.member.tag}`, interaction.member.avatarURL())
				.setThumbnail(member.user.avatarURL())
				.setTimestamp();
	
			interaction.createMessage({ content: `<:report:1307789599279546419> | ${interaction.member.mention} Usuário punido. O jogador foi banido permanentemente!` });
			interaction.message.delete();
	
			const logChannel = interaction.guild.channels.get("940725594835025980");
			if (logChannel?.type === 0) {
				logChannel.createMessage({ embeds: [embed.setTitle("Relatório de Banimento").setFooter(null)] });
			}
		} catch (err) {
			interaction.createMessage({
				content: "❌ Ocorreu um erro ao tentar banir o membro.",
				flags: 1 << 6
			});
		}
	}
	

    private async handleCancelBanInteraction(interaction: ComponentInteraction, customID: string) {
        const [_, __, userID, moderatorID] = customID.split("_");

        if (interaction.member.id !== moderatorID) {
            interaction.createMessage({
                content: "❌ Apenas o moderador que iniciou a ação pode cancelar o banimento!",
                flags: 1 << 6
            });
            return;
        }

        interaction.createMessage({
            content: "✅ A ação de banimento foi cancelada.",
            flags: 1 << 6
        });
    }

    private async handleConfirmMuteInteraction(interaction: ComponentInteraction, customID: string) {
        const [_, __, userID, moderatorID, tempoStr, ...reasonParts] = customID.split("_");
        const reason = reasonParts.join("_");
        const tempo = parseFloat(tempoStr);

        if (interaction.member.id !== moderatorID) {
            interaction.createMessage({
                content: "❌ Apenas o moderador que iniciou a ação pode confirmar o silenciamento!",
                flags: 1 << 6
            });
            return;
        }

        const member = interaction.guild.members.get(userID);
        if (!member) {
            interaction.createMessage({
                content: "❌ O membro não foi encontrado no servidor!",
                flags: 1 << 6
            });
            return;
        }

        const muteUntil = new Date(Date.now() + tempo).toISOString();

        try {
            await member.edit({ communicationDisabledUntil: muteUntil });

            const embed = new this.client.embed()
                .setTitle("<:mute:1308134804533987338> Membro Silenciado")
                .setDescription(`<:Steve:905024599274684477> **Usuário:** ${member.user.mention} (${member.user.id})\n🕰️ **Duração:** ${this.msToTime(tempo)}\n <:text:1308134831946862732> **Motivo:**\n\`\`\`\n${reason}\n\`\`\``)
                .setColor(0xff4757)
                .setFooter(`Silenciado por ${interaction.member.tag}`, interaction.member.avatarURL())
                .setThumbnail(member.user.avatarURL())
                .setTimestamp();

			interaction.createMessage({ content: `<:report:1307789599279546419> | ${interaction.member.mention} Usuário punido. O jogador foi silenciado temporarimente!` });
            interaction.message.delete();

            const logChannel = interaction.guild.channels.get("940725594835025980");
            if (logChannel?.type === 0) {
                logChannel.createMessage({ embeds: [embed.setTitle("Relatório de Silenciamento").setFooter(null)] });
            }
        } catch (err) {
            interaction.createMessage({
                content: "❌ Ocorreu um erro ao tentar silenciar o membro.",
                flags: 1 << 6
            });
        }
    }

    private async handleCancelMuteInteraction(interaction: ComponentInteraction, customID: string) {
        const [_, __, userID, moderatorID] = customID.split("_");

        if (interaction.member.id !== moderatorID) {
            interaction.createMessage({
                content: "❌ Apenas o moderador que iniciou a ação pode cancelar o silenciamento!",
                flags: 1 << 6
            });
            return;
        }

        interaction.createMessage({
            content: "✅ A ação de silenciamento foi cancelada.",
            flags: 1 << 6
        });
    }

	private async handleConfirmKickInteraction(interaction: ComponentInteraction, customID: string) {
		const [_, __, userID, moderatorID, ...reasonParts] = customID.split("_");
		const reason = reasonParts.join("_");
	
		if (interaction.member.id !== moderatorID) {
			interaction.createMessage({
				content: "❌ Apenas o moderador que iniciou a ação pode confirmar a expulsão!",
				flags: 1 << 6
			});
			return;
		}
	
		const member = interaction.guild.members.get(userID);
		if (!member) {
			interaction.createMessage({
				content: "❌ O membro não foi encontrado no servidor!",
				flags: 1 << 6
			});
			return;
		}
	
		try {
			await member.kick(reason);
	
			const embed = new this.client.embed()
				.setTitle("<:kick:1308134804533987340> Membro Expulso")
				.setDescription(`<:Steve:905024599274684477> **Usuário:** ${member.user.mention} (${member.user.id})\n <:text:1308134831946862732> **Motivo:**\n\`\`\`\n${reason}\n\`\`\``)
				.setColor(0xffa500)
				.setFooter(`Expulso por ${interaction.member.tag}`, interaction.member.avatarURL())
				.setThumbnail(member.user.avatarURL())
				.setTimestamp();
	
			interaction.createMessage({ content: `<:report:1307789599279546419> | ${interaction.member.mention} Usuário punido. O jogador foi expulso do servidor!` });
			interaction.message.delete();
	
			const logChannel = interaction.guild.channels.get("940725594835025980");
			if (logChannel?.type === 0) {
				logChannel.createMessage({ embeds: [embed.setTitle("Relatório de Expulsão").setFooter(null)] });
			}
		} catch (err) {
			interaction.createMessage({
				content: "❌ Ocorreu um erro ao tentar expulsar o membro.",
				flags: 1 << 6
			});
		}
	}
	

    private async handleCancelKickInteraction(interaction: ComponentInteraction, customID: string) {
        const [_, __, userID, moderatorID] = customID.split("_");

        if (interaction.member.id !== moderatorID) {
            interaction.createMessage({
                content: "❌ Apenas o moderador que iniciou a ação pode cancelar a expulsão!",
                flags: 1 << 6
            });
            return;
        }

        interaction.createMessage({
            content: "✅ A ação de expulsão foi cancelada.",
            flags: 1 << 6
        });
    }

    private msToTime(duration: number) {
        const milliseconds = Math.floor((duration % 1000) / 100);
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
        const days = Math.floor(duration / (1000 * 60 * 60 * 24));

        return `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}.${milliseconds}s`;
    }
}