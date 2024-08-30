import { Schema, model, Document, Types } from "mongoose";

// Interface para o documento do usuário
interface VoiceSession {
    _id: Types.ObjectId;
    channel: string;
    joinTime: Date;
    leaveTime: Date | null;
    duration: number;
}

interface userDB extends Document {
    id: string;
    nick: string;
    voiceSessions: VoiceSession[];
    totalTimeInCall: number;
    lastTimeInCall: Date | null;
    punicoes: Array<object>;
}

// Esquema para as sessões de voz
const VoiceSessionSchema = new Schema<VoiceSession>({
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    channel: { type: String, required: true },
    joinTime: { type: Date, required: true },
    leaveTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }
});

// Esquema para o usuário
const userDBSchema = new Schema<userDB>({
    id: { type: String, required: true },
    nick: { type: String, default: null },
    voiceSessions: [VoiceSessionSchema], // Definido como um array de subdocumentos
    totalTimeInCall: { type: Number, default: 0 },
    lastTimeInCall: { type: Date, default: null },
    punicoes: { type: [Schema.Types.Mixed], default: [] }, // Array de objetos
}, {
    versionKey: false,
});

export default model<userDB>("user", userDBSchema);
