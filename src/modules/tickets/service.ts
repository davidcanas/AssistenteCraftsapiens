import { isValidObjectId } from "mongoose";
import {
	ChannelTypes,
	DiscordRESTError,
	OverwriteTypes,
	Permissions,
	type Guild,
	type OverwriteOptions,
} from "oceanic.js";
import type DGClient from "../../structures/Client";
import type { TicketCategory } from "./categories";
import type { TicketsConfig } from "./config";
import { Ticket, nextTicketNumber, type TicketDoc } from "./model";
import { ticketChannelName, welcomeMessage, type PlayerProfile, type TicketAnswer, type WelcomeView } from "./views";

export type OpenResult =
	| { ok: true; channelId: string }
	| { ok: false; reason: "already-open"; channelId: string }
	| { ok: false; reason: "busy" | "failed" };

export type ClaimResult =
	| { ok: true; ticket: TicketDoc }
	| { ok: false; claimedBy: string | null; closed: boolean };

type PunishmentEntry = { tipo?: string; motivo?: string; horario?: string };

const FAILED: OpenResult = { ok: false, reason: "failed" };
const HTTP_NOT_FOUND = 404;

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

const opening = new Set<string>();

async function channelExists(client: DGClient, channelId: string): Promise<boolean> {
	if (client.getChannel(channelId)) {
		return true;
	}
	try {
		await client.rest.channels.get(channelId);
		return true;
	} catch (error) {
		if (error instanceof DiscordRESTError && error.status === HTTP_NOT_FOUND) {
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
	};
}

export async function findOpenTicket(client: DGClient, guildId: string, userId: string): Promise<TicketDoc | null> {
	const ticket = await Ticket.findOne({ guildId, userId, status: "open" });
	if (!ticket) {
		return null;
	}
	if (await channelExists(client, ticket.channelId)) {
		return ticket;
	}

	const now = new Date();
	await Ticket.updateOne(
		{ _id: ticket._id, status: "open" },
		{ $set: { status: "closed", closedAt: now, channelDeletedAt: now } },
	);
	return null;
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
		const existing = await findOpenTicket(client, p.guild.id, p.userId);
		if (existing) {
			return { ok: false, reason: "already-open", channelId: existing.channelId };
		}

		const number = await nextTicketNumber();
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

		try {
			await channel.createMessage(welcomeMessage(toWelcomeView(ticket, config.staffRoleIds)));
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
		return { ok: true, ticket: updated };
	}

	const ticket = await findTicketById(ticketId);
	return { ok: false, claimedBy: ticket?.claimedBy ?? null, closed: ticket?.status === "closed" };
}

async function fetchMemberOrUser(client: DGClient, guild: Guild, userId: string): Promise<{ nick: string | null }> {
	try {
		const member = guild.members.get(userId) ?? (await guild.getMember(userId));
		if (member) {
			return { nick: member.nick ?? member.user.username };
		}
	} catch {
		// Saiu do servidor: tenta o usuário abaixo.
	}
	try {
		const user = client.users.get(userId) ?? (await client.rest.users.get(userId));
		return { nick: user.username };
	} catch {
		return { nick: null };
	}
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
	const { nick } = await fetchMemberOrUser(client, guild, userId);
	if (nick === null) {
		return { userId, nick, linked: false, api: "unavailable", punishments: "unavailable" };
	}

	const [linked, api, punishments] = await Promise.allSettled([
		(async () => !!client.getDiscordByNick(nick))(),
		fetchApiProfile(client, nick),
		fetchPunishments(client, nick),
	]);

	return {
		userId,
		nick,
		linked: linked.status === "fulfilled" ? linked.value : false,
		api: api.status === "fulfilled" ? api.value : "unavailable",
		punishments: punishments.status === "fulfilled" ? punishments.value : "unavailable",
	};
}
