"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class Mapa extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "mapa",
            description: "Obtenha o link do mapa do servidor",
            category: "Info",
            aliases: ["map"],
            options: [],
        });
    }
    async execute(ctx) {
        ctx.sendMessage({
            content: "<:craftsapiens:905025137869463552> [Clique aqui para acessar o mapa do servidor](<http://jogar.craftsapiens.com.br:50024/mapa>)"
        });
        const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
    }
}
exports.default = Mapa;
