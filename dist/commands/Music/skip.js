"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const vulkava_1 = require("vulkava");
class Skip extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "skip",
            description: " Skippa uma música",
            category: "Music",
            aliases: ["pular", "s", "skippar"],
            options: [],
        });
    }
    async execute(ctx) {
        if (ctx.channel.type !== 0 || !ctx.guild)
            return;
        const currPlayer = this.client.music.players.get(ctx.guild.id);
        if (!currPlayer || currPlayer.state === vulkava_1.ConnectionState.DISCONNECTED) {
            ctx.sendMessage("Não existe nenhuma música para ser pulada.");
            return;
        }
        const voiceChannelID = ctx.member?.voiceState?.channelID;
        if (!voiceChannelID || (voiceChannelID && voiceChannelID !== currPlayer.voiceChannelId)) {
            ctx.sendMessage({ content: "Você não está no mesmo canal de voz onde a música está tocando!", flags: 1 << 6 });
            return;
        }
        currPlayer.skip();
        ctx.sendMessage("Musica pulada por " + ctx.author.username);
    }
}
exports.default = Skip;
