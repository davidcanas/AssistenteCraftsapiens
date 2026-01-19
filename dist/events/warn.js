"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class OnWarn {
    constructor(client) {
        this.client = client;
    }
    run(warn) {
        console.warn("[WARN]", warn);
    }
}
exports.default = OnWarn;
