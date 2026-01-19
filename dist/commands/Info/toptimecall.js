"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const oceanic_js_1 = require("oceanic.js");
class TopCallTimeCommand extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "topcalltime",
            description: "Veja os 10 membros com mais tempo em call de estudo.",
            category: "Info",
            aliases: ["topvoicetime", "topcallduration"],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.STRING,
                    name: "mes",
                    description: "Mês no formato YYYY-MM (ex: 2025-03). Se não for informado, o mês atual será considerado.",
                    required: false,
                },
            ],
        });
    }
    async execute(context) {
        const inputMonth = context.args[0];
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const targetMonth = inputMonth || currentMonth;
        const isCurrentMonth = targetMonth === currentMonth;
        let rankedUsers;
        if (isCurrentMonth) {
            // Use MongoDB aggregation for efficient server-side sorting and limiting
            rankedUsers = await this.client.db.users
                .find({ totalTimeInCall: { $gt: 0 } }, { id: 1, nick: 1, totalTimeInCall: 1 })
                .sort({ totalTimeInCall: -1 })
                .limit(10)
                .exec()
                .then(users => users.map(user => ({
                id: user.id,
                nick: user.nick,
                totalTime: user.totalTimeInCall || 0,
            })));
        }
        else {
            // For historical months, filter by monthlyStats
            const allUsers = await this.client.db.users
                .find({ "monthlyStats.month": targetMonth }, { id: 1, nick: 1, monthlyStats: 1 })
                .exec();
            rankedUsers = allUsers
                .map(user => {
                const monthly = user.monthlyStats?.find(stat => stat.month === targetMonth);
                return {
                    id: user.id,
                    nick: user.nick,
                    totalTime: monthly ? monthly.totalTime : 0,
                };
            })
                .filter(user => user.totalTime > 0)
                .sort((a, b) => b.totalTime - a.totalTime)
                .slice(0, 10);
        }
        if (rankedUsers.length === 0) {
            context.sendMessage({
                content: `Nenhum registro de chamadas de voz encontrado para o mês **${targetMonth}**.`,
            });
            return;
        }
        const description = rankedUsers.map((user, index) => {
            const formattedTime = context.formatTime(user.totalTime);
            const medal = index === 0 ? "🥇"
                : index === 1 ? "🥈"
                    : index === 2 ? "🥉"
                        : `**${index + 1}.**`;
            return `${medal} ${user.nick} - ${formattedTime}`;
        }).join("\n");
        const [ano, mes] = targetMonth.split("-");
        const nomeMes = new Date(Number(ano), Number(mes) - 1).toLocaleString("pt-BR", { month: "long" });
        const embed = new this.client.embed()
            .setTitle(`🏆 TOP 10 | Call Estudos - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${ano}`)
            .setDescription(description)
            .setColor("5763719");
        context.sendMessage({
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
                            emoji: { name: "🏆" },
                        },
                    ],
                },
            ],
        });
    }
}
exports.default = TopCallTimeCommand;
