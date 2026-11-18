import { Node, Vulkava } from "vulkava";

// O Lavalink do painel (3.7.13+red, com suporte a DAVE) exige "channelId" no voiceUpdate
// e derruba a conexão inteira (1011) quando falta. O Vulkava 1.6 não manda esse campo,
// então ele é preenchido aqui com o canal de voz do player.
const originalSend = Node.prototype.send;

Node.prototype.send = function (payload: Record<string, unknown>): void {
	if (payload.op === "voiceUpdate" && !payload.channelId) {
		const vulkava = (this as unknown as { vulkava: Vulkava }).vulkava;
		const player = vulkava.players.get(payload.guildId as string);
		if (player) payload.channelId = player.voiceChannelId;
	}
	return originalSend.call(this, payload);
};
