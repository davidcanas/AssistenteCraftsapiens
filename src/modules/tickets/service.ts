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
import { ticketChannelName, welcomeMessage, type TicketAnswer } from "./views";

export type OpenResult =
	| { ok: true; channelId: string }
	| { ok: false; reason: "already-open"; channelId: string }
	| { ok: false; reason: "busy" | "failed" };

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

		await channel.createMessage(welcomeMessage({
			ticketId: String(ticket._id),
			number,
			userId: p.userId,
			categoryId: p.category.id,
			answers: p.answers,
			staffRoleIds: config.staffRoleIds,
			claimedBy: null,
		}));

		return { ok: true, channelId: channel.id };
	} catch (error) {
		console.error("[TICKETS]", error);
		return FAILED;
	} finally {
		opening.delete(key);
	}
}
