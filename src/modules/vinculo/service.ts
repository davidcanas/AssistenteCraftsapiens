import { DiscordHTTPError, DiscordRESTError, JSONErrorCodes, type Guild, type Member } from "oceanic.js";
import type DGClient from "../../structures/Client";
import { cargosDoDesvinculo, normalizarGrupos, planejarCargos } from "./cargos";
import { CodigoStore, LimiteTentativas, decidirVinculo, normalizarCodigo, type DecisaoVinculo } from "./codigos";
import { GUILD_ID } from "./config";
import { Vinculo } from "./model";

const MOTIVO_GRUPOS = "Vínculo: sincronização de grupos";
const MOTIVO_VINCULO = "Vínculo: conta do Minecraft vinculada";
const MOTIVO_DESVINCULO = "Vínculo: conta do Minecraft desvinculada";

export const codigos = new CodigoStore();
export const tentativas = new LimiteTentativas();

/** O Discord confirmou que o membro não existe na guilda (HTTP 404 ou código 10007, Unknown Member). */
function membroInexistente(erro: unknown): boolean {
	if (erro instanceof DiscordRESTError) return erro.code === JSONErrorCodes.UNKNOWN_MEMBER || erro.status === 404;
	if (erro instanceof DiscordHTTPError) return erro.status === 404;
	return false;
}

/**
 * Membro da guilda ou `null` só quando o Discord confirma que ele não está nela.
 * Qualquer outra falha (ou guilda fora do cache) lança: a rota responde 500 e o plugin manda tentar de novo.
 */
async function obterMembro(client: DGClient, discordId: string): Promise<Member | null> {
	const guild = client.guilds.get(GUILD_ID);
	if (!guild) throw new Error(`[VINCULO] Guilda ${GUILD_ID} fora do cache`);
	const emCache = guild.members.get(discordId);
	if (emCache) return emCache;
	try {
		return await guild.getMember(discordId);
	} catch (erro) {
		if (membroInexistente(erro)) return null;
		throw erro;
	}
}

/** Trilha de auditoria: uma linha por membro cujos cargos mudaram de fato. */
function registrarMudanca(discordId: string, uuid: string, adicionados: string[], removidos: string[]): void {
	if (!adicionados.length && !removidos.length) return;
	console.log(`[VINCULO] ${discordId} uuid=${uuid} +[${adicionados.join(",")}] -[${removidos.join(",")}]`);
}

function nomeDoMembro(client: DGClient, discordId: string, membro: Member | null): string {
	return membro?.nick ?? membro?.user.username ?? client.users.get(discordId)?.username ?? discordId;
}

/** Erro de chave duplicada do Mongo (índice único). */
function ehChaveDuplicada(erro: any): boolean {
	return erro?.code === 11000;
}

async function trocarApelido(guild: Guild, membro: Member, nick: string | null, motivo: string): Promise<void> {
	if (!nick || membro.nick === nick) return;
	try {
		await guild.editMember(membro.id, { nick, reason: motivo });
	} catch (erro) {
		console.error(`[VINCULO] Falha ao trocar o apelido de ${membro.id}:`, erro);
	}
}

export async function statusVinculo(
	client: DGClient,
	uuid: string,
): Promise<{ vinculado: boolean; discordId?: string; discordNome?: string }> {
	const doc = await Vinculo.findOne({ uuid: uuid.toLowerCase() }).lean();
	if (!doc) return { vinculado: false };
	// Aqui o membro só serve para mostrar um nome: se o Discord oscilar, cai para o username em cache ou o id.
	let membro: Member | null = null;
	try {
		membro = await obterMembro(client, doc.discordId);
	} catch (erro) {
		console.warn(`[VINCULO] Não foi possível buscar o membro ${doc.discordId} para o nome; usando o fallback:`, erro);
	}
	return { vinculado: true, discordId: doc.discordId, discordNome: nomeDoMembro(client, doc.discordId, membro) };
}

export async function criarCodigo(
	client: DGClient,
	uuid: string,
	nick: string,
): Promise<{ codigo: string; expiraEm: number } | { vinculado: true; discordNome: string }> {
	const status = await statusVinculo(client, uuid);
	if (status.vinculado) return { vinculado: true, discordNome: status.discordNome ?? status.discordId };
	return codigos.gerar(uuid.toLowerCase(), nick);
}

