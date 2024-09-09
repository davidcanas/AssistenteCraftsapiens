"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
class Volume extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "volume",
            description: "Altera o volume da musica [0-500]",
            category: "Music",
            aliases: ["vol"],
            options: [
                {
                    name: "volume",
                    type: 3,
                    description: "O volume a definir [0-500]",
                    required: true,
                },
            ], //lol
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        const volume = Number(ctx.args[0]);
        if (!currPlayer || currPlayer.state === vulkava_1.ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não estou a tocar nada nesse momento.");
            return;
        }
        const voiceChannelID = ctx.member?.voiceState?.channelID;
        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
            ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
            return;
        }
        if (isNaN(volume) || volume < 0 || volume > 500) {
            ctx.sendMessage("O volume deve ser um numero entre 0 e 500");
            return;
        }
        currPlayer.filters.setVolume(volume);
        ctx.sendMessage(`**${ctx.author.username}** alterou o volume para **${volume}/500**!`);
    }
}
exports.default = Volume;
