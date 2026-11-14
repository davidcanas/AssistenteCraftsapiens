import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCustomId, parseCustomId } from "../customIds";

test("buildCustomId", () => {
	assert.equal(buildCustomId("open", "bug"), "ticket:open:bug");
	assert.equal(buildCustomId("claim", "abc"), "ticket:claim:abc");
});

test("parseCustomId reads action and arg", () => {
	assert.deepEqual(parseCustomId("ticket:close-confirm:abc"), { action: "close-confirm", arg: "abc" });
});

test("parseCustomId keeps everything after the action as arg", () => {
	assert.deepEqual(parseCustomId("ticket:close-confirm:t1:0:2"), { action: "close-confirm", arg: "t1:0:2" });
});

test("parseCustomId without arg yields null", () => {
	assert.deepEqual(parseCustomId("ticket:claim"), { action: "claim", arg: null });
	assert.deepEqual(parseCustomId("ticket:claim:"), { action: "claim", arg: null });
});

test("parseCustomId rejects foreign or unknown ids", () => {
	assert.equal(parseCustomId("confirm_ban_123"), null);
	assert.equal(parseCustomId("ticket:unknown:x"), null);
});

test("close-confirm custom id fits Discord's 100 char limit", () => {
	assert.ok(buildCustomId("close-confirm", "a".repeat(24)).length <= 100);
});

test("parseCustomId reads open-confirm and open-cancel", () => {
	assert.deepEqual(parseCustomId("ticket:open-confirm:denuncia"), { action: "open-confirm", arg: "denuncia" });
	assert.deepEqual(parseCustomId("ticket:open-cancel"), { action: "open-cancel", arg: null });
});

test("parseCustomId reads rate", () => {
	assert.deepEqual(parseCustomId("ticket:rate:t1:0:2"), { action: "rate", arg: "t1:0:2" });
});

test("parseCustomId reads escalate and escalate-claim", () => {
	assert.deepEqual(parseCustomId("ticket:escalate:t1"), { action: "escalate", arg: "t1" });
	assert.deepEqual(parseCustomId("ticket:escalate-claim:t1"), { action: "escalate-claim", arg: "t1" });
});
