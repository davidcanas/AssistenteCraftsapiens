import { Member, StageChannel, Uncached, VoiceChannel, TextChannel } from "oceanic.js";
import Client from "../structures/Client";
import { ObjectId } from "mongodb";

export default class voiceChannelSwitch {
    client: Client;
    guildID = "892472046729179136";
    debugChannelID = "1362465635120058478";

    constructor(client: Client) {
        this.client = client;
    }

    async run(
        member: Member,
        oldChannel: VoiceChannel | StageChannel | Uncached,
        newChannel: VoiceChannel | StageChannel | Uncached
    ) {
        if (oldChannel.id === newChannel.id) return;
        if (member.bot) return;

        const studyChannels: { [key: string]: string } = {
            "Ada": "1005889304658202704",
            "Luy": "1005889381762084976",
            "Nina": "1005889464293392466"
        };

        const ch = this.client.guilds
            .get(this.guildID)!
            .channels.get(this.debugChannelID) as TextChannel;

        // WHEN LEAVING A STUDY CHANNEL
        if (Object.values(studyChannels).includes(oldChannel.id) && !Object.values(studyChannels).includes(newChannel.id)) {
            const user = await this.client.db.users.findOne({ id: member.id });
            if (!user || !user.voiceSessions?.length) return;

            const session = user.voiceSessions.find((s: any) => s._id && s.leaveTime === null);
            if (!session) return;

            const leaveTime = new Date();
            const joinTime = new Date(session.joinTime);
            const duration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);

            // Debug embed for leave
            const debugEmbedLeave = {
                title: "🛠️ Debug VoiceSession Switch - Leave",
                description: "Detalhes do encerramento de sessão ao trocar de canal",
                color: 0x7289DA,
                timestamp: new Date().toISOString(),
                fields: [
                    { name: "👤 Usuário", value: `${member.username} (${member.id})`, inline: true },
                    { name: "🔊 Canal antigo", value: `${oldChannel.id}`, inline: true },
                    { name: "🆔 Sessão ID", value: `${session._id}`, inline: true },
                    { name: "⏱️ Join Time", value: `${joinTime.toISOString()}`, inline: true },
                    { name: "🏁 Leave Time", value: `${leaveTime.toISOString()}`, inline: true },
                    { name: "⏳ Duração (s)", value: `${duration}`, inline: true },
                    { name: "📊 Total anterior (s)", value: `${user.totalTimeInCall ?? 0}`, inline: true },
                    { name: "📈 Total atual (s)", value: `${(user.totalTimeInCall ?? 0) + duration}`, inline: true }
                ]
            };
            await ch.createMessage({ embeds: [debugEmbedLeave] });

            await this.client.db.users.updateOne(
                { id: member.id, "voiceSessions._id": session._id },
                {
                    $set: {
                        "voiceSessions.$.leaveTime": leaveTime,
                        "voiceSessions.$.duration": duration,
                        lastTimeInCall: leaveTime
                    },
                    $inc: { totalTimeInCall: duration }
                }
            );
        }
        // WHEN JOINING A STUDY CHANNEL
        else if (!Object.values(studyChannels).includes(oldChannel.id) && Object.values(studyChannels).includes(newChannel.id)) {
            const user = await this.client.db.users.findOne({ id: member.id }) || { voiceSessions: [], totalTimeInCall: 0 };
            const previousSessions = user.voiceSessions.length;
            const previousTotal = user.totalTimeInCall || 0;

            const joinTime = new Date();
            const newSessionId = new ObjectId();

            await this.client.db.users.updateOne(
                { id: member.id },
                {
                    $push: {
                        voiceSessions: {
                            _id: newSessionId,
                            channel: newChannel.id,
                            joinTime,
                            leaveTime: null,
                            duration: 0
                        }
                    }
                }
            );

            // Debug embed for join
            const debugEmbedJoin = {
                title: "🛠️ Debug VoiceSession Switch - Join",
                description: "Detalhes da nova sessão ao trocar de canal",
                color: 0x7289DA,
                timestamp: new Date().toISOString(),
                fields: [
                    { name: "👤 Usuário", value: `${member.username} (${member.id})`, inline: true },
                    { name: "🔊 Canal novo", value: `${newChannel.id}`, inline: true },
                    { name: "🆔 Sessão ID", value: `${newSessionId}`, inline: true },
                    { name: "🕒 Join Time", value: `${joinTime.toISOString()}`, inline: true },
                    { name: "📊 Sessões anteriores", value: `${previousSessions}`, inline: true },
                    { name: "📈 Sessões atuais", value: `${previousSessions + 1}`, inline: true },
                    { name: "⏳ TotalTimeInCall (s)", value: `${previousTotal}`, inline: true }
                ]
            };
            await ch.createMessage({ embeds: [debugEmbedJoin] });
        }

        this.client.emit("voiceChannelLeave", member, oldChannel);
        setTimeout(async () => {
            this.client.emit("voiceChannelJoin", member, newChannel);
        }, 1000);

        console.log(`Usuário ${member.username} trocou de canal de voz`);
    }
}
