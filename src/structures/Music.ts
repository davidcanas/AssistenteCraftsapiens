import Client from "./Client";
import CommandContext from "./CommandContext";
import { TextChannel, VoiceChannel } from "oceanic.js";
import { LavalinkManager, LavalinkNodeOptions, Player, SearchPlatform } from "lavalink-client";

export default class Music extends LavalinkManager {
	client: Client;


	constructor(client: Client, nodes: LavalinkNodeOptions[]) {
		super({
			nodes,
			sendToShard(guildId, payload) {
				const guild = client.guilds.get(guildId);
				if (guild) guild.shard.send(payload.op, payload.d);
			},
			autoSkip: true,
			playerOptions: {
				defaultSearchPlatform: "scsearch",
				onDisconnect: { autoReconnect: true, destroyPlayer: false },
			},
		});

		this.client = client;

		this.nodeManager.on("connect", (node): void => {
			console.log(`\x1b[33m[LAVALINK] O node ${node.id} foi conectado!`);
		});

		this.nodeManager.on("error", (node, error): void => {
			console.log(`Ocorreu um erro no node ${node.id}, erro: ${error.message}`);
		});

		this.nodeManager.on("disconnect", (node): void => {
			console.log(`\x1b[33m[LAVALINK] O node do lavalink ${node.id} desconectou.`);
		});

		this.on("trackStart", async (player, track): Promise<void> => {
			if (!player.textChannelId || !track) return;

			const channel = this.client.getChannel(player.textChannelId);
			if (channel.type !== 0) return;
			const olderMessageID = player.get<string>("olderMessageID");
			if (olderMessageID) {
				channel.deleteMessage(olderMessageID).catch(() => { });
			}

			const embed = new this.client.embed()
				.setTitle("Tocando")
				.addField("Nome:", "`" + track.info.title + "`")
				.addField("Autor da música:", "`" + track.info.author + "`")
				.setURL(track.info.uri)
				.setColor("RANDOM")
				.setTimestamp();
			if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);

			player.set("olderMessageID", await channel.createMessage({ embeds: [embed] }).then((m) => m.id));
		});

		this.on("trackStuck", (player): void => {
			if (player.textChannelId) {
				const ch = this.client.getChannel(player.textChannelId) as TextChannel;
				ch.createMessage({ content: "**Ocorreu um erro a tocar essa música, a mesma foi pulada**" });

				player.skip(0, false);
			}
		});

		this.on("queueEnd", (player): void => {
			if (player.textChannelId) {
				const channel = this.client.getChannel(player.textChannelId);
				if (channel.type !== 0) return;
				const olderMessageID = player.get<string>("olderMessageID");
				if (olderMessageID) {
					channel.deleteMessage(olderMessageID).catch(() => { });
				}
				player.destroy();
				channel.createMessage({ content: "A lista de músicas acabou." });
			}
		});
	}


	async canPlay(ctx: CommandContext, player?: Player | undefined): Promise<boolean> {
		const db = await this.client.db.global.findOne({ id: ctx.guild.id });
		const voiceChannelID = ctx.member!.voiceState?.channelID;

		if (!voiceChannelID) {
			ctx.sendMessage({
				content: "Você precisa de estar em um canal de voz para usar este comando.",
				flags: 1 << 6,
			});
			return false;
		}

		if (db.music.restrictedChannels.includes(voiceChannelID)) {
			ctx.sendMessage({
				content: "Você não pode usar comandos de música neste canal de voz.",
				flags: 1 << 6,
			});
			return false;
		}


		const voiceChannel = this.client.getChannel(voiceChannelID) as VoiceChannel;

		const permissions = voiceChannel.permissionsOf(this.client.user.id);

		if (!permissions.has("VIEW_CHANNEL")) {
			ctx.sendMessage({
				content: "Necessito da permissão de para visualizar o seu canal de voz.",
				flags: 1 << 6,
			});
			return false;
		}

		if (!permissions.has("CONNECT")) {
			ctx.sendMessage({
				content: "Eu não consigo entrar no teu canal de voz",
				flags: 1 << 6,
			});
			return false;
		}

		if (!permissions.has("SPEAK")) {
			ctx.sendMessage({
				content: "Eu não consigo reproduzir musica no teu canal de voz",
				flags: 1 << 6,
			});
			return false;
		}

		if (player && voiceChannelID !== player.voiceChannelId) {
			ctx.sendMessage({
				content: "Tu precisas de estar no mesmo canal de voz que eu!",
				flags: 1 << 6,
			});
			return false;
		}

		return true;
	}

	// Busca sem precisar de player: links são carregados direto; texto vai para o SoundCloud (padrão)
	// e, se falhar, para o YouTube. A busca do SoundCloud está quebrada no lavaplayer 2.2.6
	// ("Did not detect any supported formats", lavalink-devs/lavaplayer#204).
	async search(query: string, requester: unknown, source?: SearchPlatform) {
		const node = this.nodeManager.leastUsedNodes()[0];
		if (!node) throw new Error("Nenhum node do Lavalink conectado.");
		const res = await node.search({ query, source }, requester);
		const isLink = /^https?:\/\//.test(query);
		if (isLink || source || (res.loadType !== "error" && res.tracks.length)) return res;
		return node.search({ query, source: "ytsearch" }, requester);
	}

	init() {
		return super.init({ id: this.client.user.id, username: this.client.user.username });
	}
}
