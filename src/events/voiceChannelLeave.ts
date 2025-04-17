import { Member, StageChannel, TextChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";

export default class voiceChannelLeave {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, channel: VoiceChannel | StageChannel | Uncached) {
        const studyChannels = ["1005889304658202704", "1005889381762084976", "1005889464293392466"];
        if (!studyChannels.includes(channel.id)) return;
        if (member.bot) return;

        const user = await this.client.db.users.findOne({ id: member.id });
        if (!user || !user.voiceSessions || user.voiceSessions.length === 0) return;

        const session = user.voiceSessions.find((s: any) =>
            s.channel === channel.id && s.leaveTime === null
        );
        if (!session) return;

        const leaveTime = new Date();
        const joinTime = new Date(session.joinTime);
        const duration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);

        // calcula total antes e depois
        const previousTotal = user.totalTimeInCall ?? 0;
        const newTotal = previousTotal + duration;

        // Mensagem de debug completa
        const debugEmbed = {
            title: "🛠️ Debug VoiceSession End",
            description: "Detalhes da sessão de voz encerrada",
            color: 0x7289DA, // cor de debug (Discord blurple)
            timestamp: new Date().toISOString(),
            fields: [
                { name: "👤 Usuário", value: `${member.username} (${member.id})`, inline: true },
                { name: "🔊 Canal", value: `${channel.id}`, inline: true },
                { name: "🆔 Sessão ID", value: `${session._id}`, inline: true },
                { name: "⏱️ Join Time", value: `${joinTime.toISOString()}`, inline: true },
                { name: "🏁 Leave Time", value: `${leaveTime.toISOString()}`, inline: true },
                { name: "⏳ Duração (s)", value: `${duration}`, inline: true },
                { name: "📊 Total Anterior (s)", value: `${previousTotal}`, inline: true },
                { name: "📈 Total Atual (s)", value: `${newTotal}`, inline: true },
                { name: "🔢 Sessões totais", value: `${user.voiceSessions.length}`, inline: true },
            ],
        };

        const ch = this.client
            .guilds.get("892472046729179136")!
            .channels.get("1362465635120058478") as TextChannel;
        await ch.createMessage({ embeds: [debugEmbed] });

        // Atualiza DB com leaveTime, duration e totalTimeInCall
        await this.client.db.users.updateOne(
            { id: member.id, "voiceSessions._id": session._id },
            {
                $set: {
                    "voiceSessions.$.leaveTime": leaveTime,
                    "voiceSessions.$.duration": duration,
                    lastTimeInCall: leaveTime,
                },
                $inc: {
                    totalTimeInCall: duration,
                },
            }
        );
    }
}   
