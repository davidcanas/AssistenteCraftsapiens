import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext, { Type } from "../../structures/CommandContext";
import { concluirVinculo } from "../../modules/vinculo";
import type { DecisaoVinculo } from "../../modules/vinculo";
import type { Message } from "oceanic.js";

const RESPOSTAS: Record<Exclude<DecisaoVinculo, "ok">, string> = {
	codigo_invalido: "❌ Código inválido ou vencido. Gere outro com /vincular no jogo.",
	discord_ja_vinculado: "❌ Sua conta do Discord já está vinculada. Para trocar, use /desvincular no jogo.",
	uuid_ja_vinculado: "❌ Essa conta do jogo já está vinculada a outro Discord.",
	limite: "⏳ Muitas tentativas erradas. Espere 10 minutos e tente de novo.",
};

export default class Vincular extends Command {
	constructor(client: Client) {
		super(client, {
			name: "vincular",
			description: "Vincula sua conta do Discord à conta do Minecraft usando o código do jogo",
			category: "Util",
			aliases: [],
			options: [
				{
					type: 3,
					name: "codigo",
					description: "Código recebido ao usar /vincular no Minecraft",
					required: true,
				},
			],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		// Pelo prefixo o código ficaria visível no chat: apaga a mensagem e orienta a usar o comando de barra.
		if (ctx.type === Type.MESSAGE) {
			await (ctx.msg as Message).delete().catch(() => null);
			await ctx.channel.createMessage({
				content: `<@${ctx.author.id}> Por segurança, use o comando de barra: \`/vincular codigo:<código>\`.`,
			}).catch(() => null);
			return;
		}

		const codigo = ctx.args[0] ?? "";

		let resultado: { decisao: DecisaoVinculo; nick?: string };
		try {
			resultado = await concluirVinculo(this.client, ctx.author.id, codigo);
		} catch (err) {
			console.error("[VINCULO] Falha ao concluir o vínculo:", err);
			ctx.sendMessage({
				content: "❌ Não consegui concluir o vínculo agora. Tente de novo em instantes.",
				flags: 64,
			});
			return;
		}

		if (resultado.decisao === "ok") {
			ctx.sendMessage({
				content: `✅ Conta vinculada a **${resultado.nick}**! Volte ao jogo: você vai receber o grupo verificado em alguns segundos.`,
				flags: 64,
			});
			return;
		}

		ctx.sendMessage({ content: RESPOSTAS[resultado.decisao], flags: 64 });
	}
}
