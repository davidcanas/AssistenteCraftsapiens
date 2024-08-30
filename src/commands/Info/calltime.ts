import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class CallTimeCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "calltime",
            description: "Verifique o tempo total de permanência na chamada de voz",
            category: "Info",
            aliases: ["voicetime", "callduration"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
 
        const userId = ctx.author.id;

        const topUsers = await this.client.db.users.find({})
            .sort({ totalTimeInCall: -1 }) 
            .exec(); 
        if (topUsers.length === 0) {
            ctx.sendMessage({
                content: "Nenhum registro de chamadas de voz encontrado.",
            });
            return;
        }


        const user = await this.client.db.users.findOne({ id: userId });

        if (!user) {
           ctx.sendMessage({
                content: "Você não tem registros de chamadas de voz.",
            });
            return;
        }

        const totalDuration = user.totalTimeInCall; // em segundos

        const userPosition = topUsers.findIndex((u) => u.id === userId) + 1;

        // HH:MM:SS
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const seconds = totalDuration % 60;

        const formattedTime = `${Math.round(hours).toString().padStart(2, "0")}h:${Math.round(minutes).toString().padStart(2, "0")}min:${Math.round(seconds).toString().padStart(2, "0")}s`;


        const embed = new this.client.embed()
            .setTitle("🕒 Tempo em calls de estudo")
            .setDescription(`Seu tempo total de permanência em calls de estudo é: **${formattedTime}**\nVocê está na posição **#${userPosition}** no ranking.`)
            .setColor("5763719");

        ctx.sendMessage({
            embeds: [embed]
        });
    }
}
