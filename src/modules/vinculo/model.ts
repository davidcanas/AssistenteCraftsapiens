import { Schema, model } from "mongoose";

export interface VinculoDoc {
	discordId: string;
	uuid: string;
	nick: string | null;
	origem: "discordsrv" | "assistente";
	vinculadoEm: Date;
}

const vinculoSchema = new Schema<VinculoDoc>(
	{
		discordId: { type: String, required: true, unique: true },
		// Sempre em minúsculas (normalizado na borda do serviço).
		uuid: { type: String, required: true, unique: true },
		nick: { type: String, default: null },
		origem: { type: String, enum: ["discordsrv", "assistente"], required: true },
		vinculadoEm: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export const Vinculo = model<VinculoDoc>("vinculo", vinculoSchema);
