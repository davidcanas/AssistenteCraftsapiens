"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class TopCallTimeCommand extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "topcalltime",
            description: "Veja os 10 membros com mais tempo em call de estudo.",
            category: "Info",
            aliases: ["topvoicetime", "topcallduration"],
            options: [],
        });
    }
    async execute(ctx) {
        const topUsers = await this.client.db.users.find({})
            .sort({ totalTimeInCall: -1 })
            .limit(10)
            .exec();
        if (topUsers.length === 0) {
            ctx.sendMessage({
                content: "Nenhum registro de chamadas de voz encontrado.",
            });
            return;
        }
        const description = topUsers.map((user, index) => {
            const hours = Math.floor(user.totalTimeInCall / 3600);
            const minutes = Math.floor((user.totalTimeInCall % 3600) / 60);
            const seconds = user.totalTimeInCall % 60;
            if (hours === 0 && minutes === 0 && seconds === 0)
                return;
            const formattedTime = `${Math.round(hours).toString().padStart(2, "0")}h:${Math.round(minutes).toString().padStart(2, "0")}min:${Math.round(seconds).toString().padStart(2, "0")}s`;
            return `**${index + 1}. <@${user.id}>** - ${formattedTime}`;
        }).join("\n");
        const embed = new this.client.embed()
            .setTitle("🏆 TOP 10 | Call Estudos")
            .setDescription(description)
            .setColor("5763719");
        ctx.sendMessage({
            embeds: [embed],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: "Ver ranking completo",
                            url: "http://jogar.craftsapiens.com.br:50024/stats/topcall",
                            emoji: {
                                name: "🏆",
                            },
                        },
                    ],
                },
            ],
        });
    }
}
exports.default = TopCallTimeCommand;
