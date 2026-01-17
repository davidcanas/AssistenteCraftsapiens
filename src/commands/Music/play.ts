import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ConnectionState, Player } from "vulkava";
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
			const res = await this.client.music.search(ctx.args.join(" "), "soundcloud");

			if (res.loadType === "LOAD_FAILED") {
				ctx.sendMessage(`Erro: \`${res.exception?.message}\``);
			} else if (res.loadType === "NO_MATCHES") {
				ctx.sendMessage("Não encontrei essa musica.");
			} else {
				const player = currPlayer || createPlayer();

				if (player.state === ConnectionState.DISCONNECTED) {
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
					player.connect();
				}

				player.textChannelId = ctx.channel.id;
				if (res.loadType === "PLAYLIST_LOADED") {
					const playlist = res.playlistInfo;

					for (const track of res.tracks) {
						track.setRequester(ctx.author);
						player.queue.add(track);
					}

					if (!player.playing) player.play();

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
					const tracks = res.tracks;

					tracks[0].setRequester(ctx.author);
					player.queue.add(tracks[0]);

					ctx.sendMessage(
						`🎵 \`${tracks[0].title}\` adicionada á lista com sucesso`
					);

					if (!player.playing) player.play();
				}
			}
		} catch (err: any) {
			ctx.sendMessage(`Erro: \`${err.message}\``);
		}
	}
}
