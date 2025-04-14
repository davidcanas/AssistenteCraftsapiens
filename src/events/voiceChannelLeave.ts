import { Member, StageChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";

export default class voiceChannelLeave {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, channel: VoiceChannel | StageChannel | Uncached) {

        const studyChannels = ["1005889304658202704", "1005889381762084976", "1005889464293392466", "1272703689567768598"];

        if (!studyChannels.includes(channel.id)) return;

        if(member.bot) return;

        const user = await this.client.db.users.findOne({ id: member.id });

        if (!user || !user.voiceSessions || user.voiceSessions.length === 0) return;

        
        const session = user.voiceSessions.find((session: any) => session.leaveTime === null);

        if (!session) return;

        const leaveTime = new Date();
        const duration = Math.floor((leaveTime.getTime() - new Date(session.joinTime).getTime()) / 1000);


        console.log(`(${member.username} - saiu da Call de Estudo às ${leaveTime}`);

       
        await this.client.db.users.updateOne(
            { id: member.id, "voiceSessions._id": session._id },
            {
                $set: {
                    "voiceSessions.$.leaveTime": leaveTime,
                    "voiceSessions.$.duration": duration,
                    lastTimeInCall: leaveTime
                },
                $inc: {
                    totalTimeInCall: duration
                }
            }
        );
    }
}
