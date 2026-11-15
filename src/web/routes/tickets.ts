import { Router } from "express";
import { isValidObjectId } from "mongoose";
import client from "../../main";
import isLogged from "../helpers/isLogged";
import isAdmin from "../helpers/isAdmin";
import { Ticket } from "../../modules/tickets/model";
import { getTicketsConfig } from "../../modules/tickets";
import { buildTicketFilter, PAGE_SIZE, parsePeriod, staffRows } from "../../modules/tickets/metrics";
import { previousMonthRange } from "../../modules/tickets/survey";
import { toListItem, toDetail, toConversation, isNotFoundError, resolveAttachment, isInlineFile, type ConversaItem, type Pessoa, type TicketLike } from "../../modules/tickets/siteViews";
import { ATTACHMENTS_ROOT } from "../../modules/tickets/attachments";
import { fetchTranscript } from "../../modules/tickets/service";
import { withTimeout } from "../../modules/tickets/timeout";
import type { StoredFile } from "../../modules/tickets/transcript";
import { TICKET_CATEGORIES, getCategory } from "../../modules/tickets/categories";

const router = Router();

router.use(isLogged);
router.use(isAdmin);

const GUILD = () => getTicketsConfig()?.guildId ?? "892472046729179136";

function displayName(id: string): string {
	return client.guilds.get(GUILD())?.members.get(id)?.nick ?? client.users.get(id)?.username ?? id;
}

function baseLocals(req) {
	const user = req.user;
	const guild = client.guilds.get("892472046729179136");
	return {
		user,
		member: guild.members.get(user.id),
		avatar: user ? client.users.get(user.id).avatarURL() : "",
		guild,
		highestRole: client.getHighestRole,
	};
}

