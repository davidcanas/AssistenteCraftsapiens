"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
class NowPlaying extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "np",
            description: "Veja a musica que está sendo tocada nesse momento",
            category: "Music",
            aliases: ["nowplaying"],
            options: [],
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        if (!currPlayer || currPlayer.state === vulkava_1.ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não estou a tocar nada nesse momento.");
            return;
        }
        const song = currPlayer.current;
        const requester = song.requester;
        const progressBar = ctx.progressBar((currPlayer.position / 1000), (song.duration / 1000), 20);
        const embed = new this.client.embed()
            .setTitle("🎵 Tocando agora:")
            .setDescription(`\`\`\`\n${progressBar}\n[${ctx.MsToHour(currPlayer.position)}]            [${ctx.MsToHour(song.duration)}]\n\`\`\``)
            .addField("🎶 Título:", `\`${song.title}\``)
            .addField("⏲️ Duração:", `\`${ctx.MsToHour(song.duration)}\``)
            .addField("👤 Pedido por:", `<@${requester.id}>`)
            .setThumbnail(song.thumbnail)
            .setColor("RANDOM");
        ctx.sendMessage({ embeds: [embed] });
    }
}
exports.default = NowPlaying;
