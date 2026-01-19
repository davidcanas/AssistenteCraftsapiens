"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const oceanic_js_1 = require("oceanic.js");
function getLastMonths(count = 3) {
    const months = [];
    const now = new Date();
    for (let i = 1; i <= count; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        months.push(`${y}-${m}`);
    }
    return months;
}
class CallTimeCommand extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "calltime",
            description: "Verifique o tempo total de permanência no sistema de #Estudo Focado",
            category: "Info",
            aliases: ["voicetime", "callduration"],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.USER,
                    name: "user",
                    description: "Caso queira ver o tempo de outro usuário",
                    required: false,
                },
            ],
        });
    }
    async execute(ctx) {
        const userId = ctx.args[0] || ctx.author.id;
        const discordMember = ctx.guild.members.get(userId);
        if (!discordMember) {
            ctx.sendMessage({ content: "❌ Usuário não encontrado!" });
            return;
        }
        if (!this.client.getDiscordByNick(ctx.member?.nick)) {
            const embed = new this.client.embed()
                .setDescription("**Para usufruir do sistema #EstudoFocado, você precisa de ter a sua conta discord vinculada com o minecraft!**")
                .addField("Como vincular?", "> Para vincular sua conta use o comando `/discord link` no minecraft da Craftsapiens!")
                .setColor("16711680")
                .setFooter("Qualquer dúvida, contacte um STAFF | Essa mensagem se autodestruirá em 30 segundos!");
            const msg = await ctx.sendMessage({
                embeds: [embed],
                messageReference: { messageID: ctx.msg.id },
                flags: 1 << 6
            });
            setTimeout(() => {
                if (msg)
                    msg.delete();
            }, 30000);
            return;
        }
        const topUsers = await this.client.db.users.find({})
            .sort({ totalTimeInCall: -1 }).exec();
        if (topUsers.length === 0) {
            ctx.sendMessage({ content: "Nenhum registro de chamadas de voz encontrado." });
            return;
        }
        const user = await this.client.db.users.findOne({ id: userId });
        if (!user) {
            ctx.sendMessage({ content: "Você não tem registros de chamadas de voz." });
            return;
        }
        const totalDuration = user.totalTimeInCall || 0;
        const userPosition = topUsers.findIndex((u) => u.id === userId) + 1;
        const formattedTime = ctx.formatTime(totalDuration);
        const ultimosMeses = getLastMonths(2);
        const historicoMeses = [];
        for (const mes of ultimosMeses) {
            const stats = user.monthlyStats?.find(stat => stat.month === mes);
            if (stats) {
                const allUsers = await this.client.db.users.find({
                    "monthlyStats.month": mes
                }).exec();
                const sorted = allUsers.map(u => {
                    const found = u.monthlyStats.find(stat => stat.month === mes);
                    return { id: u.id, total: found ? found.totalTime : 0 };
                }).sort((a, b) => b.total - a.total);
                const posicao = sorted.findIndex(u => u.id === userId) + 1;
                const date = new Date(mes + "-01");
                const nomeMes = date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
                const tempo = ctx.formatTime(stats.totalTime);
                historicoMeses.push(`**${nomeMes}** — \`${tempo}\` • 🥇 Posição: \`#${posicao}\``);
            }
        }
        const embed = new this.client.embed()
            .setTitle(`🕒 Tempo em calls de estudo - ${discordMember.nick}`)
            .setDescription(`🔹 Tempo atual: **${formattedTime}**\n🔹 Posição no ranking: **#${userPosition}**\n\n${historicoMeses.length > 0 ? "📊 **Histórico dos últimos meses:**\n" + historicoMeses.join("\n") : "<:cafe:1319819127111553024>  `Nenhum histórico de meses anteriores encontrado.`"}\n\n<:purplearrow:1145719018121089045> Use </topcalltime:1279029830779797629> para ver o ranking completo.`)
            .setColor("5763719");
        ctx.sendMessage({ embeds: [embed] });
    }
}
exports.default = CallTimeCommand;
