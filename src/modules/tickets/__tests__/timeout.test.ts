import { test } from "node:test";
import assert from "node:assert/strict";
import { withTimeout } from "../timeout";

test("withTimeout resolves with the value when the promise is fast", async () => {
	assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
});

test("withTimeout rejects when the promise never settles", async () => {
	await assert.rejects(withTimeout(new Promise(() => undefined), 20), /Tempo esgotado/);
});
