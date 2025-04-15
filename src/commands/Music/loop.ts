import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ConnectionState } from "vulkava";
import { Constants } from "oceanic.js";

export default class Loop extends Command {
	constructor(client: Client) {
		super(client, {
			name: "loop",
			description: " Ativa/desativa o loop na queue/musica atual",
			category: "Music",
			aliases: [""],
			options: [
				{
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "modo",
                    description: "Ativa o loop na playlist (queue) ou na musica atual (track)",
                    required: true,
                    choices: [
                        {
                            name: "queue",
                            value: "queue"
                        },
                        {
                            name: "track",
                            value: "track"
                        }
                    ]
                },
			],
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

        if (ctx.args[0] === "queue") {
            currPlayer.setQueueLoop(!currPlayer.queueRepeat);
            ctx.sendMessage(`O loop da queue foi ${currPlayer.queueRepeat ? "ativado" : "desativado"}.`);
        } else if (ctx.args[0] === "track") {
            currPlayer.setTrackLoop(!currPlayer.trackRepeat);
            ctx.sendMessage(`O loop da música atual foi ${currPlayer.trackRepeat ? "ativado" : "desativado"}.`);
        }

       
        
	}}