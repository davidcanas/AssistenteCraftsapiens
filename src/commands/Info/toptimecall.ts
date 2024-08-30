import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class TopCallTimeCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "topcalltime",
            description: "Veja os 5 membros com mais tempo em chamadas de voz.",
            category: "Info",
            aliases: ["topvoicetime", "topcallduration"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {

        const topUsers = await this.client.db.users.find({})
            .sort({ totalTimeInCall: -1 }) 
            .limit(5) 
            .exec(); 
        if (topUsers.length === 0) {
            ctx.sendMessage({
                content: "Nenhum registro de chamadas de voz encontrado.",
            });
            return;
        }

        // Construir a lista de top 5 usuários
       const description = topUsers.map((user, index) => {
            const hours = Math.floor(user.totalTimeInCall / 3600);
            const minutes = Math.floor((user.totalTimeInCall % 3600) / 60);
            const seconds = user.totalTimeInCall % 60;

            if (hours === 0 && minutes === 0 && seconds === 0) return;
            const formattedTime = `${Math.round(hours).toString().padStart(2, "0")}h:${Math.round(minutes).toString().padStart(2, "0")}min:${Math.round(seconds).toString().padStart(2, "0")}s`;

            return `**${index + 1}. ${user.nick || user.id}** - ${formattedTime}`;
        }).join("\n");

        // Cria e envia a mensagem com a lista formatada
        const embed = new this.client.embed()
            .setTitle("🏆 TOP | Call Estudos")
            .setDescription(description)
            .setColor("5763719");

        ctx.sendMessage({
            embeds: [embed]
        });
    }
}
