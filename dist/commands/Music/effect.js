"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
const oceanic_js_1 = require("oceanic.js");
class Speedup extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "effect",
            description: " Ativa/desativa um efeito na queue atual",
            category: "Music",
            aliases: ["speedup"],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.STRING,
                    name: "efeito",
                    description: "O efeito a ativar",
                    required: true,
                    choices: [
                        {
                            name: "Speedup",
                            value: "speedup",
                        },
                    ],
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
        if (!currPlayer.speedup) {
            currPlayer.filters.setTimescale({ pitch: 1.18, rate: 1.10, speed: 1.15 });
            ctx.sendMessage("O efeito speedup foi ativado");
            currPlayer.speedup = true;
            return;
        }
        else {
            currPlayer.filters.clear();
            ctx.sendMessage("O efeito speedup foi desativado!");
            currPlayer.speedup = false;
            return;
        }
    }
}
exports.default = Speedup;
