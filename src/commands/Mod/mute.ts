import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class Mute extends Command {
    constructor(client: Client) {
        super(client, {
            name: "mute",
            description: "[STAFF] Silencia um membro do servidor",
            category: "Mod",
            aliases: ["silenciar"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.USER, 
                    name: "user",
                    description: "Jogador que deseja silenciar",
                    required: true,
                },
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "tempo",
                    description: "Tempo de silenciamento (ex.: 1d, 5min, 36s)",
                    required: true,
                },
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING, 
                    name: "motivo",
                    description: "Motivo do silenciamento",
                    required: false,
                },
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        if (!ctx.member.permissions.has("MODERATE_MEMBERS")) {
            ctx.sendMessage({
                content: "❌ Você não tem permissão para usar esse comando!",
                flags: 1 << 6,
            });
            return;
        }

        const user = this.client.users.get(ctx.args[0]);
        const tempoStr = ctx.args[1];
        const reason = ctx.args[2] || "Sem motivo especificado";

        const member = ctx.guild.members.get(user.id);
        if (!member) {
            ctx.sendMessage({
                content: "❌ Esse membro não está no servidor!",
                flags: 1 << 6,
            });
            return;
        }

        const parseTime = (time: string): number | null => {
            const regex = /^(\d+)(d|h|min|s)$/;
            const match = time.match(regex);

            if (!match) return null;

            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case "d":
                    return value * 86400000;
                case "h":
                    return value * 3600000;
                case "min":
                    return value * 60000; 
                case "s":
                    return value * 1000; 
                default:
                    return null;
            }
        };

        const tempoMs = parseTime(tempoStr);
        const eightDaysInMs = 8 * 24 * 60 * 60 * 1000;

        if (!tempoMs || tempoMs <= 0 || tempoMs > eightDaysInMs) {
            ctx.sendMessage({
                content: "❌ Tempo inválido! Use um formato válido como `1d`, `5min` ou `36s`.\n-# O tempo máximo é de 7 dias.",
                flags: 1 << 6,
            });
            return;
        }

        const embed = new this.client.embed()
            .setTitle("Silenciamento de membro")
            .setDescription(
                `Você está prestes a silenciar o membro ${user.mention} por **${tempoStr}**.\n\n**Motivo:** ${reason}`,
            )
            .setColor(0xffcc00)
            .setFooter("Ação requerida por " + ctx.author.tag, ctx.author.avatarURL());

        await ctx.sendMessage({
            embeds: [embed],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "Confirmar",
                            customID: `confirm_mute_${user.id}_${ctx.author.id}_${tempoMs}_${reason}`,
                        },
                        {
                            type: 2,
                            style: 4,
                            label: "Cancelar",
                            customID: `cancel_mute_${user.id}_${ctx.author.id}`,
                        },
                    ],
                },
            ],
        });
    }
}
