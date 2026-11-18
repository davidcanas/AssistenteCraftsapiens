import "dotenv/config";
import { readFileSync } from "fs";
import { connect, disconnect } from "mongoose";
import { lerAccountsAof } from "../modules/vinculo/aof";
import { Vinculo } from "../modules/vinculo/model";

const USO = "Uso: npx ts-node --transpileOnly src/scripts/importar-discordsrv.ts <caminho-do-accounts.aof> [--gravar] [--so-ler]";

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
	} catch (erro: any) {
		// Com ordered: false, as demais operações seguem; só as duplicadas falham.
		if (!erro?.writeErrors) throw erro;
		const erros: any[] = Array.isArray(erro.writeErrors) ? erro.writeErrors : [erro.writeErrors];
		duplicados = erros.filter((e) => (e.code ?? e.err?.code) === 11000).length;
		const outros = erros.length - duplicados;
		inseridos = erro.result?.upsertedCount ?? erro.result?.nUpserted ?? 0;
		if (outros > 0) console.error(`Erros inesperados: ${outros}`);
	}

	console.log(`inseridos ${inseridos}`);
	console.log(`erros de chave duplicada ${duplicados}`);
	await disconnect();
}

main().catch(async (error) => {
	console.error(error);
	await disconnect().catch(() => undefined);
	process.exit(1);
});
