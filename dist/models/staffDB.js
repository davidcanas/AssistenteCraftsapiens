"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const staffDB = new mongoose_1.Schema({
    nick: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    notes: {
        type: Array,
        default: [],
    },
}, {
    versionKey: false,
});
exports.default = (0, mongoose_1.model)("Staff", staffDB);
