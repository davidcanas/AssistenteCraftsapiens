import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class TopCallTimeCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "topcalltime",
            description: "Veja os 10 membros com mais tempo em call de estudo.",
            category: "Info",
            aliases: ["topvoicetime", "topcallduration"],
            options: [
                {
                    type: 3,
                    name: "mes",
                    description: "Mês no formato YYYY-MM (ex: 2025-03). Se não for informado, o mês atual será considerado.",
                    required: false,
                },
            ],
        });
    }

    async execute(context: CommandContext): Promise<void> {
        const inputMonth = context.args[0];

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const targetMonth = inputMonth || currentMonth;
        const isCurrentMonth = targetMonth === currentMonth;

        const allUsers = await this.client.db.users.find({}).exec();

        const rankedUsers = allUsers
            .map(user => {
                let totalTime = 0;

                if (isCurrentMonth) {
                    totalTime = user.totalTimeInCall || 0;
                } else {
                    const monthly = user.monthlyStats?.find(stat => stat.month === targetMonth);
                    totalTime = monthly ? monthly.totalTime : 0;
                }

                return {
                    id: user.id,
                    totalTime,
                };
            })
            .filter(user => user.totalTime > 0)
            .sort((a, b) => b.totalTime - a.totalTime)
            .slice(0, 10);

        if (rankedUsers.length === 0) {
            context.sendMessage({
                content: `Nenhum registro de chamadas de voz encontrado para o mês **${targetMonth}**.`,
            });
            return;
        }

        const description = rankedUsers.map((user, index) => {
            const formattedTime = context.formatTime(user.totalTime);
            
            const medal = index === 0 ? "🥇"
                        : index === 1 ? "🥈"
                        : index === 2 ? "🥉"
                        : `**${index + 1}.**`;
        
            return `${medal} <@${user.id}> - ${formattedTime}`;
        }).join("\n");
        

        const [ano, mes] = targetMonth.split("-");
        const nomeMes = new Date(Number(ano), Number(mes) - 1).toLocaleString("pt-BR", { month: "long" });

        const embed = new this.client.embed()
            .setTitle(`🏆 TOP 10 | Call Estudos - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${ano}`)
            .setDescription(description)
            .setColor("5763719");

        context.sendMessage({
            embeds: [embed],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: "Ver ranking completo",
                            url: "http://jogar.craftsapiens.com.br:50024/stats/topcall",
                            emoji: { name: "🏆" },
                        },
                    ],
                },
            ],
        });
    }
}
