"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class voiceChannelSwitch {
    constructor(client) {
        this.guildID = "892472046729179136";
        this.debugChannelID = "1362465635120058478";
        this.client = client;
    }
    async run(member) {
        // const guildID = "892472046729179136";
        const studyChannels = {
            "Ada": "1005889304658202704",
            "Luy": "1005889381762084976",
            "Nina": "1005889464293392466"
        };
        if (!Object.values(studyChannels).includes(member.voiceState.channelID))
            return;
        if (member.bot)
            return;
        if (member.voiceState.selfDeaf === true) {
            console.log("User " + member.username + " is deafened");
            await member.edit({ channelID: null });
        }
        if (member.voiceState.selfDeaf === false) {
            console.log("User " + member.username + " is undeafened");
        }
    }
}
exports.default = voiceChannelSwitch;
