import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import timezones from "../../data/timezones.json";


export default class timezonesClass extends Command {
	constructor(client: Client) {
		super(client, {
			name: "timezones",
			description: "Mostra a hora atual nos principais fusos horários do mundo",
			category: "Util",
			aliases: ["tz"],
			options: [],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
	
		const results = [];
		timezones.timezones.forEach((timezone) => {
			const time = new Date().toLocaleString("pt-BR", { timeZone: timezone.name });
			const [date, hour] = time.split(" ");
			
			results.push(`${timezone.flag} | ${date} ${hour}`);
		});
		ctx.sendMessage(results.join("\n"));
        
	}
}