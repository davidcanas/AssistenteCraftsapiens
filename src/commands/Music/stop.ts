import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class Stop extends Command {
	constructor(client: Client) {
		super(client, {
			name: "stop",
			description: "Para uma Musica",
			category: "Music",
			aliases: ["parar"],
			options: [], 
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		if (ctx.channel.type !== 0 || !ctx.guild) return;
		
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);
    
		if (!currPlayer || !currPlayer.connected) {
			ctx.sendMessage("Não estou tocando nada.");
			return;
		}

		const voiceChannelID = ctx.member?.voiceState?.channelID;

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
          ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
          return;
        }

		const olderMessageID = currPlayer.get<string>("olderMessageID");
		if (olderMessageID) {
			ctx.channel.deleteMessage(olderMessageID).catch(() => { });
		}
		await currPlayer.destroy();
		ctx.sendMessage("Musica parada por " + ctx.author.username);
	}
}