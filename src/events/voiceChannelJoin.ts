import { Member, StageChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";
import { ObjectId } from "mongodb";

export default class voiceChannelJoin {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, channel: VoiceChannel | StageChannel | Uncached) {

        const studyChannels = ["1005889304658202704", "1005889381762084976", "1005889464293392466", "1272703689567768598"];

        if (!studyChannels.includes(channel.id)) return;

        if (member.bot) return;

        const user = await this.client.db.users.findOne({ id: member.id });

        if (!user) {
            await this.client.db.users.create({
                _id: new ObjectId(),
                id: member.id,
                nick: member.nick || null,
                voiceSessions: []
            });
        }

        const joinTime = new Date();

        console.log(`(${member.username} - entrou na Call de Estudo às ${joinTime}`);

        if (user && user.voiceSessions.find((s: any) => s.channel === channel.id && s.leaveTime === null)) {
            console.log(`(${member.username} - já está na Call de Estudo, não foi possível adicionar uma nova sessão, evitando possivel bug :D :sunglasses:, eu me amo.`);
            return;
        }

        await this.client.db.users.updateOne(
            { id: member.id },
            {
                $push: {
                    voiceSessions: {
                        _id: new ObjectId(),
                        channel: channel.id,
                        joinTime: joinTime,
                        leaveTime: null,
                        duration: 0
                    }
                }
            }
        );
    }
}
