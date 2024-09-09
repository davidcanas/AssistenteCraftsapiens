"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const canvas_1 = require("canvas");
class PlayerList extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "playerlist",
            description: "Obtenha o nick e outras informações de todos os jogadores online (Com o mapa ativo)",
            category: "Info",
            aliases: ["tab", "pllist", "pl"],
            options: [],
        });
    }
    async execute(ctx) {
        await ctx.defer();
        const players = await this.client.utils.dynmap.getDynmapPlayers();
        const padding = 20, lineHeight = 40, baseHeight = 140, width = 800;
        const height = baseHeight + players.length * lineHeight + padding;
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx2d = canvas.getContext("2d");
        ctx2d.fillStyle = "#23272A";
        ctx2d.fillRect(0, 0, width, height);
        ctx2d.fillStyle = "white";
        ctx2d.font = "bold 40px Sans";
        const title = "Lista de jogadores online";
        ctx2d.fillText(title, (width - ctx2d.measureText(title).width) / 2, padding + 40);
        const tags = {
            "[Admin]": "red",
            "[Ajuda]": "#FFD700",
            "[Reitor]": "#00CED1",
            "[Dev]": "#00FFFF"
        };
        ctx2d.font = "32px Sans";
        players.forEach((player, i) => {
            let xOffset = (width - ctx2d.measureText(player).width) / 2;
            for (const [tag, color] of Object.entries(tags)) {
                if (player.includes(tag)) {
                    const [beforeTag, afterTag] = player.split(tag);
                    ctx2d.fillStyle = "white";
                    ctx2d.fillText(beforeTag, xOffset, baseHeight + i * lineHeight);
                    xOffset += ctx2d.measureText(beforeTag).width;
                    ctx2d.fillStyle = color;
                    ctx2d.fillText(tag, xOffset, baseHeight + i * lineHeight);
                    xOffset += ctx2d.measureText(tag).width;
                    ctx2d.fillStyle = "white";
                    ctx2d.fillText(afterTag, xOffset, baseHeight + i * lineHeight);
                    return;
                }
            }
            ctx2d.fillStyle = "white";
            ctx2d.fillText(player, xOffset, baseHeight + i * lineHeight);
        });
        const logo = await (0, canvas_1.loadImage)("https://i.imgur.com/S6tkD7r.jpeg");
        ctx2d.drawImage(logo, 10, 10, 80, 80);
        ctx2d.fillStyle = "#888";
        ctx2d.font = "20px Sans";
        const totalText = `Total: ${players.length} jogadores online (Com o /mapa ativo)`;
        ctx2d.fillText(totalText, (width - ctx2d.measureText(totalText).width) / 2, height - padding);
        const buffer = canvas.toBuffer();
        await ctx.sendMessage({
            files: [{ contents: buffer, name: "playerlist.png" }],
        });
    }
}
exports.default = PlayerList;
