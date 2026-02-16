"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class Queue extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "queue",
            description: "Vê a lista de musicas que estão na fila",
            category: "Music",
            aliases: ["lista", "list"],
            options: [],
        });
    }
    async execute(ctx) {
        const player = this.client.music.players.get(ctx.msg.guildID);
        if (!player) {
            ctx.sendMessage("Não estou a tocar nada");
            return;
        }
        let test = [];
        const playerQueue = player.queue;
        playerQueue.tracks.forEach((q) => {
            const requester = q.requester;
            const autor = this.client.users.get(requester.id);
            test.push("`" +
                q.title +
                "`" +
                "- " +
                "_(" +
                autor.username +
                "#" +
                autor.discriminator +
                ")_");
        });
        if (!test.length) {
            ctx.sendMessage("Não existe nenhuma musica na queue");
        }
        if (test.length > 50)
            test = test.slice(0, 50);
        const quebed = new this.client.embed()
            .setTitle("✨ Lista de musicas")
            .setDescription(test.join("\n"))
            .setColor("RANDOM")
            .setFooter(ctx.author.username)
            .setTimestamp();
        ctx.sendMessage({ embeds: [quebed] });
    }
}
exports.default = Queue;
