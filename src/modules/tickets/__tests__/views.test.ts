import assert from "node:assert/strict";
import { test } from "node:test";
import { TICKET_CATEGORIES, getCategory } from "../categories";
import {
	categoryModal,
	closeConfirmMessage,
	closedChannelName,
	logMessage,
	panelMessage,
	profileEmbed,
	ticketChannelName,
	welcomeMessage,
	type PlayerProfile,
	type WelcomeView,
} from "../views";
import { COLOR_PRIMARY, EMPTY } from "../style";

interface AnyRow { components: Array<{ customID?: string; disabled?: boolean; required?: boolean }>; }

function buttonsOf(rows: unknown): Array<{ customID?: string; disabled?: boolean }> {
	return (rows as AnyRow[]).flatMap((row) => row.components);
}

const baseWelcome: WelcomeView = {
	ticketId: "t1",
	number: 9100,
	userId: "u1",
	categoryId: "denuncia",
	answers: [{ label: "O que aconteceu", value: "algo" }],
	staffRoleIds: ["r1"],
	claimedBy: null,
};

test("channel names", () => {
	assert.equal(ticketChannelName(9100), "ticket-9100");
	assert.equal(closedChannelName(9100), "closed-9100");
});

test("panelMessage has one button per category", () => {
	const ids = buttonsOf(panelMessage().components).map((b) => b.customID);
	assert.deepEqual(ids, TICKET_CATEGORIES.map((c) => "ticket:open:" + c.id));
});

test("categoryModal for denuncia", () => {
	const category = getCategory("denuncia");
	assert.ok(category);
	const modal = categoryModal(category);
	assert.equal(modal.customID, "ticket:modal:denuncia");
	const inputs = buttonsOf(modal.components) as Array<{ customID: string; required: boolean }>;
	assert.deepEqual(inputs.map((i) => i.customID), ["reported_nick", "what_happened", "evidence_links"]);
	assert.deepEqual(inputs.map((i) => i.required), [true, true, false]);
	assert.ok(modal.title.length <= 45);
});

test("welcomeMessage unclaimed", () => {
	const msg = welcomeMessage(baseWelcome);
	assert.ok(msg.content?.includes("<@u1>"));
	assert.ok(msg.content?.includes("<@&r1>"));
	assert.deepEqual(msg.allowedMentions, { users: ["u1"], roles: ["r1"] });
	const buttons = buttonsOf(msg.components);
	assert.deepEqual(buttons.map((b) => b.customID), ["ticket:claim:t1", "ticket:profile:t1", "ticket:close:t1"]);
	assert.ok(!buttons[0].disabled);
});

test("welcomeMessage claimed", () => {
	const msg = welcomeMessage({ ...baseWelcome, claimedBy: "s1" });
	assert.equal(buttonsOf(msg.components)[0].disabled, true);
	assert.ok(msg.embeds?.[0].fields?.some((f) => f.value.includes("<@s1>")));
});

test("welcomeMessage empty answer shows dash", () => {
	const msg = welcomeMessage({ ...baseWelcome, answers: [{ label: "X", value: "" }] });
	assert.equal(msg.embeds?.[0].fields?.[0].value, EMPTY);
});

test("profileEmbed shows fallbacks", () => {
	const p: PlayerProfile = { userId: "u1", nick: null, linked: false, api: "unavailable", punishments: "unavailable" };
	const json = JSON.stringify(profileEmbed(p));
	assert.ok(json.includes("Indisponível"));
	assert.ok(json.includes("Não vinculado"));
	assert.ok(JSON.stringify(profileEmbed({ ...p, punishments: { total: 0, last: [] } })).includes("Nenhuma"));
});

test("closeConfirmMessage is ephemeral with a confirm button", () => {
	const msg = closeConfirmMessage("t1");
	assert.equal(msg.flags, 64);
	assert.deepEqual(buttonsOf(msg.components).map((b) => b.customID), ["ticket:close-confirm:t1"]);
});

test("logMessage attaches transcript", () => {
	const msg = logMessage(
		{ number: 9100, categoryLabel: "Bug", userId: "u1", claimedBy: null, closedBy: "s1", openedAt: new Date(0), closedAt: new Date(135 * 60000) },
		"abc",
	);
	assert.equal(msg.files?.[0].name, "ticket-9100.txt");
	assert.equal(msg.files?.[0].contents.toString("utf8"), "abc");
	assert.ok(JSON.stringify(msg.embeds).includes("2h 15min"));
});

test("panel and welcome use the shared primary colour", () => {
	assert.equal(panelMessage().embeds?.[0].color, COLOR_PRIMARY);
	assert.equal(welcomeMessage(baseWelcome).embeds?.[0].color, COLOR_PRIMARY);
});
