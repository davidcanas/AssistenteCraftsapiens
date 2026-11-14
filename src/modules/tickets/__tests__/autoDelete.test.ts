import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { PANEL_REPLY_TTL_MS, deleteReplyLater } from "../autoDelete";

test("deleteReplyLater deletes the reply after 5 minutes and ignores failures", async () => {
	mock.timers.enable({ apis: ["setTimeout"] });
	try {
		let calls = 0;
		deleteReplyLater({ deleteOriginal: async () => { calls++; throw new Error("Unknown Message"); } });

		assert.equal(PANEL_REPLY_TTL_MS, 300_000);
		mock.timers.tick(PANEL_REPLY_TTL_MS - 1);
		assert.equal(calls, 0);
		mock.timers.tick(1);
		assert.equal(calls, 1);
		await Promise.resolve(); // a rejeição é engolida sem derrubar o processo
	} finally {
		mock.timers.reset();
	}
});
