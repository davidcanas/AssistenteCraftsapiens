import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { Constants } from "oceanic.js";

function extractText(candidate: any): string {
    if (!candidate?.content?.parts?.length) return ""; // fallback se não houver parts
    return candidate.content.parts[0].text || "";
}

export default class AskTowny extends Command {
    constructor(client: Client) {
        super(client, {
            name: "asktowny",
            description: "Ajuda sobre Towny e EventWar (Docs + Configs)",
            category: "Util",
            aliases: ["townyhelp", "eventwar", "towny"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "pergunta",
                    description: "A sua dúvida sobre Towny ou EventWar",
                    required: true
                },
                {
                    type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
                    name: "imagem",
                    description: "Print do erro ou menu (opcional)",
                    required: false
                }
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        // --- 1. Processamento de Imagem ---
        let imagePart: any = null;
        const attachmentOption = ctx.args[1];
        const attachment = attachmentOption
            ? ctx.attachments.find(a => a.id === attachmentOption)
            : ctx.attachments[0];

        if (attachment) {
            try {
                const response = await fetch(attachment.url);
                if (!response.ok) throw new Error("Falha ao buscar a imagem");

                const mimeType = response.headers.get("content-type");
                if (!mimeType?.startsWith("image/")) {
                    ctx.sendMessage("O arquivo fornecido não é uma imagem válida!");
                    return;
                }

                const buffer = await response.buffer();
                imagePart = {
                    inlineData: {
                        mimeType: mimeType,
                        data: buffer.toString("base64")
                    }
                };
            } catch (error) {
                console.error("Erro ao processar imagem:", error);
                ctx.sendMessage("Erro ao processar a imagem anexada!");
                return;
            }
        }

        if (!ctx.args[0]) {
            ctx.args[0] = "[nenhuma pergunta feita]";
        }

        // --- 2. Leitura dos Arquivos (Configs + Docs) ---
        let townyConfigContent = "";
        let eventWarConfigContent = "";
        let townyDocsContent = "";

        try {
            // Caminhos dos arquivos (assumindo pasta ../../data/)
            const townyPath = path.resolve(__dirname, "../../data/config.yml");
            const eventWarPath = path.resolve(__dirname, "../../data/warconfig.yml");
            const docsPath = path.resolve(__dirname, "../../data/towny_docs.txt");

            // Ler Config Towny
            if (fs.existsSync(townyPath)) {
                townyConfigContent = fs.readFileSync(townyPath, "utf-8");
            } else {
                townyConfigContent = "Configuração do Towny (config.yml) não encontrada.";
            }

            // Ler Config EventWar
            if (fs.existsSync(eventWarPath)) {
                eventWarConfigContent = fs.readFileSync(eventWarPath, "utf-8");
            } else {
                eventWarConfigContent = "Configuração do EventWar (eventwar.yml) não encontrada.";
            }

            // Ler Documentação Geral
            if (fs.existsSync(docsPath)) {
                townyDocsContent = fs.readFileSync(docsPath, "utf-8");
            } else {
                townyDocsContent = "Documentação geral (towny_docs.txt) não encontrada.";
            }

        } catch (err) {
            console.error("Erro ao ler ficheiros de dados:", err);
            ctx.sendMessage("Ocorreu um erro interno ao ler as bases de conhecimento do servidor.");
            return;
        }

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `${process.env.AI_KEY}`
        };

        // --- 3. Construção do Prompt Inteligente ---
        const systemInstruction = `
            Você é o Especialista em Towny e EventWar do servidor Craftsapiens.
            
            FONTES DE INFORMAÇÃO:
            1. DOCUMENTAÇÃO (towny_docs.txt): Use para explicar conceitos, comandos e como as coisas funcionam.
            2. CONFIGURAÇÕES (config.yml / eventwar.yml): Use para citar valores EXATOS do servidor (preços, limites, regras ativadas/desativadas).

            DIRETRIZES:
            - Se o usuário perguntar um preço ou limite, IGNORE a documentação genérica e use OBRIGATORIAMENTE o valor que está no 'config.yml'.
            - Se a informação estiver na config, ela tem prioridade sobre a documentação.
            - Seja direto e útil.
            
            Informações do Usuário:
            - Nome: ${ctx.member.nick || ctx.member.user.globalName}
            - Data Atual: ${new Date().toISOString()}
        `;

        const parts = [];

        if (imagePart) {
            parts.push(imagePart);
        }

        parts.push({ text: systemInstruction });

        parts.push({ text: `=== INÍCIO DA DOCUMENTAÇÃO GERAL ===\n${townyDocsContent}\n=== FIM DA DOCUMENTAÇÃO ===` });
        parts.push({ text: `=== INÍCIO CONFIGURAÇÃO TÉCNICA (config.yml) ===\n${townyConfigContent}\n=== FIM CONFIG ===` });
        parts.push({ text: `=== INÍCIO CONFIGURAÇÃO GUERRA (warconfig.yml) ===\n${eventWarConfigContent}\n=== FIM CONFIG ===` });

        parts.push({ text: `\nPergunta do usuário: "${ctx.args.join(" ")}"` });

        const data = {
            "model": process.env.AI_MODEL,
            "contents": {
                "role": "user",
                "parts": parts
            },
            "generationConfig": {
                "maxOutputTokens": 800,
                "temperature": 0.4
            }
        };

        // --- 4. Envio para a API ---
        try {
            const response = await fetch(process.env.AI_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            });

            const json = await response.json();

            if (!json.candidates) {
                console.log("Erro API AI (JSON):", JSON.stringify(json, null, 2));
                ctx.sendMessage("Ocorreu um erro na IA. Verifique se os arquivos de configuração não são grandes demais para o modelo.");
                return;
            }



            const text = extractText(json.candidates[0]);

            const embed = new this.client.embed()
                .setColor("RANDOM")
                .setTitle("🏰 Assistente Towny")
                .setDescription(text)
                .setFooter("Baseado na Wiki e Configs do servidor");

            ctx.sendMessage({ embeds: [embed] });

        } catch (error) {
            console.error("Erro na requisição fetch:", error);
            ctx.sendMessage("Erro de conexão com o cérebro da IA.");
        }
    }
}