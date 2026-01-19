"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class cronograma extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "cronograma",
            description: "Obtenha o cronograma de aulas mais recente da Craftsapiens",
            category: "Info",
            aliases: ["cornograma"],
            options: [],
        });
    }
    async execute(ctx) {
        const cronograma = await this.client.getCronograma();
        const embed = new this.client.embed()
            .setTitle("📆 Cronograma de aulas")
            .setDescription("Aqui está o cronograma de aulas mais recente da Craftsapiens!")
            .setImage(cronograma?.url)
            .setColor("RANDOM")
            .setTimestamp()
            .setFooter("Craftsapiens", this.client.user.avatarURL());
        ctx.sendMessage({
            embeds: [embed],
        });
        const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
    }
}
exports.default = cronograma;
