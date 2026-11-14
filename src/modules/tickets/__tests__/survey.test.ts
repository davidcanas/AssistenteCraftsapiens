import { test } from "node:test";
import assert from "node:assert/strict";
import { SURVEY_QUESTIONS, surveyDoneMessage, surveyOpeningMessage, surveyMessageAt, surveyQuestionMessage, previousMonthRange, summarizeMonth, monthlySummaryEmbed } from "../survey";
import { COLOR_PRIMARY, EMPTY } from "../style";

function customIds(message: ReturnType<typeof surveyQuestionMessage>): string[] {
	const rows = (message.components ?? []) as Array<{ components: Array<{ customID?: string }> }>;
	return rows.flatMap((row) => row.components.map((c) => c.customID ?? ""));
}

test("questions", () => {
	assert.deepEqual(SURVEY_QUESTIONS.map((q) => q.id), ["resolved", "service", "speed"]);
	for (const q of SURVEY_QUESTIONS) {
		assert.ok(q.options.length >= 2 && q.options.length <= 5);
	}
});

test("first question message", () => {
	const m = surveyQuestionMessage("t1", 0);
	assert.equal(m.content, "");
	const embed = m.embeds?.[0];
	assert.equal(embed?.title, "⭐ Avalie o atendimento");
	assert.equal(embed?.description, "**Seu problema foi resolvido?**");
	assert.match(embed?.footer?.text ?? "", /Pergunta 1\/3/);
	assert.match(embed?.footer?.text ?? "", /anônimas/);
	assert.deepEqual(customIds(m), ["ticket:rate:t1:0:2", "ticket:rate:t1:0:1", "ticket:rate:t1:0:0"]);
});

test("second question has 1..5", () => {
	assert.deepEqual(customIds(surveyQuestionMessage("t1", 1)), [1, 2, 3, 4, 5].map((n) => `ticket:rate:t1:1:${n}`));
});

test("scale question shows the legend and plain primary buttons", () => {
	const m = surveyQuestionMessage("t1", 1);
	assert.match(m.embeds?.[0].description ?? "", /1 = muito ruim · 5 = excelente/);
	const buttons = (m.components as Array<{ components: Array<{ style: number; emoji?: unknown }> }>)[0].components;
	assert.ok(buttons.every((b) => b.style === 1 && b.emoji === undefined));
});

test("resolved question buttons have style and emoji", () => {
	const buttons = (surveyQuestionMessage("t1", 0).components as Array<{ components: Array<{ style: number; emoji?: { name: string } }> }>)[0].components;
	assert.deepEqual(buttons.map((b) => [b.style, b.emoji?.name]), [[3, "✅"], [2, "〰️"], [4, "❌"]]);
});

test("done message has no components", () => {
	const m = surveyDoneMessage();
	assert.deepEqual(m.components, []);
	assert.equal(m.content, "");
	assert.equal(m.embeds?.[0].title, "✅ Avaliação registrada");
	assert.ok(m.embeds?.[0].description?.includes("apagado"));
});

test("opening message pings the player on the first question", () => {
	const m = surveyOpeningMessage("t1", "u1");
	assert.equal(m.content, "<@u1>");
	assert.deepEqual(m.allowedMentions, { users: ["u1"] });
	assert.deepEqual(m.components, surveyQuestionMessage("t1", 0).components);
});

test("previousMonthRange", () => {
	const r = previousMonthRange(new Date("2026-11-01T12:00:00Z"));
	assert.equal(r.start.toISOString(), "2026-10-01T03:00:00.000Z");
	assert.equal(r.end.toISOString(), "2026-11-01T03:00:00.000Z");
	assert.equal(r.label, "outubro de 2026");
	assert.equal(previousMonthRange(new Date("2026-11-01T02:00:00Z")).label, "setembro de 2026");
	assert.equal(previousMonthRange(new Date("2027-01-01T12:00:00Z")).label, "dezembro de 2026");
});

const tickets = [
	{ claimedBy: "s1", category: "denuncia", survey: [{ questionId: "resolved", value: 2 }, { questionId: "service", value: 5 }, { questionId: "speed", value: 4 }] },
	{ claimedBy: "s1", category: "duvida", survey: [{ questionId: "resolved", value: 0 }, { questionId: "service", value: 3 }] },
	{ claimedBy: null, category: "duvida", survey: [] },
	{ claimedBy: "s2", category: "bug", survey: [] },
];