export async function concluirVinculo(
	client: DGClient,
	discordId: string,
	codigoBruto: string,
): Promise<{ decisao: DecisaoVinculo; nick?: string }> {
	const codigo = normalizarCodigo(codigoBruto);
	const pendente = codigos.ver(codigo);

	const [discordExiste, uuidExiste] = await Promise.all([
		Vinculo.exists({ discordId }),
		pendente ? Vinculo.exists({ uuid: pendente.uuid }) : Promise.resolve(null),
	]);

	const decisao = decidirVinculo({
		bloqueado: tentativas.bloqueado(discordId),
		pendente,
		discordJaVinculado: !!discordExiste,
		uuidJaVinculado: !!uuidExiste,
	});

	if (decisao === "codigo_invalido") tentativas.registrarErro(discordId);
	if (decisao !== "ok") return { decisao };

	try {
		await Vinculo.create({
			discordId,
			uuid: pendente.uuid,
			nick: pendente.nick,
			origem: "assistente",
			vinculadoEm: new Date(),
		});
	} catch (erro: any) {
		// Corrida: outro vínculo entrou entre a checagem e a criação.
		if (ehChaveDuplicada(erro)) {
			return { decisao: erro.keyPattern?.uuid ? "uuid_ja_vinculado" : "discord_ja_vinculado" };
		}
		throw erro;
	}
	codigos.consumir(codigo);

	try {
		const membro = await obterMembro(client, discordId);
		if (membro) await trocarApelido(membro.guild, membro, pendente.nick, MOTIVO_VINCULO);
	} catch (erro) {
		console.error(`[VINCULO] Falha ao trocar o apelido de ${discordId}:`, erro);
	}

	return { decisao: "ok", nick: pendente.nick };
}

export async function aplicarGrupos(
	client: DGClient,
	uuid: string,
	nick: string,
	grupos: string[],
): Promise<{ aplicado: boolean }> {
	const chave = uuid.toLowerCase();
	const doc = await Vinculo.findOne({ uuid: chave }).lean();
	if (!doc) return { aplicado: false };
	const membro = await obterMembro(client, doc.discordId);
	if (!membro) return { aplicado: false };

	const guild = membro.guild;
	const plano = planejarCargos(normalizarGrupos(grupos), membro.roles);

	const adicionados: string[] = [];
	const removidos: string[] = [];
	for (const cargo of plano.adicionar) {
		try {
			await guild.addMemberRole(membro.id, cargo, MOTIVO_GRUPOS);
			adicionados.push(cargo);
		} catch (erro) {
			console.error(`[VINCULO] Falha ao dar o cargo ${cargo} a ${membro.id}:`, erro);
		}
	}
	for (const cargo of plano.remover) {
		try {
			await guild.removeMemberRole(membro.id, cargo, MOTIVO_GRUPOS);
			removidos.push(cargo);
		} catch (erro) {
			console.error(`[VINCULO] Falha ao tirar o cargo ${cargo} de ${membro.id}:`, erro);
		}
	}
	registrarMudanca(membro.id, chave, adicionados, removidos);

	await trocarApelido(guild, membro, nick, MOTIVO_GRUPOS);

	if (doc.nick !== nick) {
		try {
			await Vinculo.updateOne({ uuid: chave }, { $set: { nick } });
		} catch (erro) {
			console.error(`[VINCULO] Falha ao gravar o nick de ${chave}:`, erro);
		}
	}

	return { aplicado: true };
}

export async function desvincular(client: DGClient, uuid: string): Promise<{ removido: boolean }> {
	const chave = uuid.toLowerCase();
	const doc = await Vinculo.findOne({ uuid: chave }).lean();
	if (!doc) return { removido: false };

	// Se a busca do membro falhar, lança antes de apagar: o vínculo continua e o plugin tenta de novo.
	const membro = await obterMembro(client, doc.discordId);
	if (membro) {
		const removidos: string[] = [];
		for (const cargo of cargosDoDesvinculo(membro.roles)) {
			try {
				await membro.guild.removeMemberRole(membro.id, cargo, MOTIVO_DESVINCULO);
				removidos.push(cargo);
			} catch (erro) {
				console.error(`[VINCULO] Falha ao tirar o cargo ${cargo} de ${membro.id}:`, erro);
			}
		}
		registrarMudanca(membro.id, chave, [], removidos);
	}

	const resultado = await Vinculo.deleteOne({ uuid: chave });
	return { removido: resultado.deletedCount > 0 };
}
