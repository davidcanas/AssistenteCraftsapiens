import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class Kick extends Command {
    constructor(client: Client) {
        super(client, {
            name: "kick",
            description: "[STAFF] Expulsa um membro do servidor",
            category: "Mod",
            aliases: ["expulsar"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.USER, 
                    name: "user",
                    description: "Jogador que deseja expulsar do servidor",
                    required: true,
                },
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING, 
                    name: "motivo",
                    description: "Motivo da expulsão",
                    required: false,
                },
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {

        if (!ctx.member.permissions.has("KICK_MEMBERS")) {
            ctx.sendMessage({
                content: "❌ Você não tem permissão para usar esse comando!",
                flags: 1 << 6,
            });
            return;
        }

        const user = this.client.users.get(ctx.args[0]);
        const reason = ctx.args[1] || "Sem motivo especificado";

        const member = ctx.guild.members.get(user.id);
        if (!member) {
            ctx.sendMessage({
                content: "❌ Esse membro não está no servidor!",
                flags: 1 << 6,
            });
            return;
        }


        const embed = new this.client.embed()
            .setTitle("Expulsão de membro")
            .setDescription(`Você está prestes a expulsar o membro ${user.mention}.\n\n**Motivo:** ${reason}`)
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
                            customID: `confirm_kick_${user.id}_${ctx.author.id}_${reason}`,
                        },
                        {
                            type: 2,
                            style: 4, 
                            label: "Cancelar",
                            customID: `cancel_kick_${user.id}_${ctx.author.id}`,
                        },
                    ],
                },
            ],
        });
    }
}
