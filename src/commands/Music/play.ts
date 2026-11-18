import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Player, Track } from "lavalink-client";
import { Constants, VoiceChannel } from "oceanic.js";

export default class play extends Command {
	constructor(client: Client) {
		super(client, {
			name: "play",
			description: "Toca uma música ",
			category: "Music",
			aliases: ["p", "tocar"],
			options: [{
				name: "music",
				description: "A música para tocar",
				type: Constants.ApplicationCommandOptionTypes.STRING,
				required: true,
			}],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		if (ctx.channel.type !== 0 || !ctx.guild) return;
		
        if(!ctx.args[0]) {
			ctx.sendMessage("Você precisa escolher uma música para tocar!");
			return;
		}
       
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);
        const canPlay = await this.client.music.canPlay(ctx, currPlayer);

		if (!canPlay) return;

		const voiceChannelID = ctx.member?.voiceState.channelID as string;
		const voiceChannel = this.client.getChannel(voiceChannelID) as VoiceChannel;

		const createPlayer = (): Player => {
			const player = this.client.music.createPlayer({
				guildId: ctx.guild?.id as string,
				voiceChannelId: voiceChannelID,
				textChannelId: ctx.channel.id,
				selfDeaf: true,
			});

			return player;
		};

		try {
			const res = await this.client.music.search(ctx.args.join(" "), ctx.author);

			if (res.loadType === "error") {
				ctx.sendMessage(`Erro: \`${res.exception?.message}\``);
			} else if (res.loadType === "empty" || !res.tracks.length) {
				ctx.sendMessage("Não encontrei essa musica.");
			} else {
				const player = currPlayer || createPlayer();

				if (!player.connected) {
					if (
						!voiceChannel
							.permissionsOf(this.client.user.id)
							.has("MANAGE_CHANNELS") &&
            voiceChannel.userLimit &&
            voiceChannel.voiceMembers.size >= voiceChannel.userLimit
					) {
						ctx.sendMessage({
							content: "Não consigo entrar no canal de voz",
							flags: 1 << 6,
						});
						player.destroy();
						return;
					}
					await player.connect();
				}

				player.textChannelId = ctx.channel.id;
				if (res.loadType === "playlist") {
					const playlist = res.playlist;

					await player.queue.add(res.tracks as Track[]);

					if (!player.playing) await player.play();

					const embed = new this.client.embed()
						.setColor("RANDOM")
						.setTitle("Carreguei uma playlist")
						.addField("Nome:", "`" + playlist.name + "`")
						.addField("Total de musicas:", "`" + res.tracks.length + "`")
						.setTimestamp()
						.setFooter("Suporte | Assistente Craftsapiens", ctx.author.defaultAvatarURL());

					const urlRegex =
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

					urlRegex.test(ctx.args[0]) && embed.setURL(ctx.args[0]);

					ctx.sendMessage({ embeds: [embed] });
				} else {
					const track = res.tracks[0] as Track;

					await player.queue.add(track);

					ctx.sendMessage(
						`🎵 \`${track.info.title}\` adicionada á lista com sucesso`
					);

					if (!player.playing) await player.play();
				}
			}
		} catch (err: any) {
			ctx.sendMessage(`Erro: \`${err.message}\``);
		}
	}
}
