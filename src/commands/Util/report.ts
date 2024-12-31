import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Message, TextChannel } from "oceanic.js";

export default class silentClassClass extends Command {
    constructor(client: Client) {
        super(client, {
            name: "report",
            description: "Reporte uma mensagem ofensiva, sendo esta antes, analisada por IA",
            category: "Util",
            aliases: ["reportar", "r", "denunciar"],
            options: [],

        });
    }

    async execute(ctx: CommandContext): Promise<void> {

        if (ctx.type === 1) {
            ctx.sendMessage({content: "Você não pode executar este comando usando `/report`, ao invés disso, use `-report`, respondendo à mensagem que você pretende denunciar\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!", flags: 1 << 6});
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

        if(ctx.author.id !== "733963304610824252" && ctx.author.id === message.author.id) {
            const msg = await ctx.sendMessage("Você não pode reportar sua própria mensagem!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");

            setTimeout(() => {
                if (ctx.msg) (ctx.msg as Message).delete();
                if (msg) msg.delete();
                return;
            }, 10000);
        }
        
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GPT_KEY}`
        };

        const messages = [
            {
                role: "user",
                content: `Responda apenas com [sim] ou [não] e com o tipo de infração de forma curta e explicativa. A seguinte mensagem tem carácter extremamente ofensivo? \n"${message.content}"`
            },
            {
                role: "system",
                content: `Você é um modelo de IA especializado em detectar mensagens ofensivas. Sua função é identificar ofensas direcionadas a indivíduos ou grupos com base em critérios como raça, etnia, religião, orientação sexual, identidade de gênero, deficiência ou qualquer outra característica que possa ser usada como base para discriminação ou preconceito. Insultos genéricos ou críticas que não contenham contexto discriminatório ou ataques direcionados a grupos vulneráveis não devem ser interpretados como ofensas graves. Seja preciso e objetivo em sua análise, priorizando a proteção contra discursos que promovam ódio ou preconceito.`
            }
        ];

        const data = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.2
        };

        const response = await fetch(process.env.GPT_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        });

        const json: any = await response.json();

        if (json.error) {
            ctx.sendMessage("Ocorreu um erro ao tentar analisar a mensagem, por favor aguarde o <@733963304610824252>!\n-# Lembre-se que abusar do sistema de reportar poderá impedir você de fazer novas denúncias no futuro!");
            return;
        }

        const result = json.choices[0].message.content;

        if (result.toLowerCase().includes("sim")) {

            message.member?.edit({ communicationDisabledUntil: new Date(Date.now() + 28800000).toISOString() })

            if (message) {
                await message.delete();
            }

            const embed = new this.client.embed()
                .setTitle("Conteúdo inadequado reportado")
                .setDescription(`<:report:1307789599279546419> **Reportado por:** ${ctx.author.mention} (${ctx.author.id})\n\n <:Steve:905024599274684477> **Usuário**: ${message.author.mention} (${message.author.id}) \n\n<:canal:1307789443628793988> **Canal**: ${ctx.channel.mention}\n\n<:text:1308134831946862732> **Motivo:**\n\`\`\`\n${result.replace("[sim] ", "")}\n\`\`\`\n<:message:1307790289343090738> **Mensagem** (<t:${Math.floor(new Date(message.timestamp).getTime() / 1000)}:R>):\n\`\`\`\n${message.content}\n\`\`\``)
                .setColor("16711680")
                .setFooter("A mensagem foi identificada como ofensiva e foi removida. O usuário foi silenciado temporariamente por 8 horas.")
                .setThumbnail(`${message.author.avatarURL()}`)
                .setTimestamp();

            const channel = ctx.guild.channels.get("940725594835025980");

            (channel as TextChannel).createMessage({ embeds: [embed] });

            const msg = await ctx.sendMessage("A mensagem foi identificada como ofensiva e foi removida. O usuário foi silenciado temporariamente por 8 horas enquanto o caso é analisado por um administrador, que determinará se serão aplicadas punições adicionais.\nMotivo: `" + result.replace("[sim] ", "") + "`\n-# Lembre-se: o uso indevido do sistema de denúncias pode resultar na restrição do seu acesso a essa funcionalidade no futuro. Utilize-o de forma responsável!");

            setTimeout(() => {
                if (ctx.msg) (ctx.msg as Message).delete();
                if (msg) msg.delete();
            }, 60000);

            return;
        } else {
            (ctx.msg as Message).createReaction("❌");
            return;
        }





    }
}
