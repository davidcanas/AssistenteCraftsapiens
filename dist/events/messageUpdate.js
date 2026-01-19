"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MessageUpdate {
    constructor(client) {
        this.client = client;
    }
    run(message, oldMessage) {
        if (!oldMessage || !message || oldMessage.content === message.content)
            return;
        this.client.emit("messageCreate", message);
    }
}
exports.default = MessageUpdate;
