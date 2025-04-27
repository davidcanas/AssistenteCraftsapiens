import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { Constants } from "oceanic.js";

export default class askGPT extends Command {
    constructor(client: Client) {
        super(client, {
            name: "ask",
            description: "Faça uma questão ao assistente",
            category: "Util",
            aliases: ["askgpt", "gpt"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "pergunta",
                    description: "A pergunta a fazer ao assistente",
                    required: true
                },
                {
                    type: Constants.ApplicationCommandOptionTypes.ATTACHMENT, // ATTACHMENT
                    name: "imagem",
                    description: "Imagem relacionada à pergunta",
                    required: false
                }
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

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
            ctx.args[0] = "[mencionou]";
        }

        const db = await this.client.db.staff.find({});
        const staffs = db.map((staff) => `(${staff.role}) ${staff.nick}`).join("; ");

        const linksUteis = [
            { name: "Site oficial da craftsapiens", value: "https://craftsapiens.com.br" },
            { name: "Loja da craftsapiens (apenas dá para comprar premium,vip, ou sapiens)", value: "https://craftsapiens.lojasquare.net" },
            { name: "Mapa", value: "http://jogar.craftsapiens.com.br:50024/mapa" },
            { name: "Código do Assistente (github)", value: "https://github.com/davidcanas/AssistenteCraftsapiens" },
            { name: "Textura do Slimefun (opcional, Java)", value: "https://bit.ly/craftsapiens-textura" }
        ];
        const usefulLinks = linksUteis.map(link => `${link.name} - ${link.value}`).join(", ");

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `${process.env.AI_KEY}`
        };

        const userMessagesPath = path.resolve(__dirname, "../../data/system_context.txt");
        const userMessages = fs.readFileSync(userMessagesPath, "utf-8").split("\n").filter(line => line.trim());

        const townyDocsPath = path.resolve(__dirname, "../../data/towny_docs.txt");
        const townyDocsMessages = fs.readFileSync(townyDocsPath, "utf-8").split("\n").filter(line => line.trim());

        const timestamp = new Date().toISOString();
        const messages = userMessages.map(content => ({
            text: content
                .replace("{member_name}", ctx.member.nick || ctx.member.user.globalName)
                .replace("{member_role}", this.client.getHighestRole(ctx.guild, ctx.member.id))
                .replace("{channel_id}", ctx.channel.id)
                .replace("{channel_category}", ctx.channel.parent?.name || "Sem categoria")
                .replace("{staffs}", staffs)
                .replace("{useful_links}", usefulLinks)
                .replace("{timestamp}", timestamp)
        }));
        messages.push({ text: townyDocsMessages.join("\n") });
        messages.push({ text: `\nMensagem a responder: "${ctx.args.join(" ")}"` });

        const parts = [];
        if (imagePart) {
            parts.push(imagePart);
        }
        parts.push(...messages.map(msg => ({ text: msg.text })));

        const data = {
            "model": process.env.AI_MODEL,
            "contents": {
                "role": "user",
                "parts": parts
            },
            "generationConfig": {
                "maxOutputTokens": 600,
                "temperature": 0.5
            }
        };

        const response = await fetch(process.env.AI_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        });

        const json = await response.json();
        console.log(json);
        if (!json.candidates) {
            ctx.sendMessage(`Olá, ${ctx.member.nick || ctx.member.user.globalName}, ocorreu um erro ao tentar processar a sua pergunta. Provavelmente é algum problema com a OpenIA. Tente novamente mais tarde!`);
            console.log(json.error.message);
            return;
        }

        if (json.candidates[0].content.parts[0].text.includes("timeout_member")) {
            ctx.member.edit({ communicationDisabledUntil: new Date(Date.now() + 3600000).toISOString() });
            json.candidates[0].content.parts[0].text = json.candidates[0].content.parts[0].text.replace("[timeout_member]", " ");
        }

        const embed = new this.client.embed()
            .setColor("RANDOM")
            .setDescription(json.candidates[0].content.parts[0].text);
        ctx.sendMessage({ embeds: [embed] });
    }
}