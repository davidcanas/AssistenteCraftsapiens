import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateBR, formatTranscript, type TranscriptEntry, type TranscriptHeader } from "../transcript";

const header: TranscriptHeader = {
	number: 8917,
	categoryLabel: "Denúncia",
	userTag: "jogador#0001",
	openedAt: new Date("2026-11-13T17:00:00Z"),
	closedAt: new Date("2026-11-13T18:30:00Z"),
	truncated: false,
};

test("formatDateBR renders dd/MM/yyyy HH:mm in America/Sao_Paulo", () => {
	assert.equal(formatDateBR(new Date("2026-11-13T17:05:00Z")), "13/11/2026 14:05");
});

test("formatDateBR uses a 24h clock at midnight", () => {
	assert.equal(formatDateBR(new Date("2026-11-13T03:00:00Z")), "13/11/2026 00:00");
});

test("formatTranscript sorts entries chronologically without mutating the input", () => {
	const entries: TranscriptEntry[] = [
		{ authorId: "2", authorTag: "b", content: "segunda", attachments: [], createdAt: new Date("2026-11-13T17:20:00Z") },
		{ authorId: "1", authorTag: "a", content: "primeira", attachments: [], createdAt: new Date("2026-11-13T17:10:00Z") },
	];
	const snapshot = entries.map((e) => e.content);
	const out = formatTranscript(header, entries);
	assert.deepEqual(entries.map((e) => e.content), snapshot);
	assert.ok(out.indexOf("primeira") < out.indexOf("segunda"));
});

test("formatTranscript writes the header lines in order", () => {
	const out = formatTranscript(header, []);
	assert.deepEqual(out.split("\n"), [
		"Ticket #8917 — Denúncia",
		"Jogador: jogador#0001",
		"Aberto: 13/11/2026 14:00",
		"Fechado: 13/11/2026 15:30",
		"",
	]);
});

test("attachment-only message renders the author line and the attachment line", () => {
	const entries: TranscriptEntry[] = [
		{ authorId: "1", authorTag: "a", content: "", attachments: ["https://x/y.png"], createdAt: new Date("2026-11-13T17:10:00Z") },
	];
	const lines = formatTranscript(header, entries).split("\n");
	assert.equal(lines[5], "[13/11/2026 14:10] a (1): ");
	assert.equal(lines[6], "    📎 https://x/y.png");
});

test("marks truncated transcripts", () => {
	assert.ok(formatTranscript({ ...header, truncated: true }, []).includes("limitada às últimas 2000 mensagens"));
	assert.ok(!formatTranscript({ ...header, truncated: false }, []).includes("limitada às últimas 2000 mensagens"));
});
