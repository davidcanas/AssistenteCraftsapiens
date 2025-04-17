import { Schema, model, Document, Types } from "mongoose";

interface VoiceSession {
    _id: Types.ObjectId;
    id: string;
    joinTime: Date;
    leaveTime: Date | null;
    duration: number;
}

interface MonthlyStat {
    month: string; // formato: "2025-04"
    totalTime: number;
}

interface userDB extends Document {
    id: string;
    nick: string;
    voiceSessions: VoiceSession[];
    totalTimeInCall: number;
    lastTimeInCall: Date | null;
    punicoes: Array<object>;
    monthlyStats: MonthlyStat[];
}


const VoiceSessionSchema = new Schema<VoiceSession>({
    _id: { type: Schema.Types.ObjectId, default: () => new Types.ObjectId() },
    id: { type: String, required: true },
    joinTime: { type: Date, required: true },
    leaveTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }
});

const MonthlyStatSchema = new Schema<MonthlyStat>({
    month: { type: String, required: true },
    totalTime: { type: Number, default: 0 },
});

const userDBSchema = new Schema<userDB>({
    id: { type: String, required: true },
    nick: { type: String, default: null },
    voiceSessions: [VoiceSessionSchema], 
    totalTimeInCall: { type: Number, default: 0 },
    lastTimeInCall: { type: Date, default: null },
    punicoes: { type: [Schema.Types.Mixed], default: [] },
    monthlyStats: { type: [MonthlyStatSchema], default: [] },
}, {
    versionKey: false,
});

export default model<userDB>("user", userDBSchema);
