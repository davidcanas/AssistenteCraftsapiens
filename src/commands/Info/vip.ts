import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { Constants } from "oceanic.js";

export default class vipCommand extends Command {
	constructor(client: Client) {
		super(client, {
			name: "vip",
			description: "Comandos relacionados a vip/premium/sapiens na craftsapiens",
			category: "Info",
			aliases: [],
			options: [
				{
					name: "topdoadores",
					description: "Veja o top doadores desse mês na craftsapiens",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: []
				},
				{
					name: "ultimascompras",
					description: "Veja as ultimas compras na craftsapiens",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: []
				},
				{
					name: "comprar",
					description: "Link do site para comprar vip/premium/sapiens na craftsapiens",
					type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
					options: []
				},
				{
					name: "testecupom",
					description: "Teste um cupom de desconto informando os descontos aplicados em Premium e em VIP",
					type: 1,
					options: [
						{
							type: Constants.ApplicationCommandOptionTypes.STRING,
							name: "cupom",
							description: "Cupom de desconto",
							required: true,
						}
					]
				}
			],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const fetch = await this.client.fetch("https://api.lojasquare.net/v1/transacoes/hooks", {
			method: "GET",
			headers: {
				"Authorization": "UjBxwOXMMc1A9Mk3ZdA18pIYyHvuwr"
			},
		}).then((res) => res.json());

		if (ctx.args[0] === "topdoadores") {

			const topDoadores = fetch.topCompradores.doadores.sort((a, b) => b.valor - a.valor).map((doador, index) => {
				return `**${index + 1}º | ${doador.player} - R$${doador.valor}**`;
			}).join("\n");


			const embed = new this.client.embed()
				.setTitle("<:craftsapiens:905025137869463552> TOP Doadores do mês - Craftsapiens")
				.setDescription(topDoadores)
				.setColor("RANDOM");

			ctx.sendMessage({
				embeds: [embed]
			});

			return;
		}
		if (ctx.args[0] === "ultimascompras") {
            
			const ultimasCompras = fetch.ultimasVendas.doadores.map((compra, index) => {
				return `**${index + 1}º | ${compra.player} - ${compra.item} - R$${compra.valor}**`;
			}).join("\n");

			const embed = new this.client.embed()
				.setTitle("<:craftsapiens:905025137869463552> Últimas compras - Craftsapiens")
				.setDescription(ultimasCompras)
				.setColor("RANDOM");

			ctx.sendMessage({
				embeds: [embed]
			});

			return;
		}

		if (ctx.args[0] === "comprar") {
			ctx.sendMessage({
				content: "<:craftsapiens:905025137869463552> [Clique aqui para comprar VIP/Premium/Sapiens](<https://craftsapiens.lojasquare.net/>)",
			});
			return;
		}
       
		if (ctx.args[0] === "testecupom") {
			const cupom = ctx.args[1];

			if (!cupom) {
				ctx.sendMessage("Você precisa informar um cupom para testar");
				return;
			}
			const testCupom = await this.client.fetch(`https://api.lojasquare.net/v1/cupons/${cupom}`, {
				method: "POST",
				headers: {
					"Authorization": "UjBxwOXMMc1A9Mk3ZdA18pIYyHvuwr",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					"carrinho": [
						{
							"id_produto": 6807,
							"quantidade": 1
						},
						{
							"id_produto": 6808,
							"quantidade": 1
						},
						{
							"id_produto": 6809,
							"quantidade": 1
						},
						{
							"id_produto": 6810,
							"quantidade": 1
						},
						{
							"id_produto": 6811,
							"quantidade": 1
						}
					]
				})
			}).then((res) => res.json());
			if(testCupom.msg === "cupom_nao_encontrado") {
				ctx.sendMessage("O cupom `" + cupom + "` não é um cupom válido!");
				return;
			}

			const embed = new this.client.embed()
				.setTitle("<:craftsapiens:905025137869463552> Teste de CUPOM")
				.setDescription(`O cupom \`${cupom}\` é válido e aplica um desconto de **${testCupom.cupomDesconto || 0}%** em sua compra!`)
				.addField("<:diamante:905024266880315412> Premium", `Original: R$${testCupom.carrinhoAtualizado[0].valorOriginal}\n Com cupom: R$${testCupom.carrinhoAtualizado[0].valorTotalProduto}`, true)
				.addField("⭐ VIP", `Original: R$${testCupom.carrinhoAtualizado[1].valorOriginal}\n Com cupom: R$${testCupom.carrinhoAtualizado[1].valorTotalProduto}`, true)
				.setColor("RANDOM");
 
			ctx.sendMessage({
				embeds: [embed]
			}); 

			return;
		}
        
		const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
	}
} 