import Client from "./Client";
import CommandContext from "./CommandContext";
import { TextChannel, User, VoiceChannel } from "oceanic.js";
import { NodeOptions, Vulkava, Player, Node } from "vulkava";

export default class Music extends Vulkava {
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
            console.log(`O node ${node.identifier} foi conectado!`);

            for (const player of [...this.players.values()]
                .filter((p) => p.node === node)
                .values()) {
                const position = player.position;
                player.connect();
                player.play({ startTime: position });
            }
        });

        this.pingNodes();

        this.on("error", (node, error): void => {
            console.log(
                `Ocorreu um erro no node ${node.identifier}, erro: ${error.message}`
            );

            if (error.message.startsWith("Unable to connect after"))
                this.reconnect(node);
        });

        this.on("nodeDisconnect", (node): void => {
            console.log(`O node do lavalink ${node.identifier} desconectou.`);
        });

        this.on("trackStart", async (player, track): Promise<void> => {
            if (!player.textChannelId) return;

            const channel = this.client.getChannel(player.textChannelId);
            if (channel.type !== 0) return;
            if (player.olderMessageID) {
                channel.deleteMessage(player.olderMessageID).catch(() => { });
            }
            const requester = player.current?.requester as User;

            var embed = new this.client.embed()
                .setTitle("Tocando")
                .addField("Nome:", "`" + track.title + "`")
                .addField("Autor da música:", "`" + track.author + "`")
                .setURL(track.uri)
                .setThumbnail(track.thumbnail!)
                .setColor("RANDOM")
                .setTimestamp();

            player.olderMessageID = await channel.createMessage({ embeds: [embed] }).then((m) => m.id);
        });

        this.on("trackStuck", (player, track): void => {
            if (player.textChannelId) {
                const ch = this.client.getChannel(player.textChannelId) as TextChannel;
                ch.createMessage({ content: "**Ocorreu um erro a tocar essa música, a mesma foi pulada**" });

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
                channel.createMessage({ content: `A lista de músicas acabou.` });
            }
        });
    }


    canPlay(ctx: CommandContext, player?: Player | undefined): boolean {
        const voiceChannelID = ctx.member!.voiceState?.channelID;

        if (!voiceChannelID) {
            ctx.sendMessage({
                content: "Você precisa de estar em um canal de voz para usar este comando.",
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

    init() {
        return super.start(this.client.user.id);
    }

    private pingNodes() {
        for (const node of this.nodes.values()) {
            if (node.options.hostname.includes("heroku")) {
                setInterval(() => {
                    this.client.fetch(`http://${node.options.hostname}/version`, {
                        headers: {
                            Authorization: node.options.password!,
                        },
                    });
                }, 25 * 60 * 1000);
            }
        }
    }

    private reconnect(node: Node) {
        node.disconnect();
        this.nodes.splice(this.nodes.indexOf(node), 1);

        const newNode = new Node(this, {
            id: node.identifier as string,
            hostname: node.options.hostname,
            port: node.options.port,
            password: node.options.password,
            maxRetryAttempts: 10,
            retryAttemptsInterval: 3000,
            secure: false,
            region: node.options.region,
        });

        this.nodes.push(newNode);

        newNode.connect();
    }
}