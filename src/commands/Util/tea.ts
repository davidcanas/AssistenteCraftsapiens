import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class TeaCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "tea",
            description: "Receba notificações sobre novos vídeos do Professor Kelvin sobre autismo",
            category: "Info",
            aliases: ["tea", "notificacoes", "videosautismo"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        try {
            const role = "1382348662260371516"; // cargo Interações-TEA
            const member = ctx.guild.members.get(ctx.author.id);

            if (member.roles.includes(role)) {
                await member.removeRole(role);
                const embed = new this.client.embed()
                    .setDescription("Você não receberá mais notificações sobre novos vídeos do Professor Kelvin relacionados ao autismo.")
                    .setColor("16711680");

                ctx.sendMessage({
                    embeds: [embed],
                    flags: 1 << 6
                });
                return;
            }

            await member.addRole(role);

            const embed = new this.client.embed()
                .setDescription("Agora você receberá notificações sobre novos vídeos do Professor Kelvin relacionados ao autismo.")
                .addField("📢 Notificações", "Você será notificado sempre que um novo vídeo for publicado.")
                .addField("🎥 Participação", "Você poderá participar dos vídeos do canal Professor Kelvin.")
                .setColor("RANDOM");

            ctx.sendMessage({
                embeds: [embed],
                flags: 1 << 6
            });

        } catch (error) {
            console.error("Erro ao executar o comando tea:", error);
            const embed = new this.client.embed()
                .setDescription("Ocorreu um erro ao executar o comando. Informe um administrador.")
                .setColor("16711680");

            ctx.sendMessage({
                embeds: [embed],
                flags: 1 << 6
            });

            return;

        }

    }
}