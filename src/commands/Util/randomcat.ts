import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class randomCatClass extends Command {
    constructor(client: Client) {
        super(client, {
            name: "randomcat",
            description: "Gera um gato aleatório (que pode ter um texto)",
            category: "Util",
            aliases: [],
            options: [
            {
                type: 3,
                name: 'texto',
                description: '[OPCIONAL] Caso queira adicionar um texto à imagem',
                required: false

            }],

        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        const texto = encodeURIComponent(ctx.args[0])
        if (texto && texto.length > 30) {
            ctx.sendMessage({ content: 'O texto não pode ter mais de 30 caracteres!' })
            return;
        }
        const url = `https://cataas.com/cat${texto ? `/says/${texto}?fontSize=30&fontColor=white` : ''}?r=${Math.floor(Math.random() * 100)}`
        const embed = new this.client.embed()
        .setColor('#ff0000')
        .setImage(url)
        .setTitle('Gato aleatório')

        ctx.sendMessage({ embeds: [embed] })
    }
}