import { Member, StageChannel, Uncached, VoiceChannel } from "oceanic.js";
import Client from "../structures/Client";
import { ObjectId } from "mongodb";
import playlist from "../../playlist.json";
import subClient from "../structures/sub/subClient";
import { DefaultQueue } from "vulkava";

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
          //  "Estudo4": "1272703689567768598"
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

        if (bot && bot.music && player && player.playing) {
            console.log(`(${member.username} - o bot está a tocar "${player.current.title}" nesta Call de Estudo`);
        } else {
            console.log(`(${member.username} - por algum motivo o bot não está a tocar nada nesta Call de Estudo, a tentar iniciar!`);
            try {
                const player = bot.music.createPlayer({
                    guildId: guildID,
                    voiceChannelId: channel.id,
                    selfDeaf: true,
                });

                player.connect();
                const res = await bot.music.search(playlist[selectedPlaylist][0].url);

                if (res.loadType !== "PLAYLIST_LOADED") throw new Error("Não foi possível carregar a playlist.");

                res.tracks.forEach(track => {
                    track.setRequester(bot.user);
                    player.queue.add(track);
                });

                (player.queue as DefaultQueue).shuffle();
                player.setQueueLoop(true);

                if (!player.playing) player.play();

                console.log(`Tocando playlist: ${res.playlistInfo.name}`);
            } catch (error) {
                console.error("Erro ao tocar a playlist automaticamente:", error);
            }
        }

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
            console.log(`(${member.username} - já está na Call de Estudo, não foi possível adicionar uma nova sessão, evitando possível bug :D :sunglasses:, eu me amo.`);
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
