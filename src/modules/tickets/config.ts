export interface TicketsConfig {
	guildId: string;
	staffRoleIds: string[];
	logChannelId: string;
	startNumber: number;
	deleteAfterHours: number;
	summaryChannelId: string | null;
}

export interface ConfigResult {
	config: TicketsConfig | null;
	error: string | null;
}

const DEFAULT_GUILD_ID = "892472046729179136";
const DEFAULT_START_NUMBER = 8917;
const DEFAULT_DELETE_AFTER_HOURS = 24;

function fail(error: string): ConfigResult {
	return { config: null, error };
}

export function parseTicketsConfig(env: Record<string, string | undefined>): ConfigResult {
	if (env.TICKETS_ENABLED !== "true") {
		return { config: null, error: null };
	}

	const staffRoleIds = (env.TICKETS_STAFF_ROLE_IDS ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
	if (staffRoleIds.length === 0) {
		return fail("TICKETS_STAFF_ROLE_IDS é obrigatória quando TICKETS_ENABLED=true.");
	}

	const logChannelId = (env.TICKETS_LOG_CHANNEL_ID ?? "").trim();
	if (logChannelId.length === 0) {
		return fail("TICKETS_LOG_CHANNEL_ID é obrigatória quando TICKETS_ENABLED=true.");
	}

	const startRaw = (env.TICKETS_START_NUMBER ?? "").trim();
	let startNumber = DEFAULT_START_NUMBER;
	if (startRaw.length > 0) {
		const parsed = Number(startRaw);
		if (!/^\d+$/.test(startRaw) || !Number.isSafeInteger(parsed) || parsed < 1) {
			return fail("TICKETS_START_NUMBER deve ser um inteiro maior ou igual a 1.");
		}
		startNumber = parsed;
	}

	const hoursRaw = (env.TICKETS_DELETE_AFTER_HOURS ?? "").trim();
	let deleteAfterHours = DEFAULT_DELETE_AFTER_HOURS;
	if (hoursRaw.length > 0) {
		const parsed = Number(hoursRaw);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			return fail("TICKETS_DELETE_AFTER_HOURS deve ser um número maior que 0.");
		}
		deleteAfterHours = parsed;
	}

	const summaryChannelId = (env.TICKETS_SUMMARY_CHANNEL_ID ?? "").trim() || null;

	const guildId = (env.GUILD_ID ?? "").trim() || DEFAULT_GUILD_ID;

	return {
		config: { guildId, staffRoleIds, logChannelId, startNumber, deleteAfterHours, summaryChannelId },
		error: null,
	};
}

export function isStaff(memberRoleIds: readonly string[], hasManageGuild: boolean, staffRoleIds: readonly string[]): boolean {
	if (hasManageGuild) {
		return true;
	}
	return memberRoleIds.some((roleId) => staffRoleIds.includes(roleId));
}
