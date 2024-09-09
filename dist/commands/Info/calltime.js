"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class CallTimeCommand extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "calltime",
            description: "Verifique o tempo total de permanência na chamada de voz",
            category: "Info",
            aliases: ["voicetime", "callduration"],
            options: [],
        });
    }
    async execute(ctx) {
        const userId = ctx.author.id;
        const topUsers = await this.client.db.users.find({})
            .sort({ totalTimeInCall: -1 })
            .exec();
        if (topUsers.length === 0) {
            ctx.sendMessage({
                content: "Nenhum registro de chamadas de voz encontrado.",
            });
            return;
        }
        const user = await this.client.db.users.findOne({ id: userId });
        if (!user) {
            ctx.sendMessage({
                content: "Você não tem registros de chamadas de voz.",
            });
            return;
        }
        const totalDuration = user.totalTimeInCall; // em segundos
        const userPosition = topUsers.findIndex((u) => u.id === userId) + 1;
        // HH:MM:SS
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const seconds = totalDuration % 60;
        const formattedTime = `${Math.round(hours).toString().padStart(2, "0")}h:${Math.round(minutes).toString().padStart(2, "0")}min:${Math.round(seconds).toString().padStart(2, "0")}s`;
        const embed = new this.client.embed()
            .setTitle("🕒 Tempo em calls de estudo")
            .setDescription(`Seu tempo total de permanência em calls de estudo é: **${formattedTime}**\nVocê está na posição **#${userPosition}** no ranking.\n\n<:purplearrow:1145719018121089045> Use </topcalltime:1279029830779797629> para ver o ranking.`)
            .setColor("5763719");
        ctx.sendMessage({
            embeds: [embed]
        });
    }
}
exports.default = CallTimeCommand;