router.get("/", async (req, res) => {
	try {
		const guildId = GUILD();
		const construido = buildTicketFilter(guildId, req.query, (n) => client.getDiscordByNick(n)?.id ?? null);
		const { mongo, filtros, aviso } = construido;
		let { pagina } = construido;

		// Conta antes para limitar a página (um número gigante faria o skip do Mongo falhar).
		const total = await Ticket.countDocuments(mongo);
		const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
		pagina = Math.min(pagina, totalPaginas);

		const [tickets, claimed, helpers] = await Promise.all([
			Ticket.find(mongo, { transcript: 0 }).sort({ createdAt: -1 }).skip((pagina - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
			Ticket.distinct("claimedBy", { guildId }),
			Ticket.distinct("helpers", { guildId }),
		]);

		const ids = new Set<string>();
		for (const id of [...claimed, ...helpers]) if (id) ids.add(String(id));
		const atendentes: Pessoa[] = [...ids]
			.map((id) => ({ id, nome: displayName(id) }))
			.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

		const itens = tickets.map((t) => toListItem(t as unknown as TicketLike, displayName, !!client.getChannel(t.channelId)));

		res.render("tickets/lista", {
			...baseLocals(req),
			itens,
			filtros,
			aviso,
			pagina,
			totalPaginas,
			total,
			atendentes,
			categorias: TICKET_CATEGORIES.map((c) => ({ id: c.id, nome: `${c.emoji} ${c.label}` })),
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar os tickets.");
	}
});

// Arquivo anexado ao ticket: só serve o que está listado no transcript (sem caminho vindo do usuário).
router.get("/anexos/:ticketId/:arquivo", async (req, res) => {
	try {
		const { ticketId, arquivo } = req.params;
		if (!isValidObjectId(ticketId)) return res.status(404).render("errors/404");

		const ticket = await Ticket.findById(ticketId, { transcript: 1 }).lean();
		if (!ticket) return res.status(404).render("errors/404");

		const files: StoredFile[] = [];
		for (const entry of ticket.transcript ?? []) files.push(...((entry as { files?: StoredFile[] }).files ?? []));

		const caminho = resolveAttachment(ATTACHMENTS_ROOT, ticketId, files, arquivo);
		if (!caminho) return res.status(404).render("errors/404");

		res.setHeader("X-Content-Type-Options", "nosniff");
		if (!isInlineFile(arquivo)) res.setHeader("Content-Disposition", "attachment");

		res.sendFile(caminho, (erro) => {
			if (!erro || res.headersSent) return;
			res.removeHeader("Content-Disposition");
			res.status(404).render("errors/404");
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar o anexo.");
	}
});

const ID_REGEX = /^\d{17,20}$/;

// Data (AAAA-MM-DD) no fuso de São Paulo (UTC-3 fixo).
const spYmd = (d: Date) => new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

// Ranking da staff no período (tickets fechados, por closedAt).
router.get("/staff", async (req, res) => {
	try {
		const now = new Date();
		const periodo = parsePeriod(req.query, now);
		const tickets = await Ticket.find(
			{ guildId: GUILD(), status: "closed", closedAt: { $gte: periodo.start, $lt: periodo.end } },
			{ claimedBy: 1, helpers: 1, category: 1, survey: 1, createdAt: 1, claimedAt: 1, closedAt: 1 },
		).lean();
		const { linhas, geral } = staffRows(tickets as any, displayName);

		const mes = previousMonthRange(now);
		const atalhos = [
			{ nome: "7 dias", de: spYmd(new Date(now.getTime() - 6 * 86_400_000)), ate: spYmd(now) },
			{ nome: "30 dias", de: spYmd(new Date(now.getTime() - 29 * 86_400_000)), ate: spYmd(now) },
			{ nome: "Mês passado", de: spYmd(mes.start), ate: spYmd(new Date(mes.end.getTime() - 86_400_000)) },
		];

		res.render("tickets/staff", {
			...baseLocals(req),
			periodo: { de: periodo.de, ate: periodo.ate, label: periodo.label },
			linhas,
			geral,
			atalhos,
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar o ranking da staff.");
	}
});

// Métricas e tickets de um atendente (como quem assumiu ou como superior).
router.get("/staff/:userId", async (req, res) => {
	try {
		const { userId } = req.params;
		if (!ID_REGEX.test(userId)) return res.status(404).render("errors/404");

		const periodo = parsePeriod(req.query, new Date());
		const tickets = await Ticket.find(
			{
				guildId: GUILD(),
				status: "closed",
				closedAt: { $gte: periodo.start, $lt: periodo.end },
				$or: [{ claimedBy: userId }, { helpers: userId }],
			},
			{ transcript: 0 },
		).sort({ createdAt: -1 }).lean();

		const nome = displayName(userId);
		const { linhas } = staffRows(tickets as any, displayName);
		const metricas = linhas.find((l) => l.id === userId) ?? {
			id: userId,
			nome,
			atendidos: 0,
			avaliados: 0,
			resolvidoPct: null,
			atendimentoMedia: null,
			tempoMedia: null,
			mediaAteAssumir: null,
			mediaAteFechar: null,
			comoSuperior: 0,
		};

		res.render("tickets/staff-individual", {
			...baseLocals(req),
			periodo: { de: periodo.de, ate: periodo.ate, label: periodo.label },
			atendente: { id: userId, nome },
			metricas,
			tickets: tickets.slice(0, 100).map((t) => toListItem(t as unknown as TicketLike, displayName, !!client.getChannel(t.channelId))),
			totalTickets: tickets.length,
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar o atendente.");
	}
});

// Histórico de tickets de um jogador.
router.get("/jogador/:userId", async (req, res) => {
	try {
		const { userId } = req.params;
		if (!ID_REGEX.test(userId)) return res.status(404).render("errors/404");

		const docs = await Ticket.find({ guildId: GUILD(), userId }, { transcript: 0 }).sort({ createdAt: -1 }).lean();

		const porCategoria: Record<string, number> = {};
		for (const t of docs) {
			const cat = getCategory(t.category);
			const rotulo = cat ? `${cat.emoji} ${cat.label}` : t.category;
			porCategoria[rotulo] = (porCategoria[rotulo] ?? 0) + 1;
		}

		res.render("tickets/jogador", {
			...baseLocals(req),
			jogador: { id: userId, nome: displayName(userId) },
			contagem: { total: docs.length, abertos: docs.filter((t) => t.status === "open").length, porCategoria },
			tickets: docs.map((t) => toListItem(t as unknown as TicketLike, displayName, !!client.getChannel(t.channelId))),
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar o histórico do jogador.");
	}
});

// Rotas fixas (staff, jogador, stream...) devem ser declaradas ACIMA de "/:id".
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) return res.status(404).render("errors/404");

		const ticket = await Ticket.findById(id).lean();
		if (!ticket) return res.status(404).render("errors/404");

		const channelExists = !!client.getChannel(ticket.channelId);
		let detalhe = toDetail(ticket as unknown as TicketLike, displayName, channelExists);
		let conversa: ConversaItem[] = [];
		let erroConversa: string | null = null;

		if (ticket.status === "closed") {
			conversa = toConversation(id, ticket.userId, client.user.id, (ticket.transcript ?? []) as any);
		} else {
			try {
				const { entries } = await withTimeout(fetchTranscript(client, ticket.channelId), 10_000);
				conversa = toConversation(id, ticket.userId, client.user.id, entries);
			} catch (error) {
				if (isNotFoundError(error)) {
					detalhe = { ...detalhe, canalApagado: true, canalApagadoSemTranscricao: true };
				} else {
					console.error("[TICKETS]", error);
					erroConversa = "Não foi possível ler a conversa no Discord agora.";
				}
			}
		}

		res.render("tickets/detalhe", {
			...baseLocals(req),
			ticket: detalhe,
			conversa,
			conversaAoVivo: ticket.status === "open",
			erroConversa,
		});
	} catch (error) {
		console.error("[TICKETS]", error);
		res.status(500).send("Erro ao carregar o ticket.");
	}
});

export default router;
