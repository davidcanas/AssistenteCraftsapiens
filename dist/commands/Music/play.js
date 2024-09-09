"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
class play extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "play",
            description: "Toca uma música ",
            category: "Music",
            aliases: ["p", "tocar"],
            options: [{
                    name: "music",
                    description: "A música a tocar",
                    type: 3,
                    required: true,
                }],
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        if (!ctx.args[0]) {
            ctx.sendMessage("Você precisa escolher uma música para tocar!");
            return;
        }
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        const canPlay = await this.client.music.canPlay(ctx, currPlayer);
        if (!canPlay)
            return;
        const voiceChannelID = ctx.member?.voiceState.channelID;
        const voiceChannel = this.client.getChannel(voiceChannelID);
        const createPlayer = () => {
            const player = this.client.music.createPlayer({
                guildId: ctx.guild?.id,
                voiceChannelId: voiceChannelID,
                textChannelId: ctx.channel.id,
                selfDeaf: true,
            });
            return player;
        };
        try {
            const res = await this.client.music.search(ctx.args.join(" "));
            if (res.loadType === "LOAD_FAILED") {
                ctx.sendMessage(`Erro: \`${res.exception?.message}\``);
            }
            else if (res.loadType === "NO_MATCHES") {
                ctx.sendMessage("Não encontrei essa musica.");
            }
            else {
                const player = currPlayer || createPlayer();
                if (player.state === vulkava_1.ConnectionState.DISCONNECTED) {
                    if (!voiceChannel
                        .permissionsOf(this.client.user.id)
                        .has("MANAGE_CHANNELS") &&
                        voiceChannel.userLimit &&
                        voiceChannel.voiceMembers.size >= voiceChannel.userLimit) {
                        ctx.sendMessage({
                            content: "Não consigo entrar no canal de voz",
                            flags: 1 << 6,
                        });
                        player.destroy();
                        return;
                    }
                    player.connect();
                }
                player.textChannelId = ctx.channel.id;
                if (res.loadType === "PLAYLIST_LOADED") {
                    const playlist = res.playlistInfo;
                    for (const track of res.tracks) {
                        track.setRequester(ctx.author);
                        player.queue.add(track);
                    }
                    if (!player.playing)
                        player.play();
                    const embed = new this.client.embed()
                        .setColor("RANDOM")
                        .setTitle("Carreguei uma playlist")
                        .addField("Nome:", "`" + playlist.name + "`")
                        .addField("Total de musicas:", "`" + res.tracks.length + "`")
                        .setTimestamp()
                        .setFooter("Suporte | Assistente Craftsapiens", ctx.author.defaultAvatarURL());
                    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
                    urlRegex.test(ctx.args[0]) && embed.setURL(ctx.args[0]);
                    ctx.sendMessage({ embeds: [embed] });
                }
                else {
                    const tracks = res.tracks;
                    tracks[0].setRequester(ctx.author);
                    player.queue.add(tracks[0]);
                    ctx.sendMessage(`🎵 \`${tracks[0].title}\` adicionada á lista com sucesso`);
                    if (!player.playing)
                        player.play();
                }
            }
        }
        catch (err) {
            ctx.sendMessage(`Erro: \`${err.message}\``);
        }
    }
}
exports.default = play;
