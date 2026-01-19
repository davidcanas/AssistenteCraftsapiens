"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const playlist_json_1 = __importDefault(require("../../playlist.json"));
class voiceChannelJoin {
    constructor(client) {
        this.client = client;
    }
    async run(member, channel) {
        const guildID = "892472046729179136";
        const studyChannels = {
            "Ada": "1005889304658202704",
            "Luy": "1005889381762084976",
            "Nina": "1005889464293392466"
        };
        if (!Object.values(studyChannels).includes(channel.id))
            return;
        if (member.bot)
            return;
        const botMapping = {
            [studyChannels["Ada"]]: this.client.ada,
            [studyChannels["Luy"]]: this.client.luy,
            [studyChannels["Nina"]]: this.client.nina,
        };
        const bot = botMapping[channel.id];
        const player = bot.music.players.get(guildID);
        const selectedPlaylist = channel.id === studyChannels["Ada"] ? "classical" :
            channel.id === studyChannels["Luy"] ? "lofi" :
                channel.id === studyChannels["Nina"] ? "jazz" : "classical";
        let isPlaying = false;
        if (bot && bot.music && player && player.playing) {
            isPlaying = true;
            console.log(`(${member.username} - o bot está a tocar "${player.current.title}" nesta Call de Estudo`);
        }
        else {
            console.log(`(${member.username} - por algum motivo o bot não está a tocar nada nesta Call de Estudo, a tentar iniciar!`);
            try {
                const player = bot.music.createPlayer({
                    guildId: guildID,
                    voiceChannelId: channel.id,
                    selfDeaf: true,
                });
                player.connect();
                const res = await bot.music.search(playlist_json_1.default[selectedPlaylist][0].url);
                if (res.loadType !== "PLAYLIST_LOADED")
                    throw new Error("Não foi possível carregar a playlist.");
                res.tracks.forEach(track => {
                    track.setRequester(bot.user);
                    player.queue.add(track);
                });
                player.queue.shuffle();
                player.setQueueLoop(true);
                if (!player.playing)
                    player.play();
                console.log(`Tocando playlist: ${res.playlistInfo.name}`);
                isPlaying = true;
            }
            catch (error) {
                console.error("Erro ao tocar a playlist automaticamente:", error);
            }
        }
        // Fetch or create user
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
        // Avoid duplicate session
        //  if (user && user.voiceSessions.find((s: any) => s.channel === channel.id && s.leaveTime === null)) {
        //    console.log(`(${member.username} - já está na Call de Estudo, não foi possível adicionar uma nova sessão, evitando possível bug :D :sunglasses:, eu me amo.`);
        //    return;
        //}
        const newSessionId = new mongodb_1.ObjectId();
        const previousSessions = user?.voiceSessions?.length ?? 0;
        const previousTotal = user?.totalTimeInCall ?? 0;
        await this.client.db.users.updateOne({ id: member.id }, {
            $push: {
                voiceSessions: {
                    _id: newSessionId,
                    id: `${member.id}_${previousSessions + 1}`,
                    joinTime: joinTime,
                    leaveTime: null,
                    duration: 0
                }
            }
        });
        // Debug embed message
        const debugEmbed = {
            title: "🛠️ Debug VoiceSession Start",
            description: "Detalhes da nova sessão de voz iniciada",
            color: 0x7289DA,
            timestamp: new Date().toISOString(),
            fields: [
                { name: "👤 Usuário", value: `${member.username} (${member.id})`, inline: true },
                { name: "🔊 Canal", value: `${channel.id}`, inline: true },
                { name: "🆔 Sessão ID", value: `${newSessionId}`, inline: true },
                { name: "🏷️ Playlist Selecionada", value: `${selectedPlaylist}`, inline: true },
                { name: "🕒 Join Time", value: `${joinTime.toISOString()}`, inline: true },
                { name: "▶️ Bot Tocando?", value: `${isPlaying}`, inline: true },
                { name: "📊 Sessões Anteriores", value: `${previousSessions}`, inline: true },
                { name: "📈 Sessões Atuais", value: `${previousSessions + 1}`, inline: true },
                { name: "⏳ TotalTimeInCall (s)", value: `${previousTotal}`, inline: true }
            ],
        };
        const ch = this.client
            .guilds.get(guildID)
            .channels.get("1362465635120058478");
        await ch.createMessage({ embeds: [debugEmbed] });
    }
}
exports.default = voiceChannelJoin;
