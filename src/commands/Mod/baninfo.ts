import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class banInfo extends Command {
    constructor(client: Client) {
        super(client, {
            name: "baninfo",
            description: "[STAFF] Verifica informações de um banimento",
            category: "Mod",
            aliases: ["infoban"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "id",
                    description: "O ID do membro banido",
                    required: true,
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

        const banInfo = await ctx.guild?.getBan(ctx.args[0]);
        const user = banInfo.user;

        if (!banInfo) {
            ctx.sendMessage({
                content: `<:mine_no:939943857754365962> O usuário ${user?.username} **não está** banido do servidor!`,
                flags: 1 << 6,
            });
            return;
        }

        const embed = new this.client.embed()
            .setTitle("<:report:1307789599279546419> Informações de Banimento")
            .setDescription(
                `<:Steve:905024599274684477> O membro ${user.username} **está banido** do servidor.\n\n<:text:1308134831946862732> **Motivo:**\n \`${banInfo.reason || "Sem motivo especificado"}\``
            )
            .setThumbnail(user.avatarURL())
    
            .setColor(0xffcc00)
            .setFooter(`ID do usuário: ${user.id}`)

        await ctx.sendMessage({
            embeds: [embed]
        });
    }
}
