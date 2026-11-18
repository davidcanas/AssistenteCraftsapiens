import { Member, StageChannel, TextChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";
import { ObjectId } from "mongodb";
import playlist from "../../playlist.json";
import subClient from "../structures/sub/subClient";

export default class voiceChannelJoin {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async run(member: Member, channel: VoiceChannel | StageChannel | Uncached) {
        const guildID = "892472046729179136";
        const studyChannels: { [key: string]: string } = {
            "Ada": "1005889304658202704",
            "Luy": "1005889381762084976",
            "Nina": "1005889464293392466"
        };

        if (!Object.values(studyChannels).includes(channel.id)) return;
        if (member.bot) return;

        const botMapping: { [key: string]: any } = {
            [studyChannels["Ada"]]: this.client.ada,
            [studyChannels["Luy"]]: this.client.luy,
            [studyChannels["Nina"]]: this.client.nina,
        };

        const bot = botMapping[channel.id] as subClient;
        const player = bot.music.players.get(guildID);

        const selectedPlaylist =
            channel.id === studyChannels["Ada"] ? "classical" :
            channel.id === studyChannels["Luy"] ? "lofi" :
            channel.id === studyChannels["Nina"] ? "jazz" : "classical";

        let isPlaying = false;
        if (bot && bot.music && player && player.playing) {
            isPlaying = true;
            console.log(`(${member.username} - o bot está a tocar "${player.queue.current?.info.title}" nesta Call de Estudo`);
        } else {
            console.log(`(${member.username} - por algum motivo o bot não está a tocar nada nesta Call de Estudo, a tentar iniciar!`);
            try {
                const player = bot.music.createPlayer({
                    guildId: guildID,
                    voiceChannelId: channel.id,
                    selfDeaf: true,
                });

                await player.connect();
                const res = await bot.music.search(playlist[selectedPlaylist][0].url, bot.user);

                if (res.loadType !== "playlist") throw new Error("Não foi possível carregar a playlist.");

                await player.queue.add(res.tracks);
                await player.queue.shuffle();
                await player.setRepeatMode("queue");

                if (!player.playing) await player.play();

                console.log(`Tocando playlist: ${res.playlist.name}`);
                isPlaying = true;
            } catch (error) {
                console.error("Erro ao tocar a playlist automaticamente:", error);
            }
        }

        // Fetch or create user
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

        // Avoid duplicate session
      //  if (user && user.voiceSessions.find((s: any) => s.channel === channel.id && s.leaveTime === null)) {
        //    console.log(`(${member.username} - já está na Call de Estudo, não foi possível adicionar uma nova sessão, evitando possível bug :D :sunglasses:, eu me amo.`);
        //    return;
        //}

        const newSessionId = new ObjectId();
        const previousSessions = user?.voiceSessions?.length ?? 0;
        const previousTotal = user?.totalTimeInCall ?? 0;

        await this.client.db.users.updateOne(
            { id: member.id },
            {
                $push: {
                    voiceSessions: {
                        _id: newSessionId,
                        id: `${member.id}_${previousSessions + 1}`,
                        joinTime: joinTime,
                        leaveTime: null,
                        duration: 0
                    }
                }
            }
        );

        // Debug embed message
        const debugEmbed = {
            title: "🛠️ Debug VoiceSession Start",
            description: "Detalhes da nova sessão de voz iniciada",
            color: 0x7289DA,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "👤 Usuário",            value: `${member.username} (${member.id})`, inline: true },
                { name: "🔊 Canal",              value: `${channel.id}`,                 inline: true },
                { name: "🆔 Sessão ID",          value: `${newSessionId}`,             inline: true },
                { name: "🏷️ Playlist Selecionada", value: `${selectedPlaylist}`,          inline: true },
                { name: "🕒 Join Time",          value: `${joinTime.toISOString()}`,      inline: true },
                { name: "▶️ Bot Tocando?",        value: `${isPlaying}`,                  inline: true },
                { name: "📊 Sessões Anteriores",  value: `${previousSessions}`,            inline: true },
                { name: "📈 Sessões Atuais",      value: `${previousSessions + 1}`,        inline: true },
                { name: "⏳ TotalTimeInCall (s)", value: `${previousTotal}`,             inline: true }
            ],
        };

        const ch = this.client
            .guilds.get(guildID)!
            .channels.get("1362465635120058478") as TextChannel;
        await ch.createMessage({ embeds: [debugEmbed] });
    }
}
