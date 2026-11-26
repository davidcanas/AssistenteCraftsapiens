import subClient from "../../structures/sub/subClient";
import playlist from "../../../playlist.json";
import { CommandInteraction } from "oceanic.js";

const echoBot = new subClient(process.env.ECHO_TOKEN);

echoBot.on("ready", async () => {
  console.log("\x1b[34m[SUB] echo Bot está online!");
  const primeiraConexao = !echoBot.music;
  echoBot.connectLavaLink();
  // Se o Lavalink reiniciar, o node reconecta numa sessão nova, sem os players: recomeça a rádio.
  if (primeiraConexao) echoBot.music.nodeManager.on("connect", () => setTimeout(playPlaylist, 25000));
  // O comando é fixo: o nome de usuário "Echo" estava ocupado no Discord.
  echoBot.registerSlashCommands("echo");

  echoBot.editStatus("idle", [{ name: "🎛️ | Pronta para ajudar você estudando!", type: 2 }]);
  setTimeout(playPlaylist, 25000);
});

// Discord e Lavalink podem pedir a rádio quase ao mesmo tempo (ex.: na inicialização): uma por vez.
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
  const currPlayer = echoBot.music.players.get("892472046729179136");
  const naCall = echoBot.guilds.get("892472046729179136")?.voiceStates.get(echoBot.user.id)?.channelID === "1575615580659126312";
  if (currPlayer?.playing && naCall) return;
  // Player parado ou bot fora da call (ex.: caiu numa reconexão com o Discord ou o Lavalink reiniciou):
  // recomeça do zero. Depois de um reinício do Lavalink o player já não existe lá, então a remoção pode falhar.
  if (currPlayer) await currPlayer.destroy().catch(() => { });

  const maxRetries = 4;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      const player = echoBot.music.createPlayer({
        guildId: "892472046729179136",
        voiceChannelId: "1575615580659126312",
        selfDeaf: true,
      });

      await player.connect();
      const res = await echoBot.music.search(playlist.electronic[0].url, echoBot.user);

      if (res.loadType !== "playlist" && res.loadType !== "track") {
        console.log(res.loadType);
        console.log(res.exception?.message);
        throw new Error("Não foi possível carregar a rádio.");
      }

      await player.queue.add(res.tracks);
      await player.setRepeatMode("queue");

      if (!player.playing) await player.play();

      console.log(`Tocando rádio: ${res.playlist?.name ?? res.tracks[0]?.info.title}`);
      return; // Sai da função se a rádio tocar com sucesso
    } catch (error) {
      attempts++;
      console.error(`Erro ao tocar a rádio automaticamente. Tentativa ${attempts} de ${maxRetries + 1}:`, error);

      if (attempts > maxRetries) {
        console.error("Número máximo de tentativas atingido. Não foi possível tocar a rádio.");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 6500));
    }
  }
}


echoBot.on("interactionCreate", async (interaction) => {
  if (!(interaction instanceof CommandInteraction) || interaction.data.name !== "echo") return;

  const player = echoBot.music.players.get(interaction.guildID);
  if (!player || !player.queue.current) {
    return interaction.createMessage({ content: "Não estou tocando nada no momento." });
  }

  interaction.createMessage({ embeds: [{ title: "🎛️ ELETRÔNICA | Tocando agora:", description: `🔴 Ao vivo: **${playlist.electronic[0].title}**`, color: Math.floor(Math.random() * 16777215) }] });
});


echoBot.connect();

export default echoBot;
