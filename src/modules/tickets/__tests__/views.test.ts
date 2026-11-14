import assert from "node:assert/strict";
import { test } from "node:test";
import { MessageFlags } from "oceanic.js";
import { TICKET_CATEGORIES, getCategory } from "../categories";
import {
	categoryModal,
	closeConfirmMessage,
	closedNoticeMessage,
	closedChannelName,
	escalationClaimedMessage,
	escalationMessage,
	logMessage,
	openConfirmMessage,
	openLimitText,
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

test("panelMessage has one select menu with one option per category", () => {
	const menus = buttonsOf(panelMessage().components) as Array<{
		customID: string;
		options: Array<{ value: string; description: string }>;
	}>;
	assert.equal(menus.length, 1);
	assert.equal(menus[0].customID, "ticket:open");
	assert.deepEqual(menus[0].options.map((o) => o.value), TICKET_CATEGORIES.map((c) => c.id));
	for (const option of menus[0].options) {
		assert.ok(option.description.length > 0 && option.description.length <= 100);
	}
});

test("openConfirmMessage lists open tickets and offers open-another or cancel", () => {
	const category = getCategory("denuncia");
	assert.ok(category);
	const one = openConfirmMessage(category, ["c1"]);
	assert.ok(one.content?.includes("1 ticket aberto: <#c1>"));
	assert.ok(one.content?.includes("Denúncia"));
	assert.ok(((one.flags ?? 0) & MessageFlags.EPHEMERAL) !== 0);
	assert.deepEqual(buttonsOf(one.components).map((b) => b.customID), ["ticket:open-confirm:denuncia", "ticket:open-cancel"]);
	assert.ok(openConfirmMessage(category, ["c1", "c2"]).content?.includes("2 tickets abertos: <#c1>, <#c2>"));
});

test("openLimitText asks to close one first", () => {
	const text = openLimitText(["c1", "c2", "c3"]);
	assert.ok(text.includes("3 tickets abertos: <#c1>, <#c2>, <#c3>"));
	assert.ok(text.includes("Feche um deles"));
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

test("welcomeMessage closed disables every button", () => {
	const buttons = buttonsOf(welcomeMessage({ ...baseWelcome, closed: true }).components);
	assert.equal(buttons.length, 4);
	assert.ok(buttons.every((b) => b.disabled === true));
});

test("welcomeMessage unclaimed", () => {
	const msg = welcomeMessage(baseWelcome);
	assert.ok(msg.content?.includes("<@u1>"));
	assert.ok(msg.content?.includes("<@&r1>"));
	assert.deepEqual(msg.allowedMentions, { users: ["u1"], roles: ["r1"] });
	const buttons = buttonsOf(msg.components);
	assert.deepEqual(buttons.map((b) => b.customID), ["ticket:claim:t1", "ticket:profile:t1", "ticket:escalate:t1", "ticket:close:t1"]);
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

test("closedNoticeMessage embeds who closed and a relative timestamp without pings", () => {
	const msg = closedNoticeMessage("u1", new Date(1700000000 * 1000));
	const embed = msg.embeds?.[0];
	assert.equal(embed?.title, "🔒 Ticket fechado");
	assert.ok(embed?.description?.includes("<@u1>"));
	assert.ok(embed?.description?.includes("<t:1700000000:R>"));
	assert.deepEqual(msg.allowedMentions, {});
});

test("welcomeMessage lists everyone who took part in the ticket", () => {
	const msg = welcomeMessage({ ...baseWelcome, claimedBy: "s1", helpers: ["s1", "m1", "m2"] });
	const field = msg.embeds?.[0].fields?.find((f) => f.name === "Atendido por");
	assert.equal(field?.value, "<@s1>\n<@m1>\n<@m2>");
	const unclaimed = welcomeMessage({ ...baseWelcome, helpers: ["m1"] });
	assert.equal(unclaimed.embeds?.[0].fields?.find((f) => f.name === "Atendido por")?.value, "<@m1>");
	assert.equal(buttonsOf(unclaimed.components)[0].disabled, undefined);
});

test("escalationMessage pings the escalation roles and offers a claim button", () => {
	const msg = escalationMessage({ ticketId: "t1", number: 9100, channelId: "c1", requestedBy: "s1", roleIds: ["r7", "r8"] });
	assert.ok(msg.content?.includes("<@&r7> <@&r8>"));
	assert.deepEqual(msg.allowedMentions, { users: [], roles: ["r7", "r8"] });
	const json = JSON.stringify(msg.embeds);
	assert.ok(json.includes("<#c1>") && json.includes("<@s1>") && json.includes("9100"));
	assert.deepEqual(buttonsOf(msg.components).map((b) => b.customID), ["ticket:escalate-claim:t1:s1"]);
});

test("escalationClaimedMessage shows who took it and disables the button", () => {
	const view = { ticketId: "t1", number: 9100, channelId: "c1", requestedBy: "s1", roleIds: ["r7"] };
	const msg = escalationClaimedMessage(view, "m1");
	assert.ok(JSON.stringify(msg.embeds).includes("<@m1>"));
	assert.ok(buttonsOf(msg.components).every((b) => b.disabled === true));
});

test("logMessage lists helpers next to who claimed", () => {
	const msg = logMessage(
		{ number: 9100, categoryLabel: "Bug", userId: "u1", claimedBy: "s1", helpers: ["m1"], closedBy: "s1", openedAt: new Date(0), closedAt: new Date(0) },
		"abc",
	);
	const json = JSON.stringify(msg.embeds);
	assert.ok(json.includes("<@s1>\\n<@m1>"));
});
