"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const subClient_1 = __importDefault(require("../../structures/sub/subClient"));
const playlist_json_1 = __importDefault(require("../../../playlist.json"));
const oceanic_js_1 = require("oceanic.js");
const ninaBot = new subClient_1.default(process.env.NINA_TOKEN);
ninaBot.on("ready", async () => {
    console.log("\x1b[34m[SUB] Nina Bot está online!");
    ninaBot.connectLavaLink();
    ninaBot.registerSlashCommands();
    ninaBot.editStatus("idle", [{ name: `🎷 | Pronta para ajudar você estudando!`, type: 2 }]);
    setTimeout(playPlaylist, 25000);
});
async function playPlaylist() {
    const currPlayer = ninaBot.music.players.get("892472046729179136");
    if (currPlayer)
        return;
    try {
        const player = ninaBot.music.createPlayer({
            guildId: "892472046729179136",
            voiceChannelId: "1005889464293392466",
            selfDeaf: true,
        });
        player.connect();
        const res = await ninaBot.music.search(playlist_json_1.default.jazz[0].url);
        if (res.loadType !== "PLAYLIST_LOADED")
            throw new Error("Não foi possível carregar a playlist.");
        res.tracks.forEach(track => {
            track.setRequester(ninaBot.user);
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
ninaBot.on("interactionCreate", async (interaction) => {
    if (!(interaction instanceof oceanic_js_1.CommandInteraction) || interaction.data.name !== "nina")
        return;
    const player = ninaBot.music.players.get(interaction.guildID);
    if (!player || !player.current) {
        return interaction.createMessage({ content: "Não estou tocando nada no momento." });
    }
    const track = player.current;
    const progressBar = ninaBot.progressBar((player.position / 1000), (track.duration / 1000), 20);
    const embed = {
        title: "🎷 Jazz | Tocando agora:",
        description: `\`\`\`\n${progressBar}\n[${ninaBot.MsToHour(player.position)}]            [${ninaBot.MsToHour(track.duration)}]\n\`\`\``,
        fields: [
            { name: "🎶 Título:", value: `\`${track.title}\``, inline: false },
            { name: "⏲️ Duração:", value: `\`${ninaBot.MsToHour(track.duration)}\``, inline: false },
        ],
        thumbnail: { url: track.thumbnail },
        color: Math.floor(Math.random() * 16777215),
    };
    interaction.createMessage({ embeds: [embed] });
});
ninaBot.connect();
exports.default = ninaBot;
