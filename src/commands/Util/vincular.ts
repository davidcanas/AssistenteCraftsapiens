import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext, { Type } from "../../structures/CommandContext";
import { codigos, concluirVinculo } from "../../modules/vinculo";
import type { DecisaoVinculo } from "../../modules/vinculo";
import { normalizarCodigo } from "../../modules/vinculo/codigos";
import type { CommandInteraction, Message } from "oceanic.js";

const RESPOSTAS: Record<Exclude<DecisaoVinculo, "ok">, string> = {
	codigo_invalido: "❌ Código inválido ou vencido. Gere outro com /vincular no jogo.",
	discord_ja_vinculado: "❌ Sua conta do Discord já está vinculada. Para trocar, use /desvincular no jogo (ou peça a um staff, se perdeu a conta antiga).",
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
		// Pelo prefixo o código ficaria visível no chat: queima o código, apaga a mensagem e orienta a usar o comando de barra.
		if (ctx.type === Type.MESSAGE) {
			codigos.consumir(normalizarCodigo(ctx.args[0] ?? ""));
			await (ctx.msg as Message).delete().catch(() => null);
			await ctx.channel.createMessage({
				content: `<@${ctx.author.id}> Por segurança, use o comando de barra: \`/vincular codigo:<código>\`.`,
			}).catch(() => null);
			return;
		}

		const codigo = ctx.args[0] ?? "";
		const interacao = ctx.msg as CommandInteraction;

		// O Mongo pode passar dos 3 s da interação: adia já como efêmera (ctx.defer() não é efêmero).
		try {
			await interacao.defer(64);
		} catch (err) {
			console.error("[VINCULO] Falha ao adiar a resposta do /vincular:", err);
			return;
		}

		let content: string;
		try {
			const resultado = await concluirVinculo(this.client, ctx.author.id, codigo);
			content = resultado.decisao === "ok"
				? `✅ Conta vinculada a **${resultado.nick}**! Volte ao jogo: você vai receber o grupo verificado em alguns segundos.`
				: RESPOSTAS[resultado.decisao];
		} catch (err) {
			console.error("[VINCULO] Falha ao concluir o vínculo:", err);
			content = "❌ Não consegui concluir o vínculo agora. Tente de novo em instantes.";
		}

		try {
			await interacao.editOriginal({ content });
		} catch (err) {
			console.error("[VINCULO] Falha ao responder o /vincular:", err);
		}
	}
}
