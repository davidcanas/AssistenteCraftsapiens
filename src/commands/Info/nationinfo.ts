import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { AutocompleteInteraction } from "oceanic.js";

export default class nationinfo extends Command {
    constructor(client: Client) {
        super(client, {
            name: "nationinfo",
            description: "Obtenha informações de uma nação do survival da craftsapiens",
            category: "Info",
            aliases: ["ninfo"],
            autocomplete: true,
            options: [
                {
                    type: 3,
                    name: "nation",
                    description: "Nome da nação",
                    focused: true,
                    autocomplete: true,
                }
            ]
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        try {
            await ctx.defer();

            let nationName = ctx.args[0];

            if (!nationName) {
                const playerInfo = await this.client.api.getPlayerInfo(ctx.member.nick || "");
                nationName = playerInfo.data.towny?.nationName;
            }

            const nation = await this.client.api.getNationInfo(nationName);
            if (!nation) {
                ctx.sendMessage(`Nação \`${nationName}\` não encontrada no banco de dados.`);
                return;
            }

            const foundedDate = new Date(nation.data.foundedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

            const cities = nation.data.towns?.map(r => r.name) || [];

            let cityList = "N/A";
            if (cities.length > 0) {
                if (cities.length > 20) {
                    const shown = cities.slice(0, 20).join(", ");
                    const more = cities.length - 20;
                    cityList = `${shown} … e mais ${more}`;
                } else {
                    cityList = cities.join(", ");
                }
            }

            const embed = new this.client.embed()
                .setTitle(`<:craftsapiens:905025137869463552> Informações da nação ${nation.data.name}`)
                .addField("👑 Líder", nation.data.leader || "N/A", true)
                .addField("🗺️ Capital", nation.data.capital?.name, true)
                .addField(`🏙️ Cidades (${nation.data.townsCount})`, cityList)
                .addField("📅 Fundada em", foundedDate, true)
                .addField("💰 Banco", `${nation.data.balance.toLocaleString("pt-BR")} Sapiens`, true)
                .addField("📦 Chunks", `${nation.data.nationBlocks} chunks`, true)
                .addField("🚩 Relações ", `🟢 Aliados: \`${nation.data.relations.allies.join(", ") || "N/A"}\`\n🔴 Inimigos: \`${nation.data.relations.enemies.join(", ") || "N/A"}\``, true)
                .setFooter("Assistente | Craftsapiens")
                .setColor(parseInt(nation.data.mapColor, 16))
                .setThumbnail(`https://mineskin.eu/armor/bust/${nation.data.leader}/100.png`)
                .setURL("https://assistente.craftsapiens.com.br/mapa/iframe?nationName=" + nation.data.name);

            ctx.sendMessage({ embeds: [embed] });
        } catch (err) {
            ctx.sendMessage({ content: `❌ Ocorreu um erro ao executar este comando!\n**Erro:** \`${err}\``, flags: 1 << 6 });
            console.error(err);
        }
    }

    async runAutoComplete(interaction: AutocompleteInteraction, value: string) {
        try {
            const allNations = await this.client.api.getNationList();

            const similarNations = allNations.data.nations.filter(nation =>
                this.client.utils.levDistance(nation.name.toLowerCase(), value.toLowerCase()) <= 2 ||
                nation.name.toLowerCase().includes(value.toLowerCase())
            );

            const arr = similarNations.slice(0, 25).map(nation => ({
                name: nation.name,
                value: nation.name,
            }));

            interaction.result(arr);
        } catch (err) {
            console.error("Erro no autocomplete:", err);
            interaction.result([]);
        }
    }
}
