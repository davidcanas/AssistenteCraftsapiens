import Client from "./subClient";
import { TextChannel } from "oceanic.js";
import { NodeOptions, Vulkava, Node } from "vulkava";

export default class subMusic extends Vulkava {
	client: Client;


	constructor(client: Client, nodes: NodeOptions[]) {
		super({
			nodes,
			sendWS(id, payload) {
				const guild = client.guilds.get(id);
				if (guild) guild.shard.send(payload.op, payload.d);
			},
		});

		this.client = client;
		this.on("nodeConnect", async (node): Promise<void> => {
			console.log(`\x1b[33m[LAVALINK] O node ${node.identifier} foi conectado!`);


			for (const player of [...this.players.values()]
				.filter((p) => p.node === node)
				.values()) {
				const position = player.position;
				player.connect();
				player.play({ startTime: position });
			}
		});


		this.on("error", (node, error): void => {
			console.log(
				`\x1b[34m[SUB] Ocorreu um erro no node ${node.identifier}, erro: ${error.message}`
			);

			if (error.message.startsWith("Unable to connect after"))
				this.reconnect(node);
		});

		this.on("nodeDisconnect", (node): void => {
			console.log(`\x1b[33m[LAVALINK] O node do lavalink ${node.identifier} desconectou.`);
		});


		this.on("trackStuck", (player): void => {
			if (player.textChannelId) {
				const ch = this.client.getChannel(player.textChannelId) as TextChannel;
				ch.createMessage({ content: "Aparentemente, aconteceu algo de errado ao continuar a transmissão de música\nPor favor, contacte DG0837." });

				player.skip();
			}
		});
        
		this.on("queueEnd", (player): void => {
			if (player.textChannelId) {
				const channel = this.client.getChannel(player.textChannelId);
				if (channel.type !== 0) return;
				if (player.olderMessageID) {
					channel.deleteMessage(player.olderMessageID).catch(() => { });
				}
				if (channel.type !== 0) return;
				player.destroy();
				channel.createMessage({ content: "Por algum motivo, a minha lista de músicas acabou!" });
			}
		});
	}



	init() {
		return super.start(this.client.user.id);
	}

	private reconnect(node: Node) {
		node.disconnect();
		this.nodes.splice(this.nodes.indexOf(node), 1);

		const newNode = new Node(this, {
			id: node.identifier as string,
			hostname: node.options.hostname,
			port: node.options.port,
			password: node.options.password,
			maxRetryAttempts: 20,
			retryAttemptsInterval: 3000,
			secure: false,
			region: node.options.region,
		});

		this.nodes.push(newNode);

		newNode.connect();
	}
}