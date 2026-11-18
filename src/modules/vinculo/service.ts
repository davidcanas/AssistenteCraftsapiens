import type { Guild, Member } from "oceanic.js";
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

/** Membro da guilda ou `null` se ele saiu (ou se a busca falhou). */
async function obterMembro(client: DGClient, discordId: string): Promise<Member | null> {
	try {
		const guild = client.guilds.get(GUILD_ID);
		if (!guild) return null;
		return guild.members.get(discordId) ?? (await guild.getMember(discordId));
	} catch {
		return null;
	}
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
	const membro = await obterMembro(client, doc.discordId);
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

	for (const cargo of plano.adicionar) {
		try {
			await guild.addMemberRole(membro.id, cargo, MOTIVO_GRUPOS);
		} catch (erro) {
			console.error(`[VINCULO] Falha ao dar o cargo ${cargo} a ${membro.id}:`, erro);
		}
	}
	for (const cargo of plano.remover) {
		try {
			await guild.removeMemberRole(membro.id, cargo, MOTIVO_GRUPOS);
		} catch (erro) {
			console.error(`[VINCULO] Falha ao tirar o cargo ${cargo} de ${membro.id}:`, erro);
		}
	}

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

	const membro = await obterMembro(client, doc.discordId);
	if (membro) {
		for (const cargo of cargosDoDesvinculo(membro.roles)) {
			try {
				await membro.guild.removeMemberRole(membro.id, cargo, MOTIVO_DESVINCULO);
			} catch (erro) {
				console.error(`[VINCULO] Falha ao tirar o cargo ${cargo} de ${membro.id}:`, erro);
			}
		}
	}

	const resultado = await Vinculo.deleteOne({ uuid: chave });
	return { removido: resultado.deletedCount > 0 };
}
