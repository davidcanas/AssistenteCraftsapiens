import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Player, ConnectionState } from "vulkava";

export default class Skip extends Command {
  constructor(client: Client) {
    super(client, {
      name: "skip",
      description: "[STAFF] Skippa uma música",
      category: "Music",
      aliases: ["pular", "s", "skippar"],
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
      ctx.sendMessage("Não existe nenhuma música para ser pulada.");
      return;
    }

    currPlayer.skip();
    ctx.sendMessage("Musica pulada por " + ctx.author.username);
  }
}