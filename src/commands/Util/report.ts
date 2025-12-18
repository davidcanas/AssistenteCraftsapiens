import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Message, TextChannel } from "oceanic.js";
import fetch from "node-fetch"; // Certifique-se de importar o fetch se não for global

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

        if (ctx.type === 1) {
            ctx.sendMessage({ content: "Você não pode executar este comando usando `/report`, ao invés disso, use `-report`, respondendo à mensagem que você pretende denunciar\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!", flags: 1 << 6 });
            return;
        }

        if (!(ctx.msg as Message).messageReference?.messageID) {
            ctx.sendMessage("Você precisa responder à mensagem que deseja reportar!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");
            return;
        }

        const message = await ctx.channel.getMessage((ctx.msg as Message).messageReference?.messageID);

        if (!message) {
            ctx.sendMessage("Não foi possível encontrar a mensagem que você deseja reportar!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");
            return;
        }

        // Verifica se é o próprio autor (exceto se for o ID de exceção)
        if (ctx.author.id !== "733963304610824252" && ctx.author.id === message.author.id) {
            const msg = await ctx.sendMessage("Você não pode reportar sua própria mensagem!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");

            setTimeout(() => {
                if (ctx.msg) (ctx.msg as Message).delete();
                if (msg) msg.delete();
                return;
            }, 10000);
            return; // Adicionado return para parar a execução
        }

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `${process.env.AI_KEY}`
        };

        // --- PROMPT ATUALIZADO ---
        // Agora inclui regras para detectar Divulgação (Ads) e Ofensas
        const promptInstruction = `
            Você é um Moderador de Segurança Automático do servidor de Minecraft 'Craftsapiens'.
            Sua tarefa é analisar a mensagem de um jogador e decidir se ela viola as regras graves.
            
            CRITÉRIOS PARA PUNIÇÃO (Responda [sim]):
            1. OFENSAS: Discurso de ódio, racismo, homofobia, ameaças reais ou bullying severo. (Ignore "KKK" ou insultos leves sem contexto discriminatório).
            2. DIVULGAÇÃO (ADS): Convites de outros servidores de Discord, IPs de outros servidores de Minecraft, links suspeitos, ou venda de serviços externos/contas.
            3. Exposição de dados pessoais (doxxing): Não tolere qualquer tentativa de compartilhar informações privadas sem consentimento de terceiros. Ex: endereços, CPF, números de telefone, etc.
            CRITÉRIOS DE SEGURANÇA (Responda [não]):
            - Se a divulgação for sobre a própria 'Craftsapiens', 'Lojasquare' ou parceiros oficiais, NÃO puna.
            - Dúvidas sobre o jogo não são infrações.

            FORMATO DA RESPOSTA:
            Responda estritamente com: "[sim] Com o Motivo para a punição" ou "[não] Com o Motivo para a punição".
            Exemplo: "[sim] Divulgação de servidor externo" ou "[não] Mensagem inofensiva".
            Mensagem a analisar: "${message.content}"
        `;

        const messages = [
            {
                role: "user",
                parts: [{ "text": promptInstruction }]
            }
        ];

        const data = {
            "model": process.env.AI_MODEL,
            "contents": messages,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 400,
                "thinkingConfig": {
                    "thinkingLevel": "medium"
                }
            }
        };

        try {
            const response = await fetch(process.env.AI_URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data)
            });

            const json: any = await response.json();

            if (!json.candidates) {
                ctx.sendMessage("Ocorreu um erro ao tentar analisar a mensagem, por favor aguarde o <@733963304610824252>!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");
                console.log("Erro AI:", json);
                return;
            }

            const result = json.candidates[0].content.parts[0].text;

            if (result.toLowerCase().includes("[sim]")) {

                // Mute de 8 horas (28800000 ms)
                message.member?.edit({ communicationDisabledUntil: new Date(Date.now() + 28800000).toISOString() });

                if (message) {
                    await message.delete();
                }

                console.log(result);
                const motivoLimpo = result.replace(/\[sim\]/gi, "").trim();

                const embed = new this.client.embed()
                    .setTitle("🚨 Infração Detectada")
                    .setDescription(`<:report:1307789599279546419> **Reportado por:** ${ctx.author.mention} (${ctx.author.id})\n\n <:Steve:905024599274684477> **Infrator**: ${message.author.mention} (${message.author.id}) \n\n<:canal:1307789443628793988> **Canal**: ${ctx.channel.mention}\n\n<:text:1308134831946862732> **Motivo da IA:**\n\`\`\`\n${motivoLimpo}\n\`\`\`\n<:message:1307790289343090738> **Mensagem Original** (<t:${Math.floor(new Date(message.timestamp).getTime() / 1000)}:R>):\n\`\`\`\n${message.content}\n\`\`\``)
                    .setColor("16711680") // Vermelho
                    .setFooter("Usuário silenciado automaticamente por 8h. Aguardando revisão da Staff.")
                    .setThumbnail(`${message.author.avatarURL()}`)
                    .setTimestamp();

                const logChannelId = "940725594835025980"; // Canal de Logs
                const channel = ctx.guild.channels.get(logChannelId);

                if (channel && channel instanceof TextChannel) {
                    channel.createMessage({ embeds: [embed] });
                }

                const msg = await ctx.sendMessage(`A mensagem foi removida e o usuário silenciado temporariamente por 8 horas.\n**Motivo:** \`${motivoLimpo}\`\n-# O caso será analisado por um administrador.`);

                setTimeout(() => {
                    if (msg) msg.delete();
                    if (ctx.msg) (ctx.msg as Message).delete();
                }, 60000);

                return;
            } else {
                (ctx.msg as Message).createReaction("❌");
                // envia o motivo para não punir
                console.log(result);
                ctx.sendMessage(`Motivo para não punir: ${result.replace(/\[não\]/gi, "").trim()}`);
                return;
            }

        } catch (error) {
            console.error("Erro no comando report:", error);
            ctx.sendMessage("Erro interno ao contatar o serviço de análise.");
        }
    }
}