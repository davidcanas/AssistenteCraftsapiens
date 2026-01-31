import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Message, TextChannel, Attachment } from "oceanic.js";
import fetch from "node-fetch";
import { Buffer } from "buffer";

export default class ReportCommand extends Command {
    constructor(client: Client) {
        super(client, {
            name: "report",
            description: "Reporte uma mensagem ofensiva ou divulgação (incluindo imagens), analisada por IA",
            category: "Util",
            aliases: ["reportar", "r", "denunciar"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        if (ctx.type === 1) {
            ctx.sendMessage({ content: "Você não pode executar este comando usando `/report`, use `-report` respondendo à mensagem.", flags: 1 << 6 });
            return;
        }

        const messageID = (ctx.msg as Message).messageReference?.messageID;
        if (!messageID) {
            ctx.sendMessage("Você precisa responder à mensagem que deseja reportar!");
            return;
        }

        const message = await ctx.channel.getMessage(messageID);
        if (!message) {
            ctx.sendMessage("Não foi possível encontrar a mensagem reportada.");
            return;
        }

        if (ctx.author.id !== "733963304610824252" && ctx.author.id === message.author.id) {
            ctx.sendMessage("Você não pode reportar sua própria mensagem!");
            return;
        }

        await ctx.defer(); // Defer pois o processo de imagem + IA pode demorar

        let imageParts: any[] = [];
        let ocrText = "";

        // Verificação de anexo para OCR
        const attachment = message.attachments?.[0];
        if (attachment && attachment.contentType?.startsWith("image/")) {
            try {
                const response = await fetch(attachment.url);
                const buffer = await response.buffer();
                const base64Data = buffer.toString("base64");
                
                imageParts.push({
                    inlineData: {
                        mimeType: attachment.contentType,
                        data: base64Data
                    }
                });
            } catch (err) {
                console.error("Erro ao baixar imagem para OCR:", err);
            }
        }

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `${process.env.AI_KEY}`
        };

        const promptInstruction = `
            Você é um Moderador de Segurança do servidor 'Craftsapiens'.
            Analise o conteúdo (texto e imagem se houver).
            
            REGRAS PARA BANIMENTO PERMANENTE [ban]:
            - Divulgação explicita de outros servidores, links de apostas (bets), venda de contas, serviços externos, scam ou qualquer anúncio comercial não autorizado.
            
            REGRAS PARA MUTE [sim]:
            - Ofensas graves, racismo, homofobia, doxxing.
            
            SE SEGURO [não]:
            - Conteúdo relacionado à Craftsapiens ou conversas normais.

            FORMATO DA RESPOSTA:
            Responda APENAS: "[ban] motivo", "[sim] motivo" ou "[não] motivo".
            Mensagem de texto a analisar: "${message.content || "Sem texto"}"
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
            "generationConfig": { "temperature": 0.2, "maxOutputTokens": 600 }
        };

        try {
            const response = await fetch(process.env.AI_URL!, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            });

            const json: any = await response.json();
            const result = json.candidates?.[0]?.content?.parts?.[0]?.text || "[não] Erro na análise";

            if (result.toLowerCase().includes("[ban]")) {
                const motivo = result.replace(/\[ban\]/gi, "").trim();

                // BANIR: deleteMessageDays: 7 apaga as mensagens dos últimos 7 dias
                await ctx.guild.createBan(message.author.id, {
                    deleteMessageDays: 7,
                    reason: `IA Moderação: ${motivo}`
                });

                this.sendLogs(ctx, message, "BANIMENTO PERMANENTE", motivo, "16711680");
                ctx.sendMessage(`🚨 O usuário **${message.author.tag}** foi BANIDO permanentemente por Divulgação/Vendas.\n**Motivo:** \`${motivo}\``);
                return;
            }

            // LÓGICA DE PUNIÇÃO: MUTE (Ofensas)
            if (result.toLowerCase().includes("[sim]")) {
                const motivo = result.replace(/\[sim\]/gi, "").trim();
                
                await message.member?.edit({ communicationDisabledUntil: new Date(Date.now() + 28800000).toISOString() });
                if (message) await message.delete();

                this.sendLogs(ctx, message, "MUTE (8H)", motivo, "16753920");
                ctx.sendMessage(`A mensagem foi removida e o usuário silenciado por 8 horas.\n**Motivo:** \`${motivo}\``);
                return;
            }

            (ctx.msg as Message).createReaction("❌");
            ctx.sendMessage(`Relatório negado pela IA: \`${result.replace(/\[não\]/gi, "").trim()}\``);

        } catch (error) {
            console.error(error);
            ctx.sendMessage("Erro ao processar a denúncia.");
        }
    }

    private sendLogs(ctx: CommandContext, message: Message, tipo: string, motivo: string, color: string) {
        const logChannelId = "940725594835025980";
        const channel = ctx.guild.channels.get(logChannelId);
        if (channel instanceof TextChannel) {
            const embed = new this.client.embed()
                .setTitle(`🚨 ${tipo}`)
                .setColor(color)
                .setDescription(`**Autor:** ${message.author.mention}\n**Reportado por:** ${ctx.author.mention}\n**Motivo:** ${motivo}\n**Conteúdo:** \`\`\`${message.content || "[Imagem/Sem texto]"}\`\`\``)
                .setTimestamp();
            channel.createMessage({ embeds: [embed] });
        }
    }
}