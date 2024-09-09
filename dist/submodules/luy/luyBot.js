"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subClient_1 = __importDefault(require("../../structures/sub/subClient"));
const playlist_json_1 = __importDefault(require("../../../playlist.json"));
const oceanic_js_1 = require("oceanic.js");
const luyBot = new subClient_1.default(process.env.LUY_TOKEN);
luyBot.once("ready", async () => {
    console.log("\x1b[34m[SUB] luy Bot está online!");
    luyBot.connectLavaLink();
    luyBot.registerSlashCommands();
    luyBot.editStatus("idle", [{ name: `🎧 | Pronto para ajudar você estudando!`, type: 2 }]);
    setTimeout(playPlaylist, 25000);
});
async function playPlaylist() {
    const currPlayer = luyBot.music.players.get("892472046729179136");
    if (currPlayer)
        return;
    try {
        const player = luyBot.music.createPlayer({
            guildId: "892472046729179136",
            voiceChannelId: "1005889381762084976",
            selfDeaf: true,
        });
        player.connect();
        const res = await luyBot.music.search(playlist_json_1.default.lofi[0].url);
        if (res.loadType !== "PLAYLIST_LOADED")
            throw new Error("Não foi possível carregar a playlist.");
        res.tracks.forEach(track => {
            track.setRequester(luyBot.user);
            player.queue.add(track);
        });
        player.queue.shuffle();
        player.setQueueLoop(true);
        if (!player.playing)
            player.play();
        console.log(`Tocando playlist: ${res.playlistInfo.name}`);
    }
    catch (error) {
        console.error("Erro ao tocar a playlist automaticamente:", error);
    }
}
luyBot.on("interactionCreate", async (interaction) => {
    if (!(interaction instanceof oceanic_js_1.CommandInteraction) || interaction.data.name !== "luy")
        return;
    const player = luyBot.music.players.get(interaction.guildID);
    if (!player || !player.current) {
        return interaction.createMessage({ content: "Não estou tocando nada no momento." });
    }
    const track = player.current;
    const progressBar = luyBot.progressBar((player.position / 1000), (track.duration / 1000), 20);
    const embed = {
        title: "🎧 LO-FI | Tocando agora:",
        description: `\`\`\`\n${progressBar}\n[${luyBot.MsToHour(player.position)}]            [${luyBot.MsToHour(track.duration)}]\n\`\`\``,
        fields: [
            { name: "🎶 Título:", value: `\`${track.title}\``, inline: false },
            { name: "⏲️ Duração:", value: `\`${luyBot.MsToHour(track.duration)}\``, inline: false },
        ],
        thumbnail: { url: track.thumbnail },
        color: Math.floor(Math.random() * 16777215),
    };
    interaction.createMessage({ embeds: [embed] });
});
luyBot.connect();
exports.default = luyBot;
