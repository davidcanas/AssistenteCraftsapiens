"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const sourcebin_1 = require("sourcebin");
const oceanic_js_1 = require("oceanic.js");
class Eval extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "eval",
            description: "Descrição não definida",
            category: "DG",
            aliases: ["execute"],
            options: [
                {
                    name: "input",
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.STRING,
                    description: "Descrição não definida",
                    required: true,
                },
            ],
        });
    }
    async execute(ctx) {
        try {
            if (!this.client.allowedUsers.includes(ctx.author.id)) {
                ctx.sendMessage({
                    content: "Você não tem acesso a esse comando!",
                    flags: 1 << 6,
                });
                return;
            }
            const texto = ctx.args.join(" ");
            if (!texto) {
                ctx.sendMessage(`<@${ctx.author.id}> Insira algo para ser executado!`);
                return;
            }
            const start = process.hrtime();
            let code = eval(texto);
            if (code instanceof Promise)
                code = await code;
            if (typeof code !== "string")
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                code = require("util").inspect(code, {
                    depth: 0,
                });
            if (code.includes(process.env.TOKEN) ||
                code.includes(process.env.MONGODB)) {
                ctx.sendMessage("⚠ Não poderei enviar o codigo asseguir aqui porque ele contem dados privados. Ele foi enviado na DM do Canas");
                this.client.users
                    .get("733963304610824252")
                    .createDM()
                    .then(async (dm) => {
                    await dm.createMessage({ content: `\`\`\`js\n${code}\n\`\`\`` });
                });
                return;
            }
            const stop = process.hrtime(start);
            if (code.length > 1750) {
                const bin = await (0, sourcebin_1.create)({
                    title: "Eval",
                    description: "Criado pelo Eval do Assistente Craftsapiens",
                    files: [
                        {
                            content: code,
                            language: "javascript",
                        },
                    ],
                });
                ctx.sendMessage(`Como o código passou dos 1800 caracteres carreguei no Sourcebin! [Clica aqui](${bin.url}) \n||(Tempo de Execução: ${(stop[0] * 1e9 + stop[1]) / 1e6}ms )||`);
                return;
            }
            const evalBed = new this.client.embed()
                .setTitle("Eval Executado:")
                .setDescription(`\`\`\`js\n${code}\n\`\`\`\n**Tempo de Execução:**\n\`\`\`\n${(stop[0] * 1e9 + stop[1]) / 1e6}ms \n\`\`\``)
                .setColor("GREEN");
            ctx.sendMessage({
                embeds: [evalBed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 4,
                                label: "🚮 Apagar Eval",
                                disabled: false,
                                customID: "delmsgeval",
                            },
                        ],
                    },
                ],
            });
        }
        catch (e) {
            const errBed = new this.client.embed()
                .setTitle("Ocorreu um erro:")
                .setDescription(`\`\`\`js\n${e}\n\`\`\``)
                .setColor("RED");
            ctx.sendMessage({
                embeds: [errBed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 2,
                                label: "🚮 Apagar Erro",
                                disabled: false,
                                customID: "delmsgeval",
                            },
                        ],
                    },
                ],
            });
        }
    }
}
exports.default = Eval;
