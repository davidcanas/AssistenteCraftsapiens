"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class Botinfo extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "botinfo",
            description: "Informações sobre o estado do Assistente",
            category: "Info",
            aliases: ["bi"],
            options: [],
        });
    }
    async execute(ctx) {
        const initDB = process.hrtime();
        const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        const stopDB = process.hrtime(initDB);
        let ping = this.client.shards.get(0).latency;
        if (ping === Infinity)
            ping = 0;
        const embed = new this.client.embed()
            .setDescription(`<:discord:1185986429147431074> | ${ping}ms\n<:mongo:1185980474095583323> | ${Math.round((stopDB[0] * 1e9 + stopDB[1]) / 1e6)}ms\n<:lavalink:1186325123729465444> | ${await this.client.music.nodes[0].ping()}ms\n✨ | v5.0\n<:ramemoji:1185990343888482386> | ${(process.memoryUsage().heapUsed /
            1024 /
            1024).toFixed(2)}MB \n<:cpu:1185985428977897483> | ${(process.cpuUsage().system /
            1024 /
            1024).toFixed(2)}%\n⏱️ | ${ctx.MsToDate(this.client.uptime)}\n<:peepo:1185985409075904602> | Já ajudei \`${db.helped}\` vezes\n💪 | Já foram censurados \`${db.urlsDeleted}\` links!`)
            .setColor("RANDOM");
        ctx.sendMessage({
            content: `<@${ctx.author.id}>`,
            embeds: [embed],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            url: "https://github.com/davidcanas/AssistenteCraftsapiens/releases/latest",
                            label: "✨ Changelog"
                        },
                        {
                            type: 2,
                            style: 5,
                            label: "Github",
                            emoji: {
                                id: "1268924658904731693",
                                name: "github"
                            },
                            disabled: false,
                            url: "https://github.com/davidcanas/AssistenteCraftsapiens"
                        },
                    ],
                },
            ],
        });
    }
}
exports.default = Botinfo;
