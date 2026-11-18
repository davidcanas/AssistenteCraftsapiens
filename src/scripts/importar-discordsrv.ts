import "dotenv/config";
import { readFileSync } from "fs";
import { connect, disconnect } from "mongoose";
import { lerAccountsAof } from "../modules/vinculo/aof";
import { Vinculo } from "../modules/vinculo/model";

const USO = "Uso: npx ts-node --transpileOnly src/scripts/importar-discordsrv.ts <caminho-do-accounts.aof> [--gravar] [--so-ler]";

/** Tira discordId e uuid da operação que falhou; cai para a conta pelo índice se o formato for outro. */
function contaDoErro(erro: any, contas: { discordId: string; uuid: string }[]): { discordId?: string; uuid?: string } {
	const op = erro?.getOperation?.() ?? erro?.op ?? erro?.err?.op;
	// Update em lote: { q: filtro, u: atualização }; formato de bulkWrite: { filter, update }.
	const filtro = op?.q ?? op?.filter ?? op?.updateOne?.filter;
	const atualizacao = op?.u ?? op?.update ?? op?.updateOne?.update;
	const porIndice = typeof erro?.index === "number" ? contas[erro.index] : undefined;
	return {
		discordId: atualizacao?.$setOnInsert?.discordId ?? porIndice?.discordId,
		uuid: filtro?.uuid ?? porIndice?.uuid,
	};
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const caminho = args.find((a) => !a.startsWith("--"));
	const gravar = args.includes("--gravar");
	const soLer = args.includes("--so-ler");

	if (!caminho) {
		console.error(USO);
		process.exit(1);
	}

	// UUIDs sempre em minúsculas, como o modelo espera.
	const contas = lerAccountsAof(readFileSync(caminho, "utf8")).map((c) => ({
		discordId: c.discordId,
		uuid: c.uuid.toLowerCase(),
	}));
	console.log(`lidos ${contas.length}`);

	// Sai antes de conectar: nada toca o Mongo.
	if (soLer) return;

	await connect(process.env.MONGODB as string);

	// Garante que os índices únicos (uuid e discordId) existem antes de contar ou gravar;
	// sem eles o upsert poderia duplicar um discordId.
	try {
		await Vinculo.init();
	} catch (erro) {
		console.error("Erro: não foi possível criar/verificar os índices únicos da coleção vinculo. Nada foi gravado.");
		console.error(erro);
		await disconnect().catch(() => undefined);
		process.exit(1);
	}

	const existentes = await Vinculo.find({
		$or: [
			{ uuid: { $in: contas.map((c) => c.uuid) } },
			{ discordId: { $in: contas.map((c) => c.discordId) } },
		],
	}).select("uuid discordId").lean();
	const uuidsExistentes = new Set(existentes.map((e) => e.uuid));
	const discordsExistentes = new Set(existentes.map((e) => e.discordId));
	const jaExistentes = contas.filter((c) => uuidsExistentes.has(c.uuid) || discordsExistentes.has(c.discordId)).length;

	console.log(`novos ${contas.length - jaExistentes}`);
	console.log(`já existentes ${jaExistentes}`);

	if (!gravar) {
		console.log("Nada foi gravado (use --gravar para importar).");
		await disconnect();
		return;
	}

	const agora = new Date();
	let inseridos = 0;
	let jaPresentes = 0;
	let duplicados = 0;
	try {
		const resultado = await Vinculo.bulkWrite(
			contas.map((c) => ({
				updateOne: {
					filter: { uuid: c.uuid },
					update: {
						$setOnInsert: {
							discordId: c.discordId,
							uuid: c.uuid,
							nick: null,
							origem: "discordsrv",
							vinculadoEm: agora,
						},
					},
					upsert: true,
				},
			})),
			{ ordered: false },
		);
		inseridos = resultado.upsertedCount;
		jaPresentes = resultado.matchedCount;
	} catch (erro: any) {
		// Com ordered: false, as demais operações seguem; só as duplicadas falham.
		const erros: any[] = Array.isArray(erro?.writeErrors)
			? erro.writeErrors
			: erro?.writeErrors ? [erro.writeErrors] : [];
		// Sem erros de escrita, a falha foi de outro tipo (rede, permissão...): não dá para dizer que deu certo.
		if (erros.length === 0) throw erro;

		const conflitos = erros.filter((e) => (e.code ?? e.err?.code) === 11000);
		duplicados = conflitos.length;
		const outros = erros.length - duplicados;
		inseridos = erro.result?.upsertedCount ?? erro.result?.nUpserted ?? 0;
		jaPresentes = erro.result?.matchedCount ?? erro.result?.nMatched ?? 0;

		for (const conflito of conflitos) {
			const { discordId, uuid } = contaDoErro(conflito, contas);
			console.error(`conflito de chave duplicada: discordId=${discordId ?? "?"} uuid=${uuid ?? "?"}`);
		}
		if (outros > 0) {
			console.error(`Erros inesperados: ${outros}`);
			for (const e of erros.filter((x) => (x.code ?? x.err?.code) !== 11000)) {
				console.error(`  código ${e.code ?? e.err?.code}: ${e.errmsg ?? e.err?.errmsg ?? e.message}`);
			}
			process.exitCode = 1;
		}
	}

	console.log(`inseridos ${inseridos}`);
	console.log(`já presentes ${jaPresentes}`);
	console.log(`erros de chave duplicada ${duplicados}`);
	await disconnect();
}

main().catch(async (error) => {
	console.error(error);
	await disconnect().catch(() => undefined);
	process.exit(1);
});
