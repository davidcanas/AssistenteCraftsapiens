import { isValidObjectId } from "mongoose";
import {
	ChannelTypes,
	DiscordRESTError,
	OverwriteTypes,
	Permissions,
	type Guild,
	type OverwriteOptions,
	type User,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import { getCategory, type TicketAnswer, type TicketCategory } from "./categories";
import type { TicketsConfig } from "./config";
import { emitTicketEvent } from "./events";
import { Ticket, nextTicketNumber, type TicketDoc } from "./model";
import { SURVEY_QUESTIONS, monthlySummaryEmbed, previousMonthRange, summarizeMonth, surveyOpeningMessage } from "./survey";
import { storeAttachments } from "./attachments";
import { withTimeout } from "./timeout";
import { MAX_TRANSCRIPT_MESSAGES, formatTranscript, type TranscriptEntry } from "./transcript";
import {
	closedChannelName,
	closedNoticeMessage,
	escalationMessage,
	logMessage,
	ticketChannelName,
	welcomeMessage,
	type PlayerProfile,
	type WelcomeView,
} from "./views";

export type OpenResult =
	| { ok: true; channelId: string }
	| { ok: false; reason: "limit"; channelIds: string[] }
	| { ok: false; reason: "busy" | "failed" };

/** Quantos tickets um jogador pode ter abertos ao mesmo tempo. */
export const MAX_OPEN_TICKETS = 3;

export type ClaimResult =
	| { ok: true; ticket: TicketDoc }
	| { ok: false; claimedBy: string | null; closed: boolean };

/** `answered`: quantas perguntas o dono já respondeu (null quando não há o que mostrar). */
export type SurveyResult =
	| { ok: true; answered: number }
	| { ok: false; reason: "not-owner" }
	| { ok: false; reason: "ignored"; answered: number | null };

export type CloseResult = { ok: true } | { ok: false; reason: "not-found" | "already-closed" };

export type EscalationResult = { ok: true; ticket: TicketDoc } | { ok: false; reason: "not-found" | "closed" };

type PunishmentEntry = Exclude<PlayerProfile["punishments"], "unavailable">["last"][number];

const FAILED: OpenResult = { ok: false, reason: "failed" };
const HTTP_NOT_FOUND = 404;
const MS_PER_HOUR = 3_600_000;
const MESSAGES_PAGE_SIZE = 100;
// A API do jogo pode não responder nunca: sem limite a Ficha ficava carregando para sempre.
const PROFILE_TIMEOUT_MS = 5_000;

const PLAYER_PERMISSIONS =
	Permissions.VIEW_CHANNEL |
	Permissions.SEND_MESSAGES |
	Permissions.READ_MESSAGE_HISTORY |
	Permissions.ATTACH_FILES |
	Permissions.EMBED_LINKS;
const STAFF_PERMISSIONS = PLAYER_PERMISSIONS | Permissions.MANAGE_MESSAGES;
const BOT_PERMISSIONS =
	Permissions.VIEW_CHANNEL |
	Permissions.SEND_MESSAGES |
	Permissions.READ_MESSAGE_HISTORY |
	Permissions.MANAGE_CHANNELS |
	Permissions.MANAGE_ROLES;
const CLOSED_PLAYER_ALLOW = Permissions.VIEW_CHANNEL | Permissions.READ_MESSAGE_HISTORY;
const CLOSED_PLAYER_DENY = Permissions.SEND_MESSAGES;

const opening = new Set<string>();

function isNotFound(error: unknown): boolean {
	return error instanceof DiscordRESTError && error.status === HTTP_NOT_FOUND;
}

async function channelExists(client: DGClient, channelId: string): Promise<boolean> {
	if (client.getChannel(channelId)) {
		return true;
	}
	try {
		await client.rest.channels.get(channelId);
		return true;
	} catch (error) {
		if (isNotFound(error)) {
			return false;
		}
		throw error;
	}
}

export function toWelcomeView(ticket: TicketDoc, staffRoleIds: string[]): WelcomeView {
	return {
		ticketId: String(ticket._id),
		number: ticket.number,
		userId: ticket.userId,
		categoryId: ticket.category,
		answers: ticket.answers,
		staffRoleIds,
		claimedBy: ticket.claimedBy,
		helpers: ticket.helpers ?? [],
		closed: ticket.status === "closed",
	};
}

/** Tickets abertos do jogador cujo canal ainda existe (canal apagado à mão fecha o ticket). */
export async function findOpenTickets(client: DGClient, guildId: string, userId: string): Promise<TicketDoc[]> {
	const tickets = await Ticket.find({ guildId, userId, status: "open" }).sort({ createdAt: 1 });
	const alive = await Promise.all(tickets.map((ticket) => channelExists(client, ticket.channelId)));

	const now = new Date();
	const gone = tickets.filter((_, i) => !alive[i]).map((ticket) => ticket._id);
	if (gone.length > 0) {
		await Ticket.updateMany(
			{ _id: { $in: gone }, status: "open" },
			{ $set: { status: "closed", closedAt: now, channelDeletedAt: now } },
		);
	}
	return tickets.filter((_, i) => alive[i]);
}

function buildOverwrites(client: DGClient, guild: Guild, userId: string, staffRoleIds: string[]): OverwriteOptions[] {
	return [
		{ id: guild.id, type: OverwriteTypes.ROLE, deny: Permissions.VIEW_CHANNEL },
		{ id: userId, type: OverwriteTypes.MEMBER, allow: PLAYER_PERMISSIONS },
		...staffRoleIds.map((roleId) => ({ id: roleId, type: OverwriteTypes.ROLE, allow: STAFF_PERMISSIONS })),
		{ id: client.user.id, type: OverwriteTypes.MEMBER, allow: BOT_PERMISSIONS },
	];
}

export async function openTicket(
	client: DGClient,
	config: TicketsConfig,
	p: { guild: Guild; userId: string; category: TicketCategory; answers: TicketAnswer[] },
): Promise<OpenResult> {
	const key = `${p.guild.id}:${p.userId}`;
	if (opening.has(key)) {
		return { ok: false, reason: "busy" };
	}
	opening.add(key);

	try {
		const open = await findOpenTickets(client, p.guild.id, p.userId);
		if (open.length >= MAX_OPEN_TICKETS) {
			return { ok: false, reason: "limit", channelIds: open.map((ticket) => ticket.channelId) };
		}

		const number = await nextTicketNumber(config.startNumber);
		const channel = await p.guild.createChannel(ChannelTypes.GUILD_TEXT, {
			name: ticketChannelName(number),
			permissionOverwrites: buildOverwrites(client, p.guild, p.userId, config.staffRoleIds),
		});

		let ticket: TicketDoc;
		try {
			ticket = await Ticket.create({
				number,
				guildId: p.guild.id,
				channelId: channel.id,
				userId: p.userId,
				category: p.category.id,
				answers: p.answers,
				status: "open",
			});
		} catch (error) {
			console.error("[TICKETS]", error);
			await channel.delete().catch((deleteError) => console.error("[TICKETS]", deleteError));
			return FAILED;
		}

		let welcomeMessageId: string;
		try {
			welcomeMessageId = (await channel.createMessage(welcomeMessage(toWelcomeView(ticket, config.staffRoleIds)))).id;
		} catch (error) {
			// Sem a mensagem de boas-vindas o ticket não pode ser assumido nem fechado: desfaz tudo.
			console.error("[TICKETS]", error);
			try {
				await channel.delete();
			} catch (deleteError) {
				console.error("[TICKETS]", deleteError);
			}
			try {
				await Ticket.deleteOne({ _id: ticket._id });
			} catch (deleteError) {
				console.error("[TICKETS]", deleteError);
			}
			return FAILED;
		}

		// Guardado para desativar os botões do card quando o ticket fechar (falhar aqui não impede o ticket).
		await Ticket.updateOne({ _id: ticket._id }, { $set: { welcomeMessageId } })
			.catch((error) => console.error("[TICKETS]", error));

		emitTicketEvent({ tipo: "aberto", ticketId: String(ticket._id), number: ticket.number, userId: p.userId, categoria: p.category.id, em: new Date().toISOString() });
		return { ok: true, channelId: channel.id };
	} catch (error) {
		console.error("[TICKETS]", error);
		return FAILED;
	} finally {
		opening.delete(key);
	}
}

export async function findTicketById(ticketId: string): Promise<TicketDoc | null> {
	if (!isValidObjectId(ticketId)) {
		return null;
	}
	return Ticket.findById(ticketId);
}

export async function claimTicket(ticketId: string, staffId: string): Promise<ClaimResult> {
	if (!isValidObjectId(ticketId)) {
		return { ok: false, claimedBy: null, closed: false };
	}
	const updated = await Ticket.findOneAndUpdate(
		{ _id: ticketId, status: "open", claimedBy: null },
		{ claimedBy: staffId, claimedAt: new Date() },
		{ new: true },
	);
	if (updated) {
		emitTicketEvent({ tipo: "assumido", ticketId: String(updated._id), number: updated.number, staffId, em: new Date().toISOString() });
		return { ok: true, ticket: updated };
	}

	const ticket = await findTicketById(ticketId);
	return { ok: false, claimedBy: ticket?.claimedBy ?? null, closed: ticket?.status === "closed" };
}

async function fetchUser(client: DGClient, userId: string): Promise<User | null> {
	try {
		return client.users.get(userId) ?? (await client.rest.users.get(userId));
	} catch {
		return null;
	}
}

async function fetchUserTag(client: DGClient, userId: string): Promise<string> {
	return (await fetchUser(client, userId))?.tag ?? userId;
}

async function fetchNick(client: DGClient, guild: Guild, userId: string): Promise<string | null> {
	try {
		const member = guild.members.get(userId) ?? (await guild.getMember(userId));
		if (member) {
			return member.nick ?? member.user.username;
		}
	} catch {
		// Saiu do servidor: tenta o usuário abaixo.
	}
	return (await fetchUser(client, userId))?.username ?? null;
}

async function fetchApiProfile(client: DGClient, nick: string): Promise<PlayerProfile["api"]> {
	const info = await client.api.getPlayerInfo(nick);
	const data = info?.data;
	if (!data) {
		return "unavailable";
	}
	return {
		group: data.group ?? null,
		online: data.status?.online ?? null,
		town: data.towny?.townName ?? null,
		nation: data.towny?.nationName ?? null,
	};
}

async function fetchPunishments(client: DGClient, nick: string): Promise<PlayerProfile["punishments"]> {
	const doc = await client.db.users.findOne({ nick });
	const list = (doc?.punicoes ?? []) as PunishmentEntry[];
	return { total: list.length, last: list.slice(-3).reverse() };
}

export async function buildPlayerProfile(client: DGClient, guild: Guild, userId: string): Promise<PlayerProfile> {
	const nick = await withTimeout(fetchNick(client, guild, userId), PROFILE_TIMEOUT_MS).catch(() => null);
	if (nick === null) {
		return { userId, nick, linked: false, api: "unavailable", punishments: "unavailable" };
	}

	const [linked, api, punishments] = await Promise.allSettled([
		(async () => !!client.getDiscordByNick(nick))(),
		withTimeout(fetchApiProfile(client, nick), PROFILE_TIMEOUT_MS),
		withTimeout(fetchPunishments(client, nick), PROFILE_TIMEOUT_MS),
	]);

	return {
		userId,
		nick,
		linked: linked.status === "fulfilled" ? linked.value : false,
		api: api.status === "fulfilled" ? api.value : "unavailable",
		punishments: punishments.status === "fulfilled" ? punishments.value : "unavailable",
	};
}

export async function fetchTranscript(client: DGClient, channelId: string): Promise<{ entries: TranscriptEntry[]; truncated: boolean }> {
	const entries: TranscriptEntry[] = [];
	let before: string | undefined;
	let lastPageFull = false;

	while (entries.length < MAX_TRANSCRIPT_MESSAGES) {
		const limit = Math.min(MESSAGES_PAGE_SIZE, MAX_TRANSCRIPT_MESSAGES - entries.length);
		const page = await client.rest.channels.getMessages(channelId, { limit, before });
		for (const message of page) {
			entries.push({
				authorId: message.author.id,
				authorTag: message.author.tag,
				content: message.content,
				attachments: message.attachments.map((attachment) => attachment.url),
				createdAt: message.timestamp,
			});
		}
		lastPageFull = page.length === limit;
		if (!lastPageFull) {
			break;
		}
		// O Discord devolve da mais nova para a mais antiga: a última da página é a mais antiga.
		before = page[page.length - 1].id;
	}

	// Grava em ordem cronológica (mais antiga primeiro).
	entries.reverse();
	return { entries, truncated: entries.length >= MAX_TRANSCRIPT_MESSAGES && lastPageFull };
}

export async function closeTicket(client: DGClient, config: TicketsConfig, ticketId: string, closedById: string): Promise<CloseResult> {
	if (!isValidObjectId(ticketId)) {
		return { ok: false, reason: "not-found" };
	}

	// 1. Fecha de forma atômica: só um clique vence, mesmo se os passos seguintes falharem.
	const closedAt = new Date();
	const deleteAt = new Date(closedAt.getTime() + config.deleteAfterHours * MS_PER_HOUR);
	const ticket = await Ticket.findOneAndUpdate(
		{ _id: ticketId, status: "open" },
		{ status: "closed", closedBy: closedById, closedAt, deleteAt },
		{ new: true },
	);
	if (!ticket) {
		const existing = await findTicketById(ticketId);
		return { ok: false, reason: existing ? "already-closed" : "not-found" };
	}
	emitTicketEvent({ tipo: "fechado", ticketId: String(ticket._id), number: ticket.number, fechadoPor: closedById, em: new Date().toISOString() });

	// 2. O jogador continua vendo o canal, mas não escreve mais (antes da transcrição, para nada se perder).
	try {
		await client.rest.channels.editPermission(ticket.channelId, ticket.userId, {
			type: OverwriteTypes.MEMBER,
			allow: CLOSED_PLAYER_ALLOW,
			deny: CLOSED_PLAYER_DENY,
		});
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	// 2b. Desativa os botões do card de boas-vindas (Assumir, Ficha, Fechar).
	if (ticket.welcomeMessageId) {
		try {
			const { components } = welcomeMessage(toWelcomeView(ticket, config.staffRoleIds));
			await client.rest.channels.editMessage(ticket.channelId, ticket.welcomeMessageId, { components });
		} catch (error) {
			console.error("[TICKETS]", error);
		}
	}

	// 3. Transcrição.
	let entries: TranscriptEntry[] = [];
	let truncated = false;
	try {
		({ entries, truncated } = await fetchTranscript(client, ticket.channelId));
		await Ticket.updateOne({ _id: ticket._id }, { $set: { transcript: entries } });

		// 3b. Anexos para o disco (sem await: o fechamento não espera o download).
		if (entries.some((e) => e.attachments.length > 0)) {
			storeAttachments(String(ticket._id), entries)
				.then((withFiles) => Ticket.updateOne({ _id: ticket._id }, { $set: { transcript: withFiles } }))
				.catch((error) => console.error("[TICKETS]", error));
		}
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	// 4. Renomeia o canal.
	try {
		await client.rest.channels.edit(ticket.channelId, { name: closedChannelName(ticket.number) });
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	// 5. Aviso no canal.
	try {
		await client.rest.channels.createMessage(ticket.channelId, closedNoticeMessage(closedById, deleteAt));
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	// 6. Log da staff com a transcrição em .txt.
	try {
		const categoryLabel = getCategory(ticket.category)?.label ?? ticket.category;
		const transcriptText = formatTranscript(
			{
				number: ticket.number,
				categoryLabel,
				userTag: await fetchUserTag(client, ticket.userId),
				openedAt: ticket.createdAt,
				closedAt,
				truncated,
			},
			entries,
		);
		const summary = {
			number: ticket.number,
			categoryLabel,
			userId: ticket.userId,
			claimedBy: ticket.claimedBy,
			helpers: ticket.helpers ?? [],
			closedBy: closedById,
			openedAt: ticket.createdAt,
			closedAt,
		};
		await client.rest.channels.createMessage(config.logChannelId, logMessage(summary, transcriptText));
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	// 7. Pergunta secreta de avaliação para o jogador (marcando-o).
	try {
		await client.rest.channels.createMessage(ticket.channelId, surveyOpeningMessage(String(ticket._id), ticket.userId));
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	return { ok: true };
}

/** Manda o pedido de superior no canal da staff (o jogador não vê). */
export async function requestEscalation(client: DGClient, config: TicketsConfig, ticketId: string, requestedBy: string): Promise<EscalationResult> {
	const ticket = await findTicketById(ticketId);
	if (!ticket) {
		return { ok: false, reason: "not-found" };
	}
	if (ticket.status !== "open") {
		return { ok: false, reason: "closed" };
	}
	await client.rest.channels.createMessage(config.escalationChannelId, escalationMessage({
		ticketId: String(ticket._id),
		number: ticket.number,
		channelId: ticket.channelId,
		requestedBy,
		roleIds: config.escalationRoleIds,
	}));
	emitTicketEvent({ tipo: "superior-chamado", ticketId: String(ticket._id), number: ticket.number, pedidoPor: requestedBy, em: new Date().toISOString() });
	return { ok: true, ticket };
}

/** Superior assume: entra no canal (se o cargo dele não tiver acesso) e no "Atendido por" do card. */
export async function takeEscalation(client: DGClient, config: TicketsConfig, ticketId: string, staffId: string): Promise<EscalationResult> {
	if (!isValidObjectId(ticketId)) {
		return { ok: false, reason: "not-found" };
	}
	const ticket = await Ticket.findOneAndUpdate(
		{ _id: ticketId, status: "open" },
		{ $addToSet: { helpers: staffId } },
		{ new: true },
	);
	if (!ticket) {
		return { ok: false, reason: (await findTicketById(ticketId)) ? "closed" : "not-found" };
	}
	emitTicketEvent({ tipo: "superior-assumiu", ticketId: String(ticket._id), number: ticket.number, staffId, em: new Date().toISOString() });

	try {
		await client.rest.channels.editPermission(ticket.channelId, staffId, { type: OverwriteTypes.MEMBER, allow: STAFF_PERMISSIONS });
	} catch (error) {
		console.error("[TICKETS]", error);
	}

	if (ticket.welcomeMessageId) {
		try {
			const { embeds, components } = welcomeMessage(toWelcomeView(ticket, config.staffRoleIds));
			await client.rest.channels.editMessage(ticket.channelId, ticket.welcomeMessageId, { embeds, components });
		} catch (error) {
			console.error("[TICKETS]", error);
		}
	}

	return { ok: true, ticket };
}

export async function answerSurvey(ticketId: string, userId: string, index: number, value: number): Promise<SurveyResult> {
	const question = Number.isInteger(index) ? SURVEY_QUESTIONS[index] : undefined;
	if (!question || !Number.isInteger(value) || !question.options.some((option) => option.value === value) || !isValidObjectId(ticketId)) {
		return { ok: false, reason: "ignored", answered: null };
	}

	const now = new Date();
	// Última resposta: o canal já foi transcrito no fechamento, então a limpeza (a cada minuto) o apaga.
	const isLast = index === SURVEY_QUESTIONS.length - 1;
	const updated = await Ticket.findOneAndUpdate(
		{ _id: ticketId, userId, status: "closed", survey: { $size: index } },
		{
			$push: { survey: { questionId: question.id, value, answeredAt: now } },
			...(isLast ? { $set: { deleteAt: now } } : {}),
		},
		{ new: true, projection: { _id: 1 } },
	);
	if (updated) {
		return { ok: true, answered: index + 1 };
	}

	// Clique repetido ou fora de ordem: devolve só a contagem, para mostrar a pergunta pendente.
	const ticket = await Ticket.findById(ticketId, { userId: 1, status: 1, survey: 1 });
	if (ticket && ticket.userId !== userId) {
		return { ok: false, reason: "not-owner" };
	}
	const answered = ticket && ticket.status === "closed" ? ticket.survey.length : null;
	return { ok: false, reason: "ignored", answered };
}

export async function sendMonthlySummary(client: DGClient, config: TicketsConfig, now: Date = new Date()): Promise<boolean> {
	if (!config.summaryChannelId) {
		return false;
	}

	const { start, end, label } = previousMonthRange(now);
	const tickets = await Ticket.find(
		{ guildId: config.guildId, status: "closed", closedAt: { $gte: start, $lt: end } },
		{ claimedBy: 1, helpers: 1, category: 1, survey: 1 },
	).lean();
	const summary = summarizeMonth(
		tickets.map((ticket) => ({
			claimedBy: ticket.claimedBy ?? null,
			helpers: ticket.helpers ?? [],
			category: ticket.category,
			survey: ticket.survey ?? [],
		})),
	);
	await client.rest.channels.createMessage(config.summaryChannelId, {
		embeds: [monthlySummaryEmbed(summary, label)],
		allowedMentions: { users: [] },
	});
	return true;
}

export async function purgeExpiredChannels(client: DGClient, config: TicketsConfig): Promise<number> {
	const expired = await Ticket.find(
		{ guildId: config.guildId, status: "closed", deleteAt: { $lte: new Date() }, channelDeletedAt: null },
		{ channelId: 1 },
	);
	let deleted = 0;

	for (const ticket of expired) {
		try {
			try {
				await client.rest.channels.delete(ticket.channelId);
			} catch (error) {
				// 404: o canal já não existe, conta como apagado.
				if (!isNotFound(error)) {
					throw error;
				}
			}
			await Ticket.updateOne({ _id: ticket._id }, { $set: { channelDeletedAt: new Date() } });
			deleted++;
		} catch (error) {
			console.error("[TICKETS]", error);
		}
	}

	return deleted;
}
