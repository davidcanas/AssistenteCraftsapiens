"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
const oceanic_js_1 = require("oceanic.js");
class Loop extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "loop",
            description: " Ativa/desativa o loop na queue/musica atual",
            category: "Music",
            aliases: [""],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.STRING,
                    name: "modo",
                    description: "Ativa o loop na playlist (queue) ou na musica atual (track)",
                    required: true,
                    choices: [
                        {
                            name: "queue",
                            value: "queue"
                        },
                        {
                            name: "track",
                            value: "track"
                        }
                    ]
                },
            ],
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        if (!currPlayer || currPlayer.state === vulkava_1.ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não estou a tocar nada nesse momento.");
            return;
        }
        const voiceChannelID = ctx.member?.voiceState?.channelID;
        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
            ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
            return;
        }
        if (ctx.args[0] === "queue") {
            currPlayer.setQueueLoop(!currPlayer.queueRepeat);
            ctx.sendMessage(`O loop da queue foi ${currPlayer.queueRepeat ? "ativado" : "desativado"}.`);
        }
        else if (ctx.args[0] === "track") {
            currPlayer.setTrackLoop(!currPlayer.trackRepeat);
            ctx.sendMessage(`O loop da música atual foi ${currPlayer.trackRepeat ? "ativado" : "desativado"}.`);
        }
    }
}
exports.default = Loop;
