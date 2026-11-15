import fs from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import fetch from "node-fetch";
import type { StoredFile, TranscriptEntry } from "./transcript";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_TIMEOUT_MS = 15_000;
export const ATTACHMENTS_ROOT = path.join(process.cwd(), "data", "tickets");

export interface FetchedFile {
	ok: boolean;
	headers: { get(name: string): string | null };
	body: NodeJS.ReadableStream;
}

export type Fetcher = (url: string, init: { timeout: number; signal: AbortSignal }) => Promise<FetchedFile>;

// Tickets com download em andamento: o purge de canais pula esses (apagar o canal apaga os anexos do Discord).
export const downloadsEmAndamento = new Set<string>();

const defaultFetcher: Fetcher = async (url, init) => {
	const res = await fetch(url, init as any);
	return { ok: res.ok, headers: res.headers, body: res.body };
};

export function sanitizeFileName(name: string): string {
	const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 100);
	return clean || "arquivo";
}

export function attachmentName(url: string): string {
	try {
		const segments = new URL(url).pathname.split("/");
		return decodeURIComponent(segments[segments.length - 1]) || "arquivo";
	} catch {
		return "arquivo";
	}
}

// Grava o corpo em disco contando bytes; estoura o limite com erro e apaga o parcial.
async function downloadTo(file: string, fetched: FetchedFile): Promise<void> {
	const length = Number(fetched.headers.get("content-length"));
	if (Number.isFinite(length) && length > MAX_ATTACHMENT_BYTES) {
		(fetched.body as any).destroy?.();
		throw new Error(`Anexo acima do limite (${length} bytes)`);
	}

	let received = 0;
	const counter = new Transform({
		transform(chunk, _encoding, callback) {
			received += chunk.length;
			if (received > MAX_ATTACHMENT_BYTES) {
				callback(new Error("Anexo acima do limite durante o download"));
				return;
			}
			callback(null, chunk);
		},
	});

	try {
		await pipeline(fetched.body, counter, fs.createWriteStream(file));
	} catch (error) {
		await fs.promises.rm(file, { force: true });
		throw error;
	}
}

export async function storeAttachments(
	ticketId: string,
	entries: TranscriptEntry[],
	opts: { root?: string; fetchFn?: Fetcher; timeoutMs?: number } = {},
): Promise<TranscriptEntry[]> {
	const root = opts.root ?? ATTACHMENTS_ROOT;
	const fetchFn = opts.fetchFn ?? defaultFetcher;
	const timeoutMs = opts.timeoutMs ?? ATTACHMENT_TIMEOUT_MS;
	const dir = path.join(root, ticketId);
	downloadsEmAndamento.add(ticketId);
	try {
		return await storeAll(ticketId, entries, dir, fetchFn, timeoutMs);
	} finally {
		downloadsEmAndamento.delete(ticketId);
	}
}

async function storeAll(
	_ticketId: string,
	entries: TranscriptEntry[],
	dir: string,
	fetchFn: Fetcher,
	timeoutMs: number,
): Promise<TranscriptEntry[]> {
	await fs.promises.mkdir(dir, { recursive: true });

	let index = 0;
	const result: TranscriptEntry[] = [];
	for (const entry of entries) {
		if (entry.attachments.length === 0) {
			result.push({ ...entry });
			continue;
		}

		const files: StoredFile[] = [];
		for (const url of entry.attachments) {
			const name = attachmentName(url);
			const stored = `${index}-${sanitizeFileName(name)}`;
			index++;
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const fetched = await fetchFn(url, { timeout: timeoutMs, signal: controller.signal });
				if (!fetched.ok) {
					(fetched.body as any).destroy?.();
					throw new Error(`Download falhou para ${name}`);
				}
				await downloadTo(path.join(dir, stored), fetched);
				files.push({ name, stored });
			} catch (error) {
				console.error("[TICKETS]", error);
				files.push({ name, stored: null });
			} finally {
				clearTimeout(timer);
			}
		}
		result.push({ ...entry, files });
	}
	return result;
}
