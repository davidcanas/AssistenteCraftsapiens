import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ComponentCollector } from "../../structures/Collector";
import { Message, ComponentInteraction, MessageActionRow, ChannelTypes } from 'oceanic.js';

export default class Botinfo extends Command {
  constructor(client: Client) {
    super(client, {
      name: "playerlist",
      description: "Obtenha o nick e outras informações de todos os jogadores online (Com o mapa ativo)",
      category: "Info",
      aliases: ["tab", "pllist", "pl"],
      options: [],
    });
  }

  async execute(ctx: CommandContext): Promise<void> {

    ctx.defer()

    const players = await this.client.utils.dynmap.players()
    const playersVanilla = await this.client.utils.dynmap.playersVanilla()

    const embed = new this.client.embed()
    .setTitle("Lista de jogadores online")
    .setDescription(players.join("\n"))
    .setFooter(`Total: ${players.length}`)
    .setColor("RANDOM")
    
     ctx.sendMessage({
        embeds: [embed],
        components: [
            //{
                //type: 1 //,
               // components: [
                //{
                  //  type: 3,
                    //customID: "playerlist",
                    //options: playersVanilla.map((player) => ({
                    //label: player,
                    //value: player,
                    //})),
                    //placeholder: "Selecione um jogador [+Info]",
               // },
                //],
           // },
            ],

    })


 

  }
}
