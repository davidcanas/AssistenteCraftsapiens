import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { DefaultQueue } from "vulkava";
import { CommandInteraction } from "oceanic.js";

const luyBot = new subClient(process.env.LUY_TOKEN);

luyBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] luy Bot está online!");
  luyBot.connectLavaLink();
  luyBot.registerSlashCommands();

  luyBot.editStatus("idle", [{ name: `🎧 | Pronto para ajudar você estudando!`, type: 2 }]);
  setTimeout(playPlaylist, 15000); 
});

async function playPlaylist() {
  try {
    const player = luyBot.music.createPlayer({
      guildId: "892472046729179136",
      voiceChannelId: "1005889381762084976",
      selfDeaf: true,
    });

    player.connect();
    const res = await luyBot.music.search(playlist.lofi[0].url);

    if (res.loadType !== "PLAYLIST_LOADED") throw new Error("Não foi possível carregar a playlist.");

    res.tracks.forEach(track => {
      track.setRequester(luyBot.user);
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

luyBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "luy") return;

  const player = luyBot.music.players.get(interaction.guildID);
  if (!player || !player.current) {
    return interaction.createMessage({ content: "Não estou tocando nada no momento." });
  }

  const track = player.current;
  const progressBar = luyBot.progressBar((player.position/1000), (track.duration/1000), 20);

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

export default luyBot;