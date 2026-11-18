import { timingSafeEqual } from "crypto";
import type { RequestHandler } from "express";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Confere o cabeçalho `Authorization: Bearer <token>` em tempo constante. */
export function tokenValido(cabecalho: string | undefined, esperado: string | undefined): boolean {
	if (!cabecalho || !esperado) return false;
	const recebido = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
	if (!recebido) return false;

	const a = Buffer.from(recebido);
	const b = Buffer.from(esperado);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

/** Middleware: 503 sem token configurado, 401 com token errado. O token é lido a cada requisição. */
export function exigirToken(esperado: () => string | undefined): RequestHandler {
	return (req, res, next) => {
		const token = esperado();
		if (!token) {
			res.status(503).json({ erro: "vinculo desativado" });
			return;
		}
		if (!tokenValido(req.headers.authorization, token)) {
			res.status(401).json({ erro: "nao autorizado" });
			return;
		}
		next();
	};
}

export function uuidValido(valor: unknown): valor is string {
	return typeof valor === "string" && UUID_REGEX.test(valor);
}

const MAX_NICK = 32;
const MAX_GRUPOS = 50;
const MAX_GRUPO = 64;

/** Nick com 1 a 32 caracteres depois do trim. */
function nickValido(valor: unknown): valor is string {
	if (typeof valor !== "string") return false;
	const tamanho = valor.trim().length;
	return tamanho >= 1 && tamanho <= MAX_NICK;
}

/** Nome de grupo com 1 a 64 caracteres. */
function grupoValido(valor: unknown): valor is string {
	return typeof valor === "string" && valor.length >= 1 && valor.length <= MAX_GRUPO;
}

export function validarCorpoCodigo(corpo: unknown): { uuid: string; nick: string } | null {
	if (!corpo || typeof corpo !== "object") return null;
	const { uuid, nick } = corpo as Record<string, unknown>;
	if (!uuidValido(uuid) || !nickValido(nick)) return null;
	return { uuid, nick: nick.trim() };
}

/** Lista de grupos vazia é recusada: todo jogador tem ao menos `default`, então vazio indica erro do lado do plugin. */
export function validarCorpoGrupos(corpo: unknown): { uuid: string; nick: string; grupos: string[] } | null {
	if (!corpo || typeof corpo !== "object") return null;
	const { uuid, nick, grupos } = corpo as Record<string, unknown>;
	if (!uuidValido(uuid) || !nickValido(nick)) return null;
	if (!Array.isArray(grupos) || grupos.length === 0 || grupos.length > MAX_GRUPOS) return null;
	if (!grupos.every(grupoValido)) return null;
	return { uuid, nick: nick.trim(), grupos };
}
