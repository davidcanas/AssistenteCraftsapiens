import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ConnectionState } from "vulkava";

export default class Skip extends Command {
	constructor(client: Client) {
		super(client, {
			name: "skip",
			description: " Skippa uma música",
			category: "Music",
			aliases: ["pular", "s", "skippar"],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		if (ctx.channel.type !== 0 || !ctx.guild) return;
		
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);

   
		if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
			ctx.sendMessage("Não existe nenhuma música para ser pulada.");
			return;
		}
        
		const voiceChannelID = ctx.member?.voiceState?.channelID;

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
          ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
          return;
        }

		currPlayer.skip();
		ctx.sendMessage("Musica pulada por " + ctx.author.username);
	}
}