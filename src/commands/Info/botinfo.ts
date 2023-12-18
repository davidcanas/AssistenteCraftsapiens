import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

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
    const initDB = process.hrtime();

    const db = await this.client.db.global.findOne({ id: ctx.guild.id });

    const stopDB = process.hrtime(initDB);
    let ping = this.client.shards.get(0).latency;
    if (ping === Infinity) ping = 0;

    ctx.sendMessage({
      content: `<:discord:1185986429147431074> | ${ping}ms\n<:mongo:1185980474095583323> | ${Math.round(
        (stopDB[0] * 1e9 + stopDB[1]) / 1e6,
      )}ms\n<:lavalink:1186325123729465444> | ${await this.client.music.nodes[0].ping()}ms\n✨ | v2.0\n<:ramemoji:1185990343888482386> | ${(
        process.memoryUsage().heapUsed /
        1024 /
        1024
      ).toFixed(2)}MB \n<:cpu:1185985428977897483> | ${(
        process.cpuUsage().system /
        1024 /
        1024
      ).toFixed(2)}%\n⏱️ | ${ctx.MsToDate(
        this.client.uptime,
      )}\n<:peepo:1185985409075904602> | Já ajudei \`${db.helped}\` vezes`, 
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 4,
              label: "✨ Changelog",
              disabled: false,
              customID: "changelog",
            },
          ],
        },
      ],
    });
  }
}
