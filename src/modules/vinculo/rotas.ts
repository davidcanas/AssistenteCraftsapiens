import express, { Router } from "express";
import type { Response } from "express";
import type DGClient from "../../structures/Client";
import { exigirToken, uuidValido, validarCorpoCodigo, validarCorpoGrupos } from "./token";

/** O que as rotas precisam do serviço (o real vem de `service.ts`; nos testes entra um falso). */
export interface ServicoVinculo {
	statusVinculo(client: DGClient, uuid: string): Promise<{ vinculado: boolean; discordId?: string; discordNome?: string }>;
	criarCodigo(
		client: DGClient,
		uuid: string,
		nick: string,
	): Promise<{ codigo: string; expiraEm: number } | { vinculado: true; discordNome: string }>;
	aplicarGrupos(client: DGClient, uuid: string, nick: string, grupos: string[]): Promise<{ aplicado: boolean }>;
	desvincular(client: DGClient, uuid: string): Promise<{ removido: boolean }>;
}

export interface DependenciasRotas {
	servico: ServicoVinculo;
	/** Lido a cada requisição: o `client` do `main` só existe depois do boot. */
	client: () => DGClient;
	/** Lido a cada requisição, para o token poder mudar sem reiniciar. */
	token: () => string | undefined;
}

function erroInterno(res: Response, rota: string, err: unknown) {
	console.error(`[VINCULO] Falha em ${rota}:`, err);
	res.status(500).json({ erro: "interno" });
}

export function criarRouter({ servico, client, token }: DependenciasRotas): Router {
	const router = Router();

	router.use(exigirToken(token));
	router.use(express.json({ limit: "10kb" }));

	router.post("/codigo", async (req, res) => {
		const corpo = validarCorpoCodigo(req.body);
		if (!corpo) return res.status(400).json({ erro: "corpo invalido" });
		try {
			const resultado = await servico.criarCodigo(client(), corpo.uuid, corpo.nick);
			if ("vinculado" in resultado) return res.status(409).json(resultado);
			return res.status(200).json(resultado);
		} catch (err) {
			return erroInterno(res, "POST /codigo", err);
		}
	});

	router.post("/grupos", async (req, res) => {
		const corpo = validarCorpoGrupos(req.body);
		if (!corpo) return res.status(400).json({ erro: "corpo invalido" });
		try {
			return res.status(200).json(await servico.aplicarGrupos(client(), corpo.uuid, corpo.nick, corpo.grupos));
		} catch (err) {
			return erroInterno(res, "POST /grupos", err);
		}
	});

	router.get("/:uuid", async (req, res) => {
		if (!uuidValido(req.params.uuid)) return res.status(400).json({ erro: "uuid invalido" });
		try {
			const { vinculado, discordNome } = await servico.statusVinculo(client(), req.params.uuid);
			return res.status(200).json(vinculado ? { vinculado, discordNome } : { vinculado });
		} catch (err) {
			return erroInterno(res, "GET /:uuid", err);
		}
	});

	router.delete("/:uuid", async (req, res) => {
		if (!uuidValido(req.params.uuid)) return res.status(400).json({ erro: "uuid invalido" });
		try {
			return res.status(200).json(await servico.desvincular(client(), req.params.uuid));
		} catch (err) {
			return erroInterno(res, "DELETE /:uuid", err);
		}
	});

	// Toda falha aqui responde JSON: nunca cai na página HTML padrão do Express (que mostra o stack trace).
	// O quarto parâmetro precisa existir para o Express tratar isto como manipulador de erro.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	router.use((err: any, _req: express.Request, res: Response, _next: express.NextFunction) => {
		if (err?.type) {
			// Erro do body-parser (JSON inválido, corpo grande demais, charset etc.).
			return res.status(err?.status && err.status < 500 ? err.status : 400).json({ erro: "corpo invalido" });
		}
		console.error("[VINCULO] Erro inesperado na rota:", err);
		return res.status(500).json({ erro: "interno" });
	});

	return router;
}
