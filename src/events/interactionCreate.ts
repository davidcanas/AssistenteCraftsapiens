import Client from "../structures/Client";
import {
  Interaction,
  CommandInteraction,
  ComponentInteraction
} from "oceanic.js";
import CommandContext from "../structures/CommandContext";

export default class InteractionCreate {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async run(interaction: Interaction) {
    if (interaction instanceof CommandInteraction) {
      const cmd = this.client.commands.find(
        (c) => c.name === interaction.data.name,
      );
      if (!cmd) throw new Error("<!> Command not found");

      const ctx = new CommandContext(this.client, interaction);

      cmd.execute(ctx);
    }
    if (!(interaction instanceof CommandInteraction)) {
      if (interaction instanceof ComponentInteraction) {
        for (const collector of this.client.componentCollectors) {
          if (collector.message.id === interaction.message.id) {
            collector.collect(interaction);
            break;
          }
        }

        if (interaction.data.customID === "delmsgeval") {
          if (interaction.member?.id !== "733963304610824252") return;
          interaction.channel.messages.get(interaction.message.id).delete();
        }
        if (interaction.data.customID === 'confirm') {
          const dbremove = await this.client.db.global.findOne({ id: interaction.guild.id });
          const autor = interaction.message.mentions.users[0]

          if (
            interaction.member.roles.includes('959259258829021255') ||
            interaction.member.roles.includes('917900552225054750') ||
            interaction.member.roles.includes('901251917991256124')
          ) {
            interaction.message.channel.deleteMessage(
              interaction.message.messageReference.messageID
            )

            interaction.message.delete()

            dbremove.ignoredUsers.splice(dbremove.ignoredUsers.indexOf(autor.id), 1);
            dbremove.save();

            console.log(
              '\u001b[33m', '| Removendo @' +
              autor.username +
            ' da lista de usuários que acionaram o sistema!'
            )
            return interaction.createMessage({
              content:
                '**[ADMIN]** Você acaba de usar poderes de fontes suspeitas e apagou essa mensagem com sucesso!',
              flags: 1 << 6
            })
          }

          if (interaction.member.id !== autor.id) {
            return interaction.createMessage({
              content:
                'Esse botão é de @' +
                autor.username +
                ' , apenas ele pode confirmar a leitura!',
              flags: 1 << 6
            })
          }

          interaction.createMessage({
            content: 'Obrigado por confirmar a sua leitura :D.',
            flags: 1 << 6
          })

          interaction.message.channel.deleteMessage(
            interaction.message.messageReference.messageID
          )
          interaction.message.delete()
          dbremove.ignoredUsers.splice(dbremove.ignoredUsers.indexOf(autor.id), 1);
          dbremove.save();

          console.log(
            '\u001b[33m', '| Removendo @' +
            autor.username +
          ' da lista de usuários que acionaram o sistema!'
          )
        }
      }
      return;
    }

  }
}
