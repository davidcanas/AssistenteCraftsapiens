"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Esquema para as sessões de voz
const VoiceSessionSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, default: () => new mongoose_1.Types.ObjectId() },
    channel: { type: String, required: true },
    joinTime: { type: Date, required: true },
    leaveTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }
});
// Esquema para o usuário
const userDBSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    nick: { type: String, default: null },
    voiceSessions: [VoiceSessionSchema], // Definido como um array de subdocumentos
    totalTimeInCall: { type: Number, default: 0 },
    lastTimeInCall: { type: Date, default: null },
    punicoes: { type: [mongoose_1.Schema.Types.Mixed], default: [] }, // Array de objetos
}, {
    versionKey: false,
});
exports.default = (0, mongoose_1.model)("user", userDBSchema);
