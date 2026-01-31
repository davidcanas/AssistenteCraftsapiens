import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Message, TextChannel, Attachment, Constants } from "oceanic.js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

export default class ReportCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "report",
            description: "Reporte uma mensagem ofensiva ou divulgação, analisada por IA",
            category: "Util",
            aliases: ["reportar", "r", "denunciar"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        // Bloqueia uso via Slash Command (opcional, conforme sua lógica original)
        if (ctx.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            ctx.sendMessage({ 
                content: "Você não pode executar este comando usando `/report`, use `-report` respondendo à mensagem que deseja denunciar.", 
                flags: 64 
            });
            return;
        }

        const messageReference = (ctx.msg as Message).messageReference?.messageID;
        if (!messageReference) {
            ctx.sendMessage("Você precisa responder à mensagem que deseja reportar!");
            return;
        }

        const message = await ctx.channel.getMessage(messageReference);
        if (!message) {
            ctx.sendMessage("Não foi possível encontrar a mensagem reportada.");
            return;
        }

        // Impedir auto-report (exceto ID de exceção)
        if (ctx.author.id !== "733963304610824252" && ctx.author.id === message.author.id) {
            ctx.sendMessage("Você não pode reportar sua própria mensagem!");
            return;
        }

        await ctx.defer();

        let imageBuffer: Buffer | null = null;
        let imageMime: string | null = null;
        let imageParts: any[] = [];

        // Captura o anexo usando a TypedCollection do Oceanic.js
        const attachment = message.attachments.values().next().value as Attachment | undefined;

        if (attachment && attachment.contentType?.startsWith("image/")) {
            try {
                const response = await fetch(attachment.url);
                if (response.ok) {
                    imageBuffer = await response.buffer();
                    imageMime = attachment.contentType;
                    
                    imageParts.push({
                        inlineData: {
                            mimeType: imageMime,
                            data: imageBuffer.toString("base64")
                        }
                    });
                }
            } catch (err) {
                console.error("Erro ao processar imagem para IA:", err);
            }
        }

        const promptInstruction = `
            Você é um Moderador Automático do servidor Craftsapiens.
            Analise o texto e a imagem fornecida.
            
            REGRAS PARA BANIMENTO [ban]:
            - Divulgação de outros servidores de Minecraft/Discord.
            - Links ou imagens de sites de apostas (bets/cassinos).
            - Venda de contas, serviços externos ou anúncios comerciais.
            - Scams/Golpes.

            REGRAS PARA MUTE [sim]:
            - Ofensas graves, racismo, homofobia, doxxing ou bullying severo.

            SE SEGURO [não]:
            - Mensagens normais, dúvidas sobre o jogo ou sobre a própria Craftsapiens/Lojasquare.

            RESPONDA APENAS: "[ban] motivo", "[sim] motivo" ou "[não] motivo".
            Texto da mensagem: "${message.content || "[Apenas Imagem]"}"
        `;

        const data = {
            "model": process.env.AI_MODEL,
            "contents": [{
                "role": "user",
                "parts": [
                    ...imageParts,
                    { "text": promptInstruction }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 400
            }
        };

        try {
            const response = await fetch(process.env.AI_URL!, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `${process.env.AI_KEY}`
                },
                body: JSON.stringify(data)
            });

            const json: any = await response.json();
            const result = json.candidates?.[0]?.content?.parts?.[0]?.text || "[não] Erro na análise da IA.";

            // 1. CASO DE BANIMENTO PERMANENTE
            if (result.toLowerCase().includes("[ban]")) {
                const motivo = result.replace(/\[ban\]/gi, "").trim();

                await ctx.guild.createBan(message.author.id, {
                    deleteMessageDays: 7,
                    reason: `IA (Vendas/Divulgação): ${motivo}`
                });

                if (message) await message.delete();
                
                await this.sendLogs(ctx, message, "BANIMENTO PERMANENTE", motivo, "16711680", imageBuffer);
                ctx.sendMessage(`🚨 O usuário **${message.author.tag}** foi banido permanentemente.\n**Motivo:** \`${motivo}\``);
                return;
            }

            // 2. CASO DE MUTE (8 HORAS)
            if (result.toLowerCase().includes("[sim]")) {
                const motivo = result.replace(/\[sim\]/gi, "").trim();

                await message.member?.edit({ 
                    communicationDisabledUntil: new Date(Date.now() + 28800000).toISOString() 
                });

                if (message) await message.delete();

                await this.sendLogs(ctx, message, "MUTE AUTOMÁTICO (8H)", motivo, "16753920", imageBuffer);
                ctx.sendMessage(`A mensagem foi removida e o usuário silenciado por 8 horas.\n**Motivo:** \`${motivo}\``);
                return;
            }

            // 3. CASO SEGURO
            (ctx.msg as Message).createReaction("❌");
            const motivoNegado = result.replace(/\[não\]/gi, "").trim();
            ctx.sendMessage(`\`${motivoNegado}\`\n-# Lembre-se que abusar do sistema de reportar poderá resultar em punição.`);

        } catch (error) {
            console.error("Erro no comando report:", error);
            ctx.sendMessage("Erro interno ao contatar o serviço de análise.");
        }
    }

    private async sendLogs(ctx: CommandContext, message: Message, tipo: string, motivo: string, color: string, imageBuffer: Buffer | null) {
        const logChannelId = "940725594835025980";
        const channel = ctx.guild.channels.get(logChannelId);

        if (channel instanceof TextChannel) {
            const embed = new this.client.embed()
                .setTitle(`🚨 Moderação IA: ${tipo}`)
                .setColor(color)
                .setDescription(
                    `**Infrator:** ${message.author.mention} (\`${message.author.id}\`)\n` +
                    `**Reportado por:** ${ctx.author.mention}\n` +
                    `**Canal:** ${ctx.channel.mention}\n\n` +
                    `**Motivo Detectado:**\n\`\`\`${motivo}\`\`\`\n` +
                    `**Texto Original:**\n\`\`\`${message.content || "[Sem texto]"}\`\`\``
                )
                .setThumbnail(message.author.avatarURL())
                .setTimestamp();

            if (imageBuffer) {
                embed.setImage("attachment://evidencia.png");
                await channel.createMessage({
                    embeds: [embed],
                    files: [{ contents: imageBuffer, name: "evidencia.png" }]
                });
            } else {
                await channel.createMessage({ embeds: [embed] });
            }
        }
    }
}