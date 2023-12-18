import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class noAulaClass extends Command {
    constructor(client: Client) {
        super(client, {
            name: "toggleaula",
            description: "Ativa ou desativa o modo de aulas ativas",
            category: "DG",
            aliases: [],
            options: [{
                type: 3,
                name: 'oquefazer',
                description: 'Ativar ou desativar o sistema de não haver aulas',
                required: true,
                choices: [
                    {
                        name: 'Ativar aulas',
                        value: 'on'
                    },
                    {
                        name: 'Desativar aulas',
                        value: 'off'
                    }
                ]
            },
            {
                type: 3,
                name: 'motivo',
                description: '(Caso seja para desativar) Motivo de não haver aulas',
                required: false

            }],

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
        const args = ctx.args[0]
        const motivo = ctx.args[1]
        if (!args) {
            ctx.sendMessage({ content: 'Você precisa definir o que fazer!' })
            return;
        }
        const db = await this.client.db.global.findOne({ id: ctx.guild.id })
        db.classes.enabled = args === 'on' ? true : false
        db.classes.reason = motivo ? motivo : 'Sem motivo especificado'
        db.save()

        ctx.sendMessage({ content: `Modo de aulas ativas foi ${args === 'on' ? 'ativado' : 'desativado'} com sucesso!\nMotivo: ${db.classes.reason}` })

    }
}