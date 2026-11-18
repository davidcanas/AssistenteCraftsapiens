import express, { Router } from "express";
import type { Response } from "express";
import client from "../../main";
import { aplicarGrupos, criarCodigo, desvincular, statusVinculo } from "../../modules/vinculo";
import { exigirToken, uuidValido, validarCorpoCodigo, validarCorpoGrupos } from "../../modules/vinculo/token";

const router = Router();

router.use(exigirToken(() => process.env.VINCULO_TOKEN));
router.use(express.json({ limit: "10kb" }));

function erroInterno(res: Response, rota: string, err: unknown) {
	console.error(`[VINCULO] Falha em ${rota}:`, err);
	res.status(500).json({ erro: "interno" });
}

router.post("/codigo", async (req, res) => {
	const corpo = validarCorpoCodigo(req.body);
	if (!corpo) return res.status(400).json({ erro: "corpo invalido" });
	try {
		const resultado = await criarCodigo(client, corpo.uuid, corpo.nick);
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
		return res.status(200).json(await aplicarGrupos(client, corpo.uuid, corpo.nick, corpo.grupos));
	} catch (err) {
		return erroInterno(res, "POST /grupos", err);
	}
});

router.get("/:uuid", async (req, res) => {
	if (!uuidValido(req.params.uuid)) return res.status(400).json({ erro: "uuid invalido" });
	try {
		const { vinculado, discordNome } = await statusVinculo(client, req.params.uuid);
		return res.status(200).json(vinculado ? { vinculado, discordNome } : { vinculado });
	} catch (err) {
		return erroInterno(res, "GET /:uuid", err);
	}
});

router.delete("/:uuid", async (req, res) => {
	if (!uuidValido(req.params.uuid)) return res.status(400).json({ erro: "uuid invalido" });
	try {
		return res.status(200).json(await desvincular(client, req.params.uuid));
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

export default router;
