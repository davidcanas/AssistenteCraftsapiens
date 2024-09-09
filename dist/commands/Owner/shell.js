"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const Command_1 = __importDefault(require("../../structures/Command"));
const sourcebin_1 = require("sourcebin");
class Shell extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "shell",
            description: "Executa algo",
            category: "DG",
            aliases: ["execute"],
            options: [
                {
                    name: "code",
                    type: 3,
                    description: "O código a executar.",
                    required: true,
                },
            ],
        });
    }
    async execute(ctx) {
        if (!this.client.allowedUsers.includes(ctx.author.id)) {
            ctx.sendMessage({
                content: "Você não tem acesso a esse comando!",
                flags: 1 << 6,
            });
            return;
        }
        const code = ctx.args.join(" ");
        if (code.includes("rm -rf")) {
            ctx.sendMessage("`All files have been deleted. L.`\n\nSó que não... Eu não vou permitir você fazer isso!");
            return;
        }
        (0, child_process_1.exec)(code, async (error, stdout) => {
            try {
                const outputType = error || stdout;
                let output = outputType;
                if (!output.toString().length)
                    output = "O comando não retornou nada";
                if (output.toString().length > 1980) {
                    const bin = await (0, sourcebin_1.create)({
                        title: "Shell",
                        description: "Criado pelo Assistente Craftsapiens",
                        files: [
                            {
                                content: output.toString(),
                                language: "shell",
                            },
                        ],
                    });
                    output = bin.shortUrl;
                }
                if (output.toString().includes(process.env.TOKEN) ||
                    output.toString().includes(process.env.GPT_KEY) ||
                    output.toString().includes(process.env.MONGODB)) {
                    ctx.sendMessage("⚠ Não poderei enviar o codigo asseguir aqui porque ele contem dados privados. Ele foi enviado na DM do Canas");
                    this.client.users
                        .get("733963304610824252").createDM()
                        .then(async (dm) => {
                        await dm.createMessage({ content: `\`\`\`ansi\n${output}\n\`\`\`` });
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
            }
            catch (err) {
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
exports.default = Shell;
