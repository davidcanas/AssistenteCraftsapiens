import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

import packageInfo from "../../../package.json";

export default class Botinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: "botinfo",
			description: "Informações sobre o estado do Assistente",
			category: "Info",
			aliases: ["bi"],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		try {
			const initDB = process.hrtime();
			const db = await this.client.db.global.findOne({ id: ctx.guild.id });
			const stopDB = process.hrtime(initDB);
			const dbResponseTime = Math.round((stopDB[0] * 1e9 + stopDB[1]) / 1e6); // em milissegundos

			let ping = this.client.shards.get(0)?.latency || 0;
			if (ping === Infinity) ping = 0;

			const lavalinkPing = this.client.music?.nodes[0]
				? await this.client.music.nodes[0].ping()
				: "N/A";

			const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
			const cpuUsage = (process.cpuUsage().system / 1024 / 1024).toFixed(2);
			const uptime = ctx.MsToDate(this.client.uptime);
			const version = packageInfo.version;

			const embed = new this.client.embed()
				.setDescription(
					`<:discord:1185986429147431074> | ${ping}ms\n` +
					`<:mongo:1185980474095583323> | ${dbResponseTime}ms\n` +
					`<:lavalink:1186325123729465444> | ${lavalinkPing}ms\n` +
					`✨ | v${version}\n` +
					`<:ramemoji:1185990343888482386> | ${memoryUsed}MB\n` +
					`<:cpu:1185985428977897483> | ${cpuUsage}%\n` +
					`⏱️ | ${uptime}\n` +
					`<:peepo:1185985409075904602> | Já ajudei \`${db.helped}\` vezes\n` +
					`💪 | Já foram censurados \`${db.urlsDeleted}\` links!`
				)
				.setColor("RANDOM");

			ctx.sendMessage({
				content: `<@${ctx.author.id}>`,
				embeds: [embed],
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 5,
								url: "https://github.com/davidcanas/AssistenteCraftsapiens/releases/latest",
								label: "✨ Changelog",
							},
							{
								type: 2,
								style: 5,
								label: "Github",
								emoji: { id: "1268924658904731693", name: "github" },
								disabled: false,
								url: "https://github.com/davidcanas/AssistenteCraftsapiens",
							},
						],
					},
				],
			});
		} catch (error) {
			console.error(error);
			ctx.sendMessage({ content: "Ocorreu um erro ao obter as informações do bot" });
		}
	}
}
