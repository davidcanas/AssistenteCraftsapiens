import { Schema, model, type Document, type Model } from "mongoose";
import { TICKET_CATEGORIES, type TicketAnswer, type TicketCategoryId } from "./categories";
import type { SurveyAnswer } from "./survey";
import type { StoredFile, TranscriptEntry } from "./transcript";

export interface TicketDoc extends Document {
	number: number;
	guildId: string;
	channelId: string;
	userId: string;
	category: TicketCategoryId;
	answers: TicketAnswer[];
	status: "open" | "closed";
	claimedBy: string | null;
	// Superiores que assumiram um "Chamar superior" (o atendente original continua em claimedBy).
	helpers: string[];
	closedBy: string | null;
	createdAt: Date;
	claimedAt: Date | null;
	closedAt: Date | null;
	deleteAt: Date | null;
	channelDeletedAt: Date | null;
	welcomeMessageId: string | null;
	transcript: TranscriptEntry[];
	survey: SurveyAnswer[];
}

const answerSchema = new Schema<TicketAnswer>(
	{
		label: { type: String, required: true },
		value: { type: String, default: "" },
	},
	{ _id: false },
);

const transcriptEntrySchema = new Schema<TranscriptEntry>(
	{
		authorId: { type: String, required: true },
		authorTag: { type: String, required: true },
		content: { type: String, default: "" },
		attachments: { type: [String], default: [] },
		files: {
			type: [new Schema<StoredFile>({ name: { type: String, required: true }, stored: { type: String, default: null } }, { _id: false })],
			default: undefined,
		},
		createdAt: { type: Date, required: true },
	},
	{ _id: false },
);

const surveyAnswerSchema = new Schema<SurveyAnswer>(
	{
		questionId: { type: String, required: true },
		value: { type: Number, required: true },
		answeredAt: { type: Date, required: true },
	},
	{ _id: false },
);

const ticketSchema = new Schema<TicketDoc>(
	{
		number: { type: Number, required: true },
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		userId: { type: String, required: true },
		category: { type: String, required: true, enum: TICKET_CATEGORIES.map((category) => category.id) },
		answers: { type: [answerSchema], default: [] },
		status: { type: String, required: true, enum: ["open", "closed"], default: "open" },
		claimedBy: { type: String, default: null },
		helpers: { type: [String], default: [] },
		closedBy: { type: String, default: null },
		createdAt: { type: Date, default: () => new Date() },
		claimedAt: { type: Date, default: null },
		closedAt: { type: Date, default: null },
		deleteAt: { type: Date, default: null },
		channelDeletedAt: { type: Date, default: null },
		welcomeMessageId: { type: String, default: null },
		transcript: { type: [transcriptEntrySchema], default: [] },
		survey: { type: [surveyAnswerSchema], default: [] },
	},
	{ versionKey: false },
);

ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
// Limpeza de canais fechados (roda a cada minuto).
ticketSchema.index({ guildId: 1, status: 1, channelDeletedAt: 1, deleteAt: 1 });
// Lista do site: tickets do servidor ordenados por data de criação.
ticketSchema.index({ guildId: 1, createdAt: -1 });
// Lista do site filtrada por atendente que assumiu o ticket.
ticketSchema.index({ guildId: 1, claimedBy: 1, createdAt: -1 });
// Lista do site filtrada por atendente que ajudou no ticket.
ticketSchema.index({ guildId: 1, helpers: 1, createdAt: -1 });
// Métricas: tickets fechados por período de fechamento.
ticketSchema.index({ guildId: 1, status: 1, closedAt: -1 });
// Busca do ticket pelo canal do Discord.
ticketSchema.index({ channelId: 1 });

export const Ticket: Model<TicketDoc> = model<TicketDoc>("Ticket", ticketSchema);

interface TicketCounterDoc {
	_id: string;
	seq: number;
}

const COUNTER_ID = "ticket";

const counterSchema = new Schema<TicketCounterDoc>(
	{
		_id: { type: String, required: true },
		seq: { type: Number },
	},
	{ versionKey: false },
);

const TicketCounter = model<TicketCounterDoc>("TicketCounter", counterSchema, "TicketCounter");

export async function syncCounter(startNumber: number): Promise<void> {
	await TicketCounter.updateOne(
		{ _id: COUNTER_ID },
		{ $max: { seq: startNumber - 1 } },
		{ upsert: true },
	);
}

export async function nextTicketNumber(startNumber: number): Promise<number> {
	// Pipeline atômico: aplica o piso (startNumber - 1) e incrementa na mesma operação,
	// então a numeração nunca recomeça do 1, mesmo se o syncCounter do boot falhar.
	const counter = await TicketCounter.findOneAndUpdate(
		{ _id: COUNTER_ID },
		[{ $set: { seq: { $add: [{ $max: [{ $ifNull: ["$seq", 0] }, startNumber - 1] }, 1] } } }],
		{ upsert: true, new: true },
	);
	return counter.seq;
}
