"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
class cityinfo extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "cityinfo",
            description: "Obtenha informações de uma cidade do survival da craftsapiens",
            category: "Info",
            aliases: ["cinfo"],
            autocomplete: true,
            options: [
                {
                    type: 3,
                    name: "cidade",
                    description: "Nome da cidade",
                    focused: true,
                    autocomplete: true,
                }
            ]
        });
    }
    async execute(ctx) {
        try {
            ctx.defer();
            if (!ctx.args[0]) {
                ctx.sendMessage("Você precisa especificar um jogador!");
                return;
            }
            const cityinfo = this.client.cache.towns.find((city) => city.name.toLowerCase() === ctx.args[0].toLowerCase());
            const mayorinfo = await this.client.getPlayerInfo(cityinfo?.mayor);
            let habitantes_n = "1";
            if (cityinfo?.members.length >= 36) {
                habitantes_n = "mais de 36";
            }
            else {
                habitantes_n = cityinfo?.members.length.toString();
            }
            const embed = new this.client.embed()
                .setTitle(`<:craftsapiens:905025137869463552> Informações da cidade ${cityinfo?.name}`)
                .addField("👑 Prefeito", cityinfo?.mayor, true)
                .addField("🗺️ Nação", `${cityinfo?.nation || "N/A"}`, true)
                .addField("👤 Habitantes (" + habitantes_n + ")", `\`${cityinfo?.members.join(", ") || "N/A"}\``, false)
                .setFooter("Assistente | Craftsapiens")
                .setColor("RANDOM")
                .setThumbnail(`https://mineskin.eu/armor/bust/${cityinfo?.mayor}/100.png`);
            if (mayorinfo.isStaff) {
                embed.setDescription(`✨ O prefeito da cidade é \`${mayorinfo?.staff}\` da Craftsapiens!`);
            }
            ctx.sendMessage({ embeds: [embed] });
        }
        catch (err) {
            ctx.sendMessage({ content: `Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``, flags: 1 << 6 });
            console.log(err);
        }
    }
    async runAutoComplete(interaction, value) {
        if (!value) {
            interaction.result([]);
            return;
        }
        const allCities = await this.client.cache.towns;
        const similarCities = allCities.filter(player => this.client.utils.levDistance(player.name, value) <= 1);
        const chunkedCities = this.chunkArray(similarCities, 25);
        const arr = [];
        for (const chunk of chunkedCities) {
            arr.push(...chunk.map(player => ({
                name: player.name,
                value: player.name,
            })));
        }
        interaction.result(arr);
    }
    chunkArray(array, size) {
        const chunkedArray = [];
        if (!array) {
            return chunkedArray;
        }
        for (let i = 0; i < array.length; i += size) {
            const chunk = array.slice(i, i + size);
            chunkedArray.push(chunk);
        }
        return chunkedArray;
    }
}
exports.default = cityinfo;
