"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class voiceChannelJoin {
    constructor(client) {
        this.client = client;
    }
    async run(member, channel) {
        const studyChannels = ["1005889304658202704", "1005889381762084976", "1005889464293392466", "1272703689567768598"];
        if (!studyChannels.includes(channel.id))
            return;
        if (member.bot)
            return;
        const user = await this.client.db.users.findOne({ id: member.id });
        if (!user) {
            await this.client.db.users.create({
                _id: new mongodb_1.ObjectId(),
                id: member.id,
                nick: member.nick || null,
                voiceSessions: []
            });
        }
        const joinTime = new Date();
        console.log(`(${member.username} - entrou na Call de Estudo às ${joinTime}`);
        await this.client.db.users.updateOne({ id: member.id }, {
            $push: {
                voiceSessions: {
                    _id: new mongodb_1.ObjectId(),
                    channel: channel.id,
                    joinTime: joinTime,
                    leaveTime: null,
                    duration: 0
                }
            }
        });
    }
}
exports.default = voiceChannelJoin;
