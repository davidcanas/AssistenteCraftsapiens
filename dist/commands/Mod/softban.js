"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const oceanic_js_1 = require("oceanic.js");
class softBan extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "softban",
            description: "[STAFF] Softbane (bane e desbane, ou seja, expulsa e deleta mensagens) um membro do servidor",
            category: "Mod",
            aliases: ["banir"],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.USER,
                    name: "user",
                    description: "Usuário que deseja expulsar",
                    required: true,
                },
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.STRING,
                    name: "motivo",
                    description: "Motivo da expulsão",
                    required: false,
                },
            ],
        });
    }
    async execute(ctx) {
        if (!ctx.member.permissions.has("KICK_MEMBERS")) {
            ctx.sendMessage({
                content: "❌ Você não tem permissão para usar esse comando!",
                flags: 1 << 6,
            });
            return;
        }
        const user = this.client.users.get(ctx.args[0]);
        const reason = ctx.args[1] || "Sem motivo especificado";
        const member = ctx.guild.members.get(user.id);
        if (!member) {
            ctx.sendMessage({
                content: "❌ Esse membro não está no servidor!",
                flags: 1 << 6,
            });
            return;
        }
        const embed = new this.client.embed()
            .setTitle("Confirmação de softban")
            .setDescription(`Você está prestes a softbanir o membro ${user.mention}.\n\n**Motivo:** ${reason}`)
            .setColor(0xff0000)
            .setFooter("Ação requerida por " + ctx.author.tag, ctx.author.avatarURL());
        await ctx.sendMessage({
            embeds: [embed],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "Confirmar",
                            customID: `confirm_softban_${user.id}_${ctx.author.id}_${reason}`,
                        },
                        {
                            type: 2,
                            style: 4,
                            label: "Cancelar",
                            customID: `cancel_softban_${user.id}_${ctx.author.id}`,
                        },
                    ],
                },
            ],
        });
    }
}
exports.default = softBan;