test("summarizeMonth", () => {
	const s = summarizeMonth(tickets);
	assert.equal(s.total, 4);
	assert.deepEqual(s.byCategory, { denuncia: 1, duvida: 2, bug: 1 });
	assert.deepEqual(s.overall, { staffId: null, handled: 4, rated: 2, resolvedPct: 50, serviceAvg: 4, speedAvg: 4 });
	const s1 = s.perStaff.find((x) => x.staffId === "s1");
	assert.deepEqual(s1, { staffId: "s1", handled: 2, rated: 2, resolvedPct: 50, serviceAvg: 4, speedAvg: 4 });
	const s2 = s.perStaff.find((x) => x.staffId === "s2");
	assert.deepEqual(s2, { staffId: "s2", handled: 1, rated: 0, resolvedPct: null, serviceAvg: null, speedAvg: null });
	assert.equal(s.perStaff[s.perStaff.length - 1].staffId, null);
	assert.equal(s.perStaff[0].staffId, "s1");
});

test("summarizeMonth credits superiors who took part, without double counting", () => {
	const s = summarizeMonth([
		{ claimedBy: "s1", helpers: ["s1", "m1"], category: "duvida", survey: [{ questionId: "service", value: 5 }] },
		{ claimedBy: null, helpers: ["m1"], category: "bug", survey: [] },
		{ claimedBy: "s1", category: "bug", survey: [] },
	]);
	assert.equal(s.total, 3);
	assert.equal(s.overall.handled, 3);
	assert.deepEqual(s.perStaff.find((x) => x.staffId === "s1"), { staffId: "s1", handled: 2, rated: 1, resolvedPct: null, serviceAvg: 5, speedAvg: null });
	assert.deepEqual(s.perStaff.find((x) => x.staffId === "m1"), { staffId: "m1", handled: 2, rated: 1, resolvedPct: null, serviceAvg: 5, speedAvg: null });
	assert.equal(s.perStaff.some((x) => x.staffId === null), false);
});

test("summary embed fallbacks", () => {
	const json = JSON.stringify(monthlySummaryEmbed(summarizeMonth(tickets), "outubro de 2026"));
	assert.ok(json.includes("<@s1>"));
	assert.ok(json.includes("Sem atendente"));
	assert.ok(json.includes("—"));
	assert.ok(json.includes("Resumo de tickets — outubro de 2026"));
});

test("summary embed hides a staff's averages with fewer than 3 ratings", () => {
	const rated = (claimedBy: string) => ({
		claimedBy,
		category: "duvida",
		survey: [{ questionId: "resolved", value: 2 }, { questionId: "service", value: 5 }, { questionId: "speed", value: 4 }],
	});
	const embed = monthlySummaryEmbed(summarizeMonth([rated("few"), rated("few"), rated("many"), rated("many"), rated("many")]), "outubro de 2026");
	const lines = (embed.fields ?? []).filter((f) => f.name.startsWith("Por staff")).map((f) => f.value).join("\n").split("\n");
	const few = lines.find((l) => l.includes("<@few>")) ?? "";
	const many = lines.find((l) => l.includes("<@many>")) ?? "";
	assert.ok(few.includes("2 avaliados"));
	assert.ok(!few.includes("5.0") && !few.includes("100%"));
	assert.ok(few.includes("3+ avaliações"));
	assert.ok(many.includes("atendimento 5.0") && many.includes("resolvido 100%"));
});

test("summary embed splits staff lines into fields of at most 1024 chars", () => {
	const many = Array.from({ length: 30 }, (_, i) => ({
		claimedBy: `1000000000000000${String(i).padStart(2, "0")}`,
		category: "duvida",
		survey: [{ questionId: "resolved", value: 2 }, { questionId: "service", value: 5 }, { questionId: "speed", value: 4 }],
	}));
	const embed = monthlySummaryEmbed(summarizeMonth(many), "outubro de 2026");
	const fields = embed.fields ?? [];
	for (const field of fields) {
		assert.ok(field.value.length <= 1024, `${field.name}: ${field.value.length}`);
	}
	const staffFields = fields.filter((f) => f.name.startsWith("Por staff"));
	assert.ok(staffFields.length > 1);
	assert.equal(staffFields[0].name, "Por staff");
	assert.equal(staffFields[1].name, "Por staff (cont.)");
	const text = staffFields.map((f) => f.value).join("\n");
	for (const ticket of many) {
		assert.ok(text.includes(`<@${ticket.claimedBy}>`));
	}
});

test("surveyMessageAt shows the pending question or the done message", () => {
	assert.deepEqual(surveyMessageAt("t1", 0), surveyQuestionMessage("t1", 0));
	assert.deepEqual(surveyMessageAt("t1", 2), surveyQuestionMessage("t1", 2));
	assert.deepEqual(surveyMessageAt("t1", SURVEY_QUESTIONS.length), surveyDoneMessage());
	assert.deepEqual(surveyMessageAt("t1", SURVEY_QUESTIONS.length + 1), surveyDoneMessage());
});

test("summary embed uses the shared colour and empty marker", () => {
	const embed = monthlySummaryEmbed(summarizeMonth([]), "outubro de 2026");
	assert.equal(embed.color, COLOR_PRIMARY);
	assert.equal(embed.fields?.[0].value, EMPTY);
});
