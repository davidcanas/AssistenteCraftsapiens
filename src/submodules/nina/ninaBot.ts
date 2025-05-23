import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { DefaultQueue } from "vulkava";
import { CommandInteraction } from "oceanic.js";

const ninaBot = new subClient(process.env.NINA_TOKEN);

ninaBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] Nina Bot está online!");
  ninaBot.connectLavaLink();
  ninaBot.registerSlashCommands();

  ninaBot.editStatus("idle", [{ name: `🎷 | Pronta para ajudar você estudando!`, type: 2 }]);
  setTimeout(playPlaylist, 25000); 
});

async function playPlaylist() {
  const currPlayer = ninaBot.music.players.get("892472046729179136");
  if (currPlayer) return;

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = ninaBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1005889464293392466",
        selfDeaf: true,
      });

      player.connect();
      const res = await ninaBot.music.search(playlist.jazz[0].url, "soundcloud");

      if (res.loadType !== "PLAYLIST_LOADED" && res.loadType !== "TRACK_LOADED") {
        console.log(res.loadType);
        console.log(res.exception.message);
        throw new Error("Não foi possível carregar a playlist.");
      }

      res.tracks.forEach(track => {
        track.setRequester(ninaBot.user);
        player.queue.add(track);
      });

      (player.queue as DefaultQueue).shuffle();
      player.setQueueLoop(true);

      if (!player.playing) player.play();

      console.log(`Tocando playlist: ${res.playlistInfo.name}`);
      return; 
    } catch (error) {
      attempts++;
      console.error(`Erro ao tocar a playlist automaticamente. Tentativa ${attempts} de ${maxRetries + 1}:`, error);

      if (attempts > maxRetries) {
        console.error("Número máximo de tentativas atingido. Não foi possível tocar a playlist.");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 6500));
    }
  }
}


ninaBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "nina") return;

  const player = ninaBot.music.players.get(interaction.guildID);
  if (!player || !player.current) {
    return interaction.createMessage({ content: "Não estou tocando nnina no momento." });
  }

  const track = player.current;
  const progressBar = ninaBot.progressBar((player.position/1000), (track.duration/1000), 20);

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

export default ninaBot;
