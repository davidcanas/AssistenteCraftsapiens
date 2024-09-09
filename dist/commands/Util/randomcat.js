"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class randomCatClass extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "randomcat",
            description: "Gera um gato aleatório (que pode ter um texto)",
            category: "Util",
            aliases: [],
            options: [
                {
                    type: 3,
                    name: "texto",
                    description: "[OPCIONAL] Caso queira adicionar um texto à imagem",
                    required: false
                }
            ],
        });
    }
    async execute(ctx) {
        let texto = encodeURIComponent(ctx.args[0]);
        if (texto.length < 1)
            texto = undefined;
        if (texto && texto.length > 40) {
            ctx.sendMessage({ content: "O texto não pode ter mais de 40 caracteres!" });
            return;
        }
        const fetch = await this.client.fetch("https://cataas.com/cat?json=true");
        const json = await fetch.json();
        const url = `https://cataas.com/cat/${json._id}/${texto ? `/says/${texto}?fontSize=30&fontColor=white` : ""}`;
        if (fetch.status !== 200) {
            ctx.sendMessage({ content: "Ocorreu um erro ao gerar a imagem!" });
            return;
        }
        const embed = new this.client.embed()
            .setColor("#ff0000")
            .setTitle("Gato aleatório")
            .setImage(url);
        ctx.sendMessage({ embeds: [embed] });
    }
}
exports.default = randomCatClass;
