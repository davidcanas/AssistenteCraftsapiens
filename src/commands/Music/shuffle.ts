import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ConnectionState, DefaultQueue } from "vulkava";

export default class Shuffle extends Command {
	constructor(client: Client) {
		super(client, {
			name: "shuffle",
			description: "Embaralha a lista de músicas atual",
			category: "Music",
			aliases: [""],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {

		if (ctx.channel.type !== 0 || !ctx.guild) return; 
    
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);
  
		if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
			ctx.sendMessage("Não estou a tocar nada nesse momento.");
			return; 
		}
    
        const voiceChannelID = ctx.member?.voiceState?.channelID;

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
          ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
          return;
        }

        (currPlayer.queue as DefaultQueue).shuffle();

        ctx.sendMessage("Lista de músicas embaralhada com sucesso!");

       
        
	}}