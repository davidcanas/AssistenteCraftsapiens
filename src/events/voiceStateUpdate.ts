import { JSONVoiceState, Member } from "oceanic.js";
import Client from "../structures/Client";

export default class voiceChannelSwitch {
    client: Client;
    guildID = "892472046729179136";
    debugChannelID = "1362465635120058478";

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, oldState: null | JSONVoiceState) {
        console.log("Old state", oldState.selfDeaf);
        console.log("New state", member.voiceState?.selfDeaf);

    }
}
