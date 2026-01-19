"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const globalDB = new mongoose_1.Schema({
    id: {
        required: true,
        type: String,
    },
    blacklistedUsers: {
        type: Array,
        default: [],
    },
    classes: {
        enabled: {
            type: Boolean,
            default: false,
        },
        reason: {
            type: String,
            default: "Motivo não especificado",
        },
    },
    helped: {
        type: Number,
        default: 1,
    },
    urlsDeleted: {
        type: Number,
        default: 1
    },
    whitelistedUrl: {
        type: Array,
        default: [],
    },
    whitelistedUrlEnabled: {
        type: Boolean,
        default: true,
    },
    ignoredChannels: {
        type: Array,
        default: [],
    },
    ignoredUsers: {
        type: Array,
        default: [],
    },
    usersInCooldown: {
        type: Array,
        default: [],
    },
    music: {
        blacklistedUsers: {
            type: Array,
            default: [],
        },
        restrictedChannels: {
            type: Array,
            default: [],
        },
    },
}, {
    versionKey: false,
});
exports.default = (0, mongoose_1.model)("Global", globalDB);
