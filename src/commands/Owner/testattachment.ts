import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";

export default class TestAttach extends Command {
    constructor(client: Client) {
        super(client, {
            name: "test_attach",
            description: "Testa e debuga o attachment do discord",
            category: "DG",
            options: [
                {
                    type: 11, 
                    name: "image",
                    description: "The file to upload",
                    required: false
                },
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        // Obter o primeiro attachment disponível
        const attachment = ctx.attachments[0];

        if (!attachment) {
            ctx.sendMessage("Por favor, anexe um arquivo ao comando.");
            return;
        }

        try {
            // Debug no console
            console.log("Attachment recebido:", attachment);
            
            // Construir resposta
            const response = `✅ Attachment recebido!\n**Detalhes:**
URL: ${attachment.url}
Nome do arquivo: ${attachment.filename}
Tipo: ${attachment.contentType}
Tamanho: ${(attachment.size / 1024).toFixed(2)} KB`;

            ctx.sendMessage(response);
            
        } catch (error) {
            console.error("Erro no teste de attachment:", error);
            ctx.sendMessage("Ocorreu um erro ao processar o arquivo.");
        }
    }
}