import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { DefaultQueue } from "vulkava";
import { CommandInteraction } from "oceanic.js";

const adaBot = new subClient(process.env.ADA_TOKEN);

adaBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] Ada Bot está online!");
  adaBot.connectLavaLink();
  adaBot.registerSlashCommands();

  adaBot.editStatus("idle", [{ name: `🎻 | Pronta para ajudar você estudando!`, type: 2 }]);
  setTimeout(playPlaylist, 25000); 
});

async function playPlaylist() {
  const currPlayer = adaBot.music.players.get("892472046729179136");
  if (currPlayer) return;

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = adaBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1005889304658202704",
        selfDeaf: true,
      });

      player.connect();
      const res = await adaBot.music.search(playlist.classical[0].url, "soundcloud");

      if (res.loadType !== "PLAYLIST_LOADED") throw new Error("Não foi possível carregar a playlist.");

      res.tracks.forEach(track => {
        track.setRequester(adaBot.user);
        player.queue.add(track);
      });

      (player.queue as DefaultQueue).shuffle();
      player.setQueueLoop(true);

      if (!player.playing) player.play();

      console.log(`Tocando playlist: ${res.playlistInfo.name}`);
      return; // Sai da função se a playlist tocar com sucesso
    } catch (error) {
      attempts++;
      console.error(`Erro ao tocar a playlist automaticamente. Tentativa ${attempts} de ${maxRetries + 1}:`, error);

      if (attempts > maxRetries) {
        console.error("Número máximo de tentativas atingido. Não foi possível tocar a playlist.");
        return;
      }

      // Aguarda 5 segundos antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 6500));
    }
  }
}


adaBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "ada") return;

  const player = adaBot.music.players.get(interaction.guildID);
  if (!player || !player.current) {
    return interaction.createMessage({ content: "Não estou tocando nada no momento." });
  }

  const track = player.current;
  const progressBar = adaBot.progressBar((player.position/1000), (track.duration/1000), 20);
  const embed = {
    title: "🎻 Clássica | Tocando agora:",
    description: `\`\`\`\n${progressBar}\n[${adaBot.MsToHour(player.position)}]            [${adaBot.MsToHour(track.duration)}]\n\`\`\``,
    fields: [
      { name: "🎶 Título:", value: `\`${track.title}\``, inline: false },
      { name: "⏲️ Duração:", value: `\`${adaBot.MsToHour(track.duration)}\``, inline: false },
    ],
    thumbnail: { url: track.thumbnail },
    color: Math.floor(Math.random() * 16777215),
  };

  interaction.createMessage({ embeds: [embed] });
});


adaBot.connect();

export default adaBot;
