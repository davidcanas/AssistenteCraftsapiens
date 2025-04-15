import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import fetch from "node-fetch";
import { Buffer } from "buffer";

export default class OCR extends Command {
    constructor(client: Client) {
        super(client, {
            name: "ocr",
            description: "Extrai texto de uma imagem usando OCR",
            category: "Util",
            options: [
                {
                    type: 11, 
                    name: "imagem",
                    description: "A imagem para extrair o texto",
                    required: false
                },
                {
                    type: 3, // STRING
                    name: "url",
                    description: "URL da imagem para extrair o texto",
                    required: false
                }
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        const imagemAttachment = ctx.args[0];
        const imagemUrl = ctx.args[1];

        if (!imagemAttachment && !imagemUrl) {
            ctx.sendMessage("Por favor, forneça uma imagem como anexo ou uma URL.");
            return;
        }

        let imageBuffer: Buffer;
        let mimeType: string;

        try {
            
            //const imageUrl = imagemAttachment ? imagemAttachment?.url : imagemUrl!;
            const response = await fetch(imageUrl);
            
            if (!response.ok) throw new Error("Falha ao buscar a imagem.");
            
            mimeType = response.headers.get("content-type") || "";
            if (!mimeType.startsWith("image/")) {
                ctx.sendMessage("O arquivo fornecido não é uma imagem válida.");
                return;
            }

            imageBuffer = await response.buffer();
        } catch (error) {
            console.error(error);
            ctx.sendMessage("Ocorreu um erro ao processar a imagem. Verifique o URL ou o anexo.");
            return;
        }

        const base64Data = imageBuffer.toString("base64");

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `${process.env.AI_KEY}`
        };

        const data = {
            "model": process.env.AI_MODEL,
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mimeType,
                                "data": base64Data
                            }
                        },
                        {
                            "text": "Transcreva o texto desta imagem com precisão. Inclua toda a formatação, símbolos especiais e mantenha a estrutura original."
                        }
                    ]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 2000,
                "temperature": 0.3
            }
        };

        try {
            const response = await fetch(process.env.AI_URL!, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            });

            const json = await response.json();
            
            if (!json.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error("Nenhum texto encontrado na imagem");
            }

            let extractedText = json.candidates[0].content.parts[0].text;

            if (extractedText.length > 4096) {
                extractedText = extractedText.substring(0, 4093) + "...";
            }

            const embed = new this.client.embed()
                .setColor("RANDOM")
                .setTitle("� OCR Resultado")
                .setDescription(`\`\`\`\n${extractedText}\n\`\`\``)
                .setFooter(`Solicitado por ${ctx.member?.nick || ctx.member?.user.globalName}`);

            ctx.sendMessage({ embeds: [embed] });

        } catch (error) {
            console.error("Erro no OCR:", error);
            ctx.sendMessage("Ocorreu um erro ao processar a imagem. Tente novamente com uma imagem mais clara.");
        }
    }
}