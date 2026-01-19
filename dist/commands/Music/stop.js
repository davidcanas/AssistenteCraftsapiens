"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
class Stop extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "stop",
            description: "Para uma Musica",
            category: "Music",
            aliases: ["parar"],
            options: [],
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        if (!currPlayer || currPlayer.state === vulkava_1.ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não estou tocando nada.");
            return;
        }
        const voiceChannelID = ctx.member?.voiceState?.channelID;
        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
            ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
            return;
        }
        if (currPlayer.olderMessageID) {
            ctx.channel.deleteMessage(currPlayer.olderMessageID).catch(() => { });
        }
        currPlayer.destroy();
        ctx.sendMessage("Musica parada por " + ctx.author.username);
    }
}
exports.default = Stop;
