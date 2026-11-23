import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { CommandInteraction } from "oceanic.js";

const luyBot = new subClient(process.env.LUY_TOKEN);

luyBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] luy Bot está online!");
  luyBot.connectLavaLink();
  luyBot.registerSlashCommands();

  luyBot.editStatus("idle", [{ name: `🎧 | Pronto para ajudar você estudando!`, type: 2 }]);
  setTimeout(playPlaylist, 25000); 
});

async function playPlaylist() {
  const currPlayer = luyBot.music.players.get("892472046729179136");
  const naCall = luyBot.guilds.get("892472046729179136")?.voiceStates.get(luyBot.user.id)?.channelID === "1005889381762084976";
  if (currPlayer?.playing && naCall) return;
  // Player parado ou bot fora da call (ex.: caiu numa reconexão com o Discord): recomeça do zero.
  if (currPlayer) await currPlayer.destroy();

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = luyBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1005889381762084976",
        selfDeaf: true,
      });

      await player.connect();
      const res = await luyBot.music.search(playlist.lofi[0].url, luyBot.user);

      if (res.loadType !== "playlist" && res.loadType !== "track") {
        console.log(res.loadType);
        console.log(res.exception?.message);
        throw new Error("Não foi possível carregar a playlist.");
      }

      await player.queue.add(res.tracks);
      await player.queue.shuffle();
      await player.setRepeatMode("queue");

      if (!player.playing) await player.play();

      console.log(`Tocando playlist: ${res.playlist?.name ?? res.tracks[0]?.info.title}`);
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


luyBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "luy") return;

  const player = luyBot.music.players.get(interaction.guildID);
  if (!player || !player.queue.current) {
    return interaction.createMessage({ content: "Não estou tocando nluy no momento." });
  }

  const track = player.queue.current;
  const progressBar = luyBot.progressBar((player.position/1000), (track.info.duration/1000), 20);

  const embed = {
    title: "🎧 LO-FI | Tocando agora:",
    description: `\`\`\`\n${progressBar}\n[${luyBot.MsToHour(player.position)}]            [${luyBot.MsToHour(track.info.duration)}]\n\`\`\``,
    fields: [
      { name: "🎶 Título:", value: `\`${track.info.title}\``, inline: false },
      { name: "⏲️ Duração:", value: `\`${luyBot.MsToHour(track.info.duration)}\``, inline: false },
    ],
    thumbnail: { url: track.info.artworkUrl },
    color: Math.floor(Math.random() * 16777215),
  };

  interaction.createMessage({ embeds: [embed] });
});


luyBot.connect();

export default luyBot;
