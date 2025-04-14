import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

function formatTime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts = [];

	if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
	if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
	if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);

	if (parts.length === 0) return "menos de 1 minuto";
	if (parts.length === 1) return parts[0];
	return parts.slice(0, 2).join(" e ");
}

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

	async execute(ctx: CommandContext): Promise<void> {
		const inputMonth = ctx.args[0]

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
			ctx.sendMessage({
				content: `Nenhum registro de chamadas de voz encontrado para o mês **${targetMonth}**.`,
			});
			return;
		}

		const description = rankedUsers.map((user, index) => {
			const formattedTime = formatTime(user.totalTime);
			return `**${index + 1}. <@${user.id}>** - ${formattedTime}`;
		}).join("\n");

		const [ano, mes] = targetMonth.split("-");
		const nomeMes = new Date(Number(ano), Number(mes) - 1).toLocaleString("pt-BR", { month: "long" });

		const embed = new this.client.embed()
			.setTitle(`🏆 TOP 10 | Call Estudos - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} ${ano}`)
			.setDescription(description)
			.setColor("5763719");

		ctx.sendMessage({ embeds: [embed] });
	}
}
