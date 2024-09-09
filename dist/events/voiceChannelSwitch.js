"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class voiceChannelSwitch {
    constructor(client) {
        this.client = client;
    }
    async run(member, oldChannel, newChannel) {
        if (oldChannel.id === newChannel.id)
            return;
        if (member.bot)
            return;
        this.client.emit("voiceChannelLeave", member, oldChannel);
        this.client.emit("voiceChannelJoin", member, newChannel);
        console.log(`Usuário ${member.username} trocou de canal de voz`);
    }
}
exports.default = voiceChannelSwitch;
