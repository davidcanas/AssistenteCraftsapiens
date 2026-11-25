import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { CommandInteraction } from "oceanic.js";

const adaBot = new subClient(process.env.ADA_TOKEN);

adaBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] Ada Bot está online!");
  const primeiraConexao = !adaBot.music;
  adaBot.connectLavaLink();
  // Se o Lavalink reiniciar, o node reconecta numa sessão nova, sem os players: recomeça a playlist.
  if (primeiraConexao) adaBot.music.nodeManager.on("connect", () => setTimeout(playPlaylist, 25000));
  adaBot.registerSlashCommands();

  adaBot.editStatus("idle", [{ name: `🎻 | Pronta para ajudar você estudando!`, type: 2 }]);
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
  const currPlayer = adaBot.music.players.get("892472046729179136");
  const naCall = adaBot.guilds.get("892472046729179136")?.voiceStates.get(adaBot.user.id)?.channelID === "1005889304658202704";
  if (currPlayer?.playing && naCall) return;
  // Player parado ou bot fora da call (ex.: caiu numa reconexão com o Discord ou o Lavalink reiniciou):
  // recomeça do zero. Depois de um reinício do Lavalink o player já não existe lá, então a remoção pode falhar.
  if (currPlayer) await currPlayer.destroy().catch(() => { });

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = adaBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1005889304658202704",
        selfDeaf: true,
      });

      await player.connect();
      const res = await adaBot.music.search(playlist.classical[0].url, adaBot.user);

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


adaBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "ada") return;

  const player = adaBot.music.players.get(interaction.guildID);
  if (!player || !player.queue.current) {
    return interaction.createMessage({ content: "Não estou tocando nada no momento." });
  }

  const track = player.queue.current;
  // Rádio ao vivo: não tem duração nem nome da faixa, mostra a rádio.
  if (track.info.isStream) {
    return interaction.createMessage({ embeds: [{ title: "🎻 Clássica | Tocando agora:", description: `🔴 Ao vivo: **${playlist.classical[0].title}**`, color: Math.floor(Math.random() * 16777215) }] });
  }
  const progressBar = adaBot.progressBar((player.position / 1000), (track.info.duration / 1000), 20);
  const embed = {
    title: "🎻 Clássica | Tocando agora:",
    description: `\`\`\`\n${progressBar}\n[${adaBot.MsToHour(player.position)}]            [${adaBot.MsToHour(track.info.duration)}]\n\`\`\``,
    fields: [
      { name: "🎶 Título:", value: `\`${track.info.title}\``, inline: false },
      { name: "⏲️ Duração:", value: `\`${adaBot.MsToHour(track.info.duration)}\``, inline: false },
    ],
    thumbnail: { url: track.info.artworkUrl },
    color: Math.floor(Math.random() * 16777215),
  };

  interaction.createMessage({ embeds: [embed] });
});


adaBot.connect();

export default adaBot;
