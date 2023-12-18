import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Player, ConnectionState, DefaultQueue } from "vulkava";
import { User, VoiceChannel } from "oceanic.js";

export default class Queue extends Command {
    constructor(client: Client) {
        super(client, {
            name: "queue",
            description: "Vê a lista de musicas que estão na fila",
            category: "Music",
            aliases: ["lista", "list"],
            options: [], //lol
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        let player = this.client.music.players.get(ctx.msg.guildID);
        if (!this.client.ignoreRoles.some((v) => ctx.msg.member.roles.includes(v))) {
            ctx.sendMessage({
                content: "Você não tem acesso a esse comando!",
                flags: 1 << 6,
            })
            return;
        }
        if (!player) {
            ctx.sendMessage("Não estou a tocar nada");
            return;
        }

        const vc = ctx.msg.member.voiceState.channelID;
        if (!vc) {
            ctx.sendMessage("Você não está em nenhum canal de voz");
            return;
        }
        let test: Array<String> = [];
        const playerQueue = player.queue as DefaultQueue;
        playerQueue.tracks.forEach((q) => {
            const requester = q.requester as User;
            const autor = this.client.users.get(requester.id);
            test.push(
                "`" +
                q.title +
                "`" +
                "- " +
                "_(" +
                autor.username +
                "#" +
                autor.discriminator +
                ")_"
            );
        });
        if (!test.length) {
            ctx.sendMessage("Não existe nenhuma musica na queue");
        }
        console.log(test.length);
        if (test.length > 50) test = test.slice(0, 50);

        const quebed = new this.client.embed()
            .setTitle("✨ Lista de musicas")
            .setDescription(test.join("\n"))
            .setColor("RANDOM")
            .setFooter(ctx.author.username)
            .setTimestamp();
        ctx.sendMessage({ embeds: [quebed] });
    }
}