import "dotenv/config";
import { connect, disconnect } from "mongoose";

async function main(): Promise<void> {
	if (process.env.DEVELOPMENT !== "true") {
		console.log("Recusado: seed:test só roda com DEVELOPMENT=true.");
		process.exit(1);
	}

	const guildId = process.env.GUILD_ID;
	if (!guildId) {
		console.error("Erro: defina GUILD_ID no .env.");
		process.exit(1);
	}

	await connect(process.env.MONGODB as string);

	const { default: globalDB } = await import("../models/globalDB");
	const existente = await globalDB.findOne({ id: guildId });
	if (!existente) await globalDB.create({ id: guildId });

	console.log(`Documento global criado/já existia para ${guildId}.`);
	await disconnect();
}

main().catch(async (error) => {
	console.error(error);
	await disconnect().catch(() => undefined);
	process.exit(1);
});
