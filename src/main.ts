import dotenv from "dotenv";
dotenv.config();

import DGClient from "./structures/Client";
import database from "mongoose";
import userDB from "./models/userDB";
import cron from "node-cron";
import { TextChannel } from "oceanic.js";

process.on("uncaughtException", (error) => {
	console.log("Uma exception não tratada foi encontrada!");
	console.error(error);
});

process.on("unhandledRejection", (error) => {
	console.log("Uma promise foi rejeitada sem tratamento!");
	console.error(error);
});

database
	.connect(process.env.MONGODB as string)
	.then(() => console.log("\x1b[32m[CLIENT] A database foi conectada com sucesso!"));

const client = new DGClient(process.env.TOKEN);

client.loadCommands();
client.loadEvents();
client.connect();

require("./web/app");
require("./submodules/nina/ninaBot");
require("./submodules/ada/adaBot");
require("./submodules/luy/luyBot");

async function sendMonthlyTopCallTime(client: DGClient) {
	const channelId = process.env.TOP_CALL_CHANNEL_ID;
	const channel = client.getChannel(channelId) as TextChannel;

	if (!channel) {
		console.error("Canal para enviar o Top 10 não encontrado.");
		return;
	}

	try {
		const topUsers = await client.db.users.find({})
			.sort({ totalTimeInCall: -1 })
			.limit(10)
			.exec();
	
		if (!topUsers || topUsers.length === 0) {
			channel.createMessage({ content: "Nenhum registro de chamadas de voz encontrado no mês anterior." });
			return;
		}
	
		const description = topUsers
			.filter(user => user.totalTimeInCall > 0) 
			.map((user, index) => {
				const hours = Math.floor(user.totalTimeInCall / 3600);
				const minutes = Math.floor((user.totalTimeInCall % 3600) / 60);
				const seconds = Math.floor(user.totalTimeInCall % 60);
	
				const formattedTime = `${hours.toString().padStart(2, "0")}h:${minutes.toString().padStart(2, "0")}min:${seconds.toString().padStart(2, "0")}s`;
	
				return `**${index + 1}. <@${user.id}>** - ${formattedTime}`;
			})
			.join("\n");

		const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
			.toLocaleString('pt-BR', { month: 'long' });
		const thisMonth = new Date().toLocaleString('pt-BR', { month: 'long' });


		const embed = new client.embed()
			.setTitle("🏆 TOP 10 | Call Estudos - " + prevMonth.charAt(0).toUpperCase() + prevMonth.slice(1))
			.setDescription(description)
			.setFooter("Os rankings das calls de estudo são resetados mensalmente. Esse é o top 10 do mês anterior, " + prevMonth.charAt(0).toUpperCase() + prevMonth.slice(1) + ".")
			.setColor("5763719");

		channel.createMessage({
			embeds: [embed],
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							style: 5,
							label: `Ver ranking completo (${thisMonth.charAt(0).toUpperCase()}${thisMonth.slice(1)})`,
							url: "http://jogar.craftsapiens.com.br:50024/stats/topcall",
							emoji: { name: "🏆" },
						},
					],
				},
			],
		});
		console.log("Top 10 do mês anterior enviado com sucesso.");
	} catch (error) {
		console.error("Erro ao enviar o Top 10 do mês anterior:", error);
	}
}

async function resetTopHorasCall() {
	try {
		const now = new Date();
		const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

		const users = await userDB.find({});

		for (const user of users) {
			if (user.totalTimeInCall > 0) {
				user.monthlyStats = user.monthlyStats || [];

				const existingMonth = user.monthlyStats.find(stat => stat.month === monthKey);
				if (existingMonth) {
					existingMonth.totalTime += user.totalTimeInCall;
				} else {
					user.monthlyStats.push({
						month: monthKey,
						totalTime: user.totalTimeInCall,
					});
				}
			}

			user.totalTimeInCall = 0;
			user.lastTimeInCall = null;
			user.voiceSessions = [];

			await user.save();
		}

		console.log("Ranking mensal salvo e dados resetados com sucesso.");
	} catch (error) {
		console.error("Erro ao resetar dados de chamadas de voz:", error);
	}
}


cron.schedule("0 0 1 * *", async () => {

	await sendMonthlyTopCallTime(client);

	setTimeout(async () => {
		await resetTopHorasCall();
	}, 10000);
});


export default client;
