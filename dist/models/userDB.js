"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const VoiceSessionSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.ObjectId, default: () => new mongoose_1.Types.ObjectId() },
    id: { type: String, required: true },
    joinTime: { type: Date, required: true },
    leaveTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }
});
const MonthlyStatSchema = new mongoose_1.Schema({
    month: { type: String, required: true },
    totalTime: { type: Number, default: 0 },
});
const userDBSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    nick: { type: String, default: null },
    voiceSessions: [VoiceSessionSchema],
    totalTimeInCall: { type: Number, default: 0 },
    lastTimeInCall: { type: Date, default: null },
    punicoes: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    monthlyStats: { type: [MonthlyStatSchema], default: [] },
}, {
    versionKey: false,
});
exports.default = (0, mongoose_1.model)("user", userDBSchema);
