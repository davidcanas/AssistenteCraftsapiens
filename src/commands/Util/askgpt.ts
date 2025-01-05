import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";


export default class askGPT extends Command {
    constructor(client: Client) {
        super(client, {
            name: "ask",
            description: "Faça uma questão ao assistente",
            category: "Util",
            aliases: ["askgpt", "gpt"],
            options: [
                {
                    type: 3,
                    name: "pergunta",
                    description: "A pergunta a fazer ao assistente",
                    required: true
                }
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {

        await ctx.defer();

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
            "Authorization": `${process.env.GEMINI_KEY}`
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
        messages.push({ text: `Atualmente o Survival Geopolítico tem ${this.client.cache.towns.length} cidades ativas e ${this.client.cache.towns.filter(a => a.ruined).length} cidades em ruinas (no mundo geopolitico) ` });
        messages.push({ text: townyDocsMessages.join("\n") });
        messages.push({ text: `\nMensagem a responder: "${ctx.args.join(" ")}"` });

        const inputText = ctx.args.join(" ");

        function normalizeString(str: string) {
            return str.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        const detectedCities = this.client.cache.towns.filter(town => normalizeString(inputText).includes(normalizeString(town.name)));

        const mentionedResidents = this.client.cache.towns.reduce((acc, town) => {


            town.members.forEach(resident => {
                if (normalizeString(inputText).includes(normalizeString(resident))) {
                    acc.push({ resident, town });
                }

            });

            if (normalizeString(inputText).includes(normalizeString(town.mayor))) {

                if (!acc.some((item) => item.resident === town.mayor)) {
                    acc.push({ mayor: town.mayor, town });
                }
            }


            return acc;
        }, []);

        if (detectedCities.length > 0) {

            const townInfo = detectedCities.map(town => `${town.name}:\nPrefeito: ${town.mayor}\nCoordenadas: X: ${town.coords.x} Z: ${town.coords.z}\nNação: ${town.nation}\nHabitantes: ${town.members.length} (${town.members.join(", ")})\nEm ruínas: ${town.ruined}\n-`).join("\n");
            messages.push({ text: `Cidades mencionadas pelo jogador (ao calcular distâncias, omita os cálculos, diga diretamente o resultado):\n${townInfo}` });
        }

        if (mentionedResidents.length > 0) {
            const residentInfo = mentionedResidents.map(({ resident, town }) => `${resident} é residente de ${town.name}:\nPrefeito: ${town.mayor}\nCoordenadas: X: ${town.coords.x} Z: ${town.coords.z}\nNação: ${town.nation}\nHabitantes: ${town.members.length} (${town.members.join(", ")})\nEm ruínas: ${town.ruined}\n-`).join("\n");
            messages.push({ text: `Jogadores (habitantes) mencionados pelo jogador:\n${residentInfo}` });
        }

        const data = {
            "model": "gemini-2.0-flash-exp",
            "contents": {
                "role": "user",
                "parts": messages
            },
            "generationConfig": {
                "maxOutputTokens": 600,
            }
        };

        const response = await fetch(process.env.GEMINI_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        });

        const json = await response.json();
        console.log(json);
        if (!json.candidates) {
            ctx.sendMessage(`Olá, ${ctx.member.nick || ctx.member.user.globalName}, ocorreu um erro ao tentar processar a sua pergunta. Provavelmente é algum problema com a OpenIA. Tente novamente mais tarde!`);
            console.log(json.error.message)
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
