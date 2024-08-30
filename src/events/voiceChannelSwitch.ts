import { Member, StageChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";

export default class voiceChannelSwitch {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, oldChannel: VoiceChannel | StageChannel | Uncached, newChannel: VoiceChannel | StageChannel | Uncached) {

        if (oldChannel.id === newChannel.id) return;
  
        if (member.bot) return;

        this.client.emit("voiceChannelLeave", member, oldChannel);

        this.client.emit("voiceChannelJoin", member, newChannel);

        console.log(`Usuário ${member.username} trocou de canal de voz`);
    }
}
