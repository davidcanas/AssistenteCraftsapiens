import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class OCR extends Command {
    constructor(client: Client) {
        super(client, {
            name: "test_attach",
            description: "Testa e debuga o attachment do discord",
            category: "DG",
            options: [
                {
                    type: 11, 
                    name: "imagem",
                    description: "A imagem para testar",
                    required: false
                },

            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        const imagemAttachment = ctx.args[0];

        if (!imagemAttachment ) {
            ctx.sendMessage("Por favor, forneça uma imagem como anexo.");
            return;
        }


        try {
            
            console.log(imagemAttachment);
            ctx.sendMessage(imagemAttachment);
            

        } catch (error) {
            console.error(error);
            ctx.sendMessage("Ocorreu um erro ao processar a imagem. Verifique o URL ou o anexo.");
            return;
        }


    }
}