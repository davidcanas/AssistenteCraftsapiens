import Client from "./subClient";
import { TextChannel } from "oceanic.js";
import { LavalinkManager, LavalinkNodeOptions, SearchPlatform } from "lavalink-client";

export default class subMusic extends LavalinkManager {
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
			console.log(
				`\x1b[34m[SUB] Ocorreu um erro no node ${node.id}, erro: ${error.message}`
			);
		});

		this.nodeManager.on("disconnect", (node): void => {
			console.log(`\x1b[33m[LAVALINK] O node do lavalink ${node.id} desconectou.`);
		});


		this.on("trackStuck", (player): void => {
			if (player.textChannelId) {
				const ch = this.client.getChannel(player.textChannelId) as TextChannel;
				ch.createMessage({ content: "Aparentemente, aconteceu algo de errado ao continuar a transmissão de música\nPor favor, contacte DG0837." });

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
				channel.createMessage({ content: "Por algum motivo, a minha lista de músicas acabou!" });
			}
		});
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
