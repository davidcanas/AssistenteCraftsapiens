import { test } from "node:test";
import assert from "node:assert/strict";
import { SURVEY_QUESTIONS, surveyDoneMessage, surveyQuestionMessage, previousMonthRange, summarizeMonth, monthlySummaryEmbed } from "../survey";

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
	assert.match(m.content ?? "", /\(1\/3\)/);
	assert.match(m.content ?? "", /anônimas/);
	assert.deepEqual(customIds(m), ["ticket:rate:t1:0:2", "ticket:rate:t1:0:1", "ticket:rate:t1:0:0"]);
});

test("second question has 1..5", () => {
	assert.deepEqual(customIds(surveyQuestionMessage("t1", 1)), [1, 2, 3, 4, 5].map((n) => `ticket:rate:t1:1:${n}`));
});

test("done message has no components", () => {
	assert.deepEqual(surveyDoneMessage().components, []);
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

test("summary embed fallbacks", () => {
	const json = JSON.stringify(monthlySummaryEmbed(summarizeMonth(tickets), "outubro de 2026"));
	assert.ok(json.includes("<@s1>"));
	assert.ok(json.includes("Sem atendente"));
	assert.ok(json.includes("—"));
	assert.ok(json.includes("Resumo de tickets — outubro de 2026"));
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
