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

test("parseCustomId reads rate", () => {
	assert.deepEqual(parseCustomId("ticket:rate:t1:0:2"), { action: "rate", arg: "t1:0:2" });
});
