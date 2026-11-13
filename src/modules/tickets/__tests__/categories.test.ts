import { test } from "node:test";
import assert from "node:assert/strict";
import { TICKET_CATEGORIES, getCategory } from "../categories";

test("has the 5 categories in order", () => {
	assert.deepEqual(TICKET_CATEGORIES.map((c) => c.id), ["denuncia", "duvida", "bug", "recurso", "vip"]);
});

test("fields fit Discord limits", () => {
	for (const category of TICKET_CATEGORIES) {
		assert.ok(category.fields.length >= 1 && category.fields.length <= 5, `${category.id} has ${category.fields.length} fields`);
		for (const field of category.fields) {
			assert.ok(field.label.length <= 45, `${category.id}.${field.id} label too long`);
		}
		const ids = category.fields.map((f) => f.id);
		assert.equal(new Set(ids).size, ids.length, `${category.id} has duplicate field ids`);
	}
});

test("getCategory", () => {
	assert.equal(getCategory("bug")?.label, "Bug");
	assert.equal(getCategory("x"), undefined);
});
