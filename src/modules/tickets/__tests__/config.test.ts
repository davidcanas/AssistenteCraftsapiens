import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTicketsConfig, isStaff, memberIsStaff, type TicketsConfig } from "../config";

const base = { TICKETS_ENABLED: "true", TICKETS_STAFF_ROLE_IDS: " 1, 2 ", TICKETS_LOG_CHANNEL_ID: "9" };

test("disabled when TICKETS_ENABLED is absent or not 'true'", () => {
	assert.deepEqual(parseTicketsConfig({}), { config: null, error: null });
	assert.deepEqual(parseTicketsConfig({ ...base, TICKETS_ENABLED: "false" }), { config: null, error: null });
});

test("applies defaults", () => {
	assert.deepEqual(parseTicketsConfig(base), { error: null, config: {
		guildId: "892472046729179136", staffRoleIds: ["1", "2"], logChannelId: "9", startNumber: 8917, deleteAfterHours: 24, summaryChannelId: null,
	} });
});

test("reads overrides", () => {
	const { config } = parseTicketsConfig({ ...base, GUILD_ID: "123", TICKETS_START_NUMBER: "9100", TICKETS_DELETE_AFTER_HOURS: "12" });
	assert.equal(config?.guildId, "123");
	assert.equal(config?.startNumber, 9100);
	assert.equal(config?.deleteAfterHours, 12);
});

test("reads summary channel", () => {
	assert.equal(parseTicketsConfig({ ...base, TICKETS_SUMMARY_CHANNEL_ID: "77" }).config?.summaryChannelId, "77");
});

test("missing required vars disable with an error naming the var", () => {
	const a = parseTicketsConfig({ ...base, TICKETS_STAFF_ROLE_IDS: "" });
	assert.equal(a.config, null);
	assert.match(a.error ?? "", /TICKETS_STAFF_ROLE_IDS/);
	const b = parseTicketsConfig({ ...base, TICKETS_LOG_CHANNEL_ID: undefined });
	assert.match(b.error ?? "", /TICKETS_LOG_CHANNEL_ID/);
});

test("invalid numbers disable with an error", () => {
	assert.match(parseTicketsConfig({ ...base, TICKETS_START_NUMBER: "abc" }).error ?? "", /TICKETS_START_NUMBER/);
	assert.match(parseTicketsConfig({ ...base, TICKETS_DELETE_AFTER_HOURS: "0" }).error ?? "", /TICKETS_DELETE_AFTER_HOURS/);
});

test("isStaff", () => {
	assert.equal(isStaff(["5", "2"], false, ["1", "2"]), true);
	assert.equal(isStaff([], true, ["1"]), true);
	assert.equal(isStaff(["5"], false, ["1"]), false);
	assert.equal(isStaff([], false, []), false);
});

test("memberIsStaff reads roles and Manage Server from the member", () => {
	const config = { staffRoleIds: ["1"] } as TicketsConfig;
	const member = (roles: string[], manageGuild: boolean) =>
		({ roles, permissions: { has: (perm: string) => perm === "MANAGE_GUILD" && manageGuild } }) as unknown as Parameters<typeof memberIsStaff>[0];
	assert.equal(memberIsStaff(member(["1"], false), config), true);
	assert.equal(memberIsStaff(member([], true), config), true);
	assert.equal(memberIsStaff(member(["5"], false), config), false);
	assert.equal(memberIsStaff(null, config), false);
	assert.equal(memberIsStaff(undefined, config), false);
});
