import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { CommandInteraction } from "oceanic.js";

const ninaBot = new subClient(process.env.NINA_TOKEN);

ninaBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] Nina Bot está online!");
  const primeiraConexao = !ninaBot.music;
  ninaBot.connectLavaLink();
  // Se o Lavalink reiniciar, o node reconecta numa sessão nova, sem os players: recomeça a playlist.
  if (primeiraConexao) ninaBot.music.nodeManager.on("connect", () => setTimeout(playPlaylist, 25000));
  ninaBot.registerSlashCommands();

  ninaBot.editStatus("idle", [{ name: `🎷 | Pronta para ajudar você estudando!`, type: 2 }]);
  setTimeout(playPlaylist, 25000); 
});

// Discord e Lavalink podem pedir a playlist quase ao mesmo tempo (ex.: na inicialização): uma por vez.
let iniciando = false;
async function playPlaylist() {
  if (iniciando) return;
  iniciando = true;
  try {
    await iniciarPlaylist();
  } finally {
    iniciando = false;
  }
}

async function iniciarPlaylist() {
  const currPlayer = ninaBot.music.players.get("892472046729179136");
  const naCall = ninaBot.guilds.get("892472046729179136")?.voiceStates.get(ninaBot.user.id)?.channelID === "1005889464293392466";
  if (currPlayer?.playing && naCall) return;
  // Player parado ou bot fora da call (ex.: caiu numa reconexão com o Discord ou o Lavalink reiniciou):
  // recomeça do zero. Depois de um reinício do Lavalink o player já não existe lá, então a remoção pode falhar.
  if (currPlayer) await currPlayer.destroy().catch(() => { });

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = ninaBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1005889464293392466",
        selfDeaf: true,
      });

      await player.connect();
      const res = await ninaBot.music.search(playlist.jazz[0].url, ninaBot.user);

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
  if (!player || !player.queue.current) {
    return interaction.createMessage({ content: "Não estou tocando nnina no momento." });
  }

  const track = player.queue.current;
  const progressBar = ninaBot.progressBar((player.position/1000), (track.info.duration/1000), 20);

  const embed = {
    title: "🎷 Jazz | Tocando agora:",
    description: `\`\`\`\n${progressBar}\n[${ninaBot.MsToHour(player.position)}]            [${ninaBot.MsToHour(track.info.duration)}]\n\`\`\``,
    fields: [
      { name: "🎶 Título:", value: `\`${track.info.title}\``, inline: false },
      { name: "⏲️ Duração:", value: `\`${ninaBot.MsToHour(track.info.duration)}\``, inline: false },
    ],
    thumbnail: { url: track.info.artworkUrl },
    color: Math.floor(Math.random() * 16777215),
  };

  interaction.createMessage({ embeds: [embed] });
});


ninaBot.connect();

export default ninaBot;
