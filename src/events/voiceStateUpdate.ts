import { Member } from "oceanic.js";
import Client from "../structures/Client";

export default class voiceChannelSwitch {
    client: Client;
    guildID = "892472046729179136";
    debugChannelID = "1362465635120058478";

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member) {

        // const guildID = "892472046729179136";

        const studyChannels: { [key: string]: string } = {
            "Ada": "1005889304658202704",
            "Luy": "1005889381762084976",
            "Nina": "1005889464293392466"
        };

        if (!Object.values(studyChannels).includes(member.voiceState.channelID)) return;
        if (member.bot) return;


        if (member.voiceState.selfDeaf === true) {
            console.log("User " + member.username + " is deafened");
            await member.edit({channelID: null});
        }
        if (member.voiceState.selfDeaf === false) {
            console.log("User " + member.username + " is undeafened");
        }

    }
}
