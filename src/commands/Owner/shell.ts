import { exec } from "child_process";
import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { create } from "sourcebin";
import { Constants } from "oceanic.js";

export default class Shell extends Command {
  constructor(client: Client) {
    super(client, {
      name: "shell",
      description: "Executa algo",
      category: "DG",
      aliases: ["execute"],
      options: [
        {
          name: "prompt",
          type: Constants.ApplicationCommandOptionTypes.STRING,
          description: "O código a executar.",
          required: true,
        },
      ],
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (!this.client.allowedUsers.includes(ctx.author.id)) {
        ctx.sendMessage({
            content: "Você não tem acesso a esse comando!",
            flags: 1 << 6,
        });
        return;
    }
    const code = ctx.args.join(" ");
   if(code.includes("rm -rf")) {
        ctx.sendMessage("`All files have been deleted. L.`\n\nSó que não... Eu não vou permitir você fazer isso!");
        return;
    }
    exec(code, async (error, stdout) => {
      try {
        const outputType = error || stdout;
        let output = outputType;
        if (!output.toString().length) output = "O comando não retornou nada";

        if (output.toString().length > 1980) {
          const bin = await create(
            {
                title: "Shell",
                description: "Criado pelo Assistente Craftsapiens", 
                files: [
                    {
                        content: output.toString(),
                        language: "shell",
                    },
                ],
            },
        );
          output = bin.shortUrl;
        }
 
        if (
          output.toString().includes(process.env.TOKEN) ||
          output.toString().includes(process.env.GPT_KEY) ||
          output.toString().includes(process.env.MONGODB)
        ) {
          ctx.sendMessage(
            "⚠ Não poderei enviar o codigo asseguir aqui porque ele contem dados privados. Ele foi enviado na DM do Canas"
          );
          this.client.users
            .get("733963304610824252").createDM()
            .then(async (dm) => {
              await dm.createMessage({content:`\`\`\`ansi\n${output}\n\`\`\``});
            });
          return;
        }
        return ctx.sendMessage({
          content: "```js\n" + output + "\n```",
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2,
                  label: "🚮 Apagar Shell",
                  customID: "delmsgeval",
                },
              ],
            },
          ],
        });
      } catch (err) {
        ctx.sendMessage({
          content: "Erro: " + err,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 2,
                  label: "🚮 Apagar Erro",
                  customID: "delmsgeval",
                },
              ],
            },
          ],
        });
      }
    });
  }
}