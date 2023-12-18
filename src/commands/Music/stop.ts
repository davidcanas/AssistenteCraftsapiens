import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Player, ConnectionState } from "vulkava";
import { VoiceChannel } from "oceanic.js";

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
    if (!this.client.ignoreRoles.some((v) => ctx.msg.member.roles.includes(v))) {
        ctx.sendMessage({
         content: "Você não tem acesso a esse comando!",
         flags: 1 << 6,
        })
        return;
       }
    const currPlayer = this.client.music.players.get(ctx.guild.id as string);
    const voiceChannelID = ctx.member?.voiceState.channelID;
    
    if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
      ctx.sendMessage("Não estou tocando nada.");
      return;
    }
    if (currPlayer.olderMessageID) {
        ctx.channel.deleteMessage(currPlayer.olderMessageID).catch(() => { });
      }
    currPlayer.destroy();
    ctx.sendMessage("Musica parada por " + ctx.author.username);
  }
}