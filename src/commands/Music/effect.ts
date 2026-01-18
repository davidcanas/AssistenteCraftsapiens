import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { ConnectionState } from "vulkava";
import { Constants } from "oceanic.js";

export default class Effect extends Command {
    constructor(client: Client) {
        super(client, {
            name: "effect",
            description: "Ativa/desativa efeitos (Speedup/Slowed) na queue atual",
            category: "Music",
            aliases: ["speedup", "slowed"],
            options: [
                {
                    type: Constants.ApplicationCommandOptionTypes.STRING,
                    name: "efeito",
                    description: "O efeito a ativar",
                    required: true,
                    choices: [
                        {
                            name: "Speedup",
                            value: "speedup",
                        },
                        {
                            name: "Slowed",
                            value: "slowed",
                        },
                    ],
                },
            ],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {

        if (ctx.channel.type !== 0 || !ctx.guild) return;

        const currPlayer = this.client.music.players.get(ctx.guild.id as string);

        if (!currPlayer || currPlayer.state === ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não estou a tocar nada nesse momento.");
            return;
        }

        const voiceChannelID = ctx.member?.voiceState?.channelID;

        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
            ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
            return;
        }

        // Obtém qual efeito o usuário escolheu (speedup ou slowed)
        const effectType = ctx.args[0]

        // LÓGICA DO SPEEDUP
        if (effectType === "speedup") {
            if (!currPlayer.speedup) {
                // Ativa Speedup (valores > 1.0)
                currPlayer.filters.setTimescale({ pitch: 1.18, rate: 1.10, speed: 1.15 });
                
                // Atualiza estados
                currPlayer.speedup = true;
                currPlayer.slowed = false; // Garante que o slowed esteja desligado
                
                ctx.sendMessage("⏩ O efeito **Speedup** foi ativado!");
            } else {
                // Desativa Speedup
                currPlayer.filters.clear();
                currPlayer.speedup = false;
                ctx.sendMessage("⏹️ O efeito **Speedup** foi desativado!");
            }
            return;
        }

        // LÓGICA DO SLOWED
        if (effectType === "slowed") {
            if (!currPlayer.slowed) {
                // Ativa Slowed (valores < 1.0 para ficar grave e lento)
                // pitch: 0.9 (mais grave), rate: 0.85 (mais lento)
                currPlayer.filters.setTimescale({ pitch: 0.9, rate: 0.85, speed: 0.85 });

                // Atualiza estados
                currPlayer.slowed = true;
                currPlayer.speedup = false; // Garante que o speedup esteja desligado

                ctx.sendMessage("◀️ O efeito **Slowed** foi ativado!");
            } else {
                // Desativa Slowed
                currPlayer.filters.clear();
                currPlayer.slowed = false;
                ctx.sendMessage("⏹️ O efeito **Slowed** foi desativado!");
            }
            return;
        }
    }
}
