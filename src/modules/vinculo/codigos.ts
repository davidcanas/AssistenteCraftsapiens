import { randomInt } from "node:crypto";
import { ALFABETO, JANELA_TENTATIVAS_MS, MAX_TENTATIVAS, TAMANHO_CODIGO, VALIDADE_CODIGO_MS } from "./config";

export function normalizarCodigo(bruto: string): string {
	return bruto.replace(/\s+/g, "").toUpperCase();
}

interface Pendente {
	uuid: string;
	nick: string;
	expiraEm: number;
}

/** Códigos pendentes em memória: perder no restart é aceitável (vale 10 minutos). */
export class CodigoStore {
	private porCodigo = new Map<string, Pendente>();
	private porUuid = new Map<string, string>();

	/**
	 * @param agora relógio em ms (injetável para teste)
	 * @param aleatorio número em [0, 1); o padrão usa crypto.randomInt (injetável só para teste)
	 */
	constructor(
		private agora: () => number = Date.now,
		private aleatorio: () => number = () => randomInt(0, 2 ** 32) / 2 ** 32,
	) {}

	/** Quantidade de códigos pendentes guardados (inclui vencidos ainda não varridos). */
	get tamanho(): number {
		return this.porCodigo.size;
	}

	gerar(uuid: string, nick: string): { codigo: string; expiraEm: number } {
		this.limparVencidos();
		const anterior = this.porUuid.get(uuid);
		if (anterior) this.porCodigo.delete(anterior);

		let codigo: string;
		do {
			codigo = "";
			for (let i = 0; i < TAMANHO_CODIGO; i++) {
				codigo += ALFABETO[Math.floor(this.aleatorio() * ALFABETO.length)];
			}
		} while (this.porCodigo.has(codigo));

		const expiraEm = this.agora() + VALIDADE_CODIGO_MS;
		this.porCodigo.set(codigo, { uuid, nick, expiraEm });
		this.porUuid.set(uuid, codigo);
		return { codigo, expiraEm };
	}

	/** Consulta sem consumir; código vencido ou desconhecido dá `null`. */
	ver(codigo: string): { uuid: string; nick: string } | null {
		const chave = normalizarCodigo(codigo);
		const pendente = this.porCodigo.get(chave);
		if (!pendente) return null;
		if (this.agora() > pendente.expiraEm) {
			this.remover(chave, pendente);
			return null;
		}
		return { uuid: pendente.uuid, nick: pendente.nick };
	}

	consumir(codigo: string): void {
		const chave = normalizarCodigo(codigo);
		const pendente = this.porCodigo.get(chave);
		if (pendente) this.remover(chave, pendente);
	}

	/** Apaga os códigos vencidos dos dois Maps, para a memória não crescer com códigos que ninguém usou. */
	private limparVencidos(): void {
		const agora = this.agora();
		for (const [codigo, pendente] of this.porCodigo) {
			if (agora > pendente.expiraEm) this.remover(codigo, pendente);
		}
	}

	private remover(codigo: string, pendente: Pendente): void {
		this.porCodigo.delete(codigo);
		if (this.porUuid.get(pendente.uuid) === codigo) this.porUuid.delete(pendente.uuid);
	}
}

/** Limita tentativas erradas por usuário do Discord numa janela deslizante. */
export class LimiteTentativas {
	private erros = new Map<string, number[]>();

	constructor(private agora: () => number = Date.now) {}

	/** Quantidade de usuários com erros guardados. */
	get tamanho(): number {
		return this.erros.size;
	}

	bloqueado(discordId: string): boolean {
		this.limparAntigos();
		return this.recentes(discordId).length >= MAX_TENTATIVAS;
	}

	registrarErro(discordId: string): void {
		this.limparAntigos();
		const lista = this.recentes(discordId);
		lista.push(this.agora());
		this.erros.set(discordId, lista);
	}

	/** Descarta os usuários cujos erros saíram todos da janela. */
	private limparAntigos(): void {
		const limite = this.agora() - JANELA_TENTATIVAS_MS;
		for (const [discordId, lista] of this.erros) {
			if (!lista.some((t) => t >= limite)) this.erros.delete(discordId);
		}
	}

	private recentes(discordId: string): number[] {
		const limite = this.agora() - JANELA_TENTATIVAS_MS;
		const lista = (this.erros.get(discordId) ?? []).filter((t) => t >= limite);
		if (lista.length) this.erros.set(discordId, lista);
		else this.erros.delete(discordId);
		return lista;
	}
}

export type DecisaoVinculo = "ok" | "codigo_invalido" | "discord_ja_vinculado" | "uuid_ja_vinculado" | "limite";

/** Ordem das recusas: limite, código, Discord, UUID. O chamador só consome o código no "ok". */
export function decidirVinculo(args: {
	bloqueado: boolean;
	pendente: { uuid: string } | null;
	discordJaVinculado: boolean;
	uuidJaVinculado: boolean;
}): DecisaoVinculo {
	if (args.bloqueado) return "limite";
	if (!args.pendente) return "codigo_invalido";
	if (args.discordJaVinculado) return "discord_ja_vinculado";
	if (args.uuidJaVinculado) return "uuid_ja_vinculado";
	return "ok";
}
