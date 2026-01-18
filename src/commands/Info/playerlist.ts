import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from "canvas";

interface Player {
    username: string;
    nickname?: string;
    group?: string;
    status: { online: boolean };
    towny?: { townName: string };
}

const CONSTANTS = {
    HIERARCHY: ["reitor", "dev", "admin", "professor", "moderador", "ajuda", "premium", "vip", "default"],
    COLORS: {
        premium: "#00AA00", vip: "#FFFF55", professor: "#55FF55", admin: "#AA0000",
        dev: "#55FFFF", reitor: "#00AAAA", ajuda: "#FFAA00", moderador: "#FF5555",
        default: "#FFFFFF",
        town: "#4fa3d1", 
        discord: "#5865F2"
    } as Record<string, string>,
    MC_COLORS: {
        "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
        "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
        "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
        "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
        "r": "#FFFFFF"
    } as Record<string, string>,
    // Ícone de casa (Towny)
    TOWN_ICON_URL: "https://i.imgur.com/74o3G5E.png" 
};

export default class PlayerList extends Command {
    constructor(client: Client) {
        super(client, {
            name: "playerlist",
            description: "Lista de jogadores online.",
            category: "Info",
            aliases: ["tab", "pllist", "pl"],
            options: [],
        });
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        const response = await this.client.api.getPlayerList();
        
        const players: Player[] = response.data.players
            .filter((p: any) => p.status.online)
            .sort((a: any, b: any) => {
                const rankA = CONSTANTS.HIERARCHY.indexOf(a.group?.toLowerCase() || "default");
                const rankB = CONSTANTS.HIERARCHY.indexOf(b.group?.toLowerCase() || "default");
                return rankA - rankB;
            });

        // Configuração do Canvas
        const cols = 2;
        const cardHeight = 65;
        const cardWidth = 400; 
        const gap = 15;
        const headerHeight = 120;
        const footerHeight = 50;
        const padding = 20;

        const rows = Math.ceil(players.length / cols);
        const width = (cardWidth * cols) + (gap * (cols - 1)) + (padding * 2);
        const height = headerHeight + (rows * cardHeight) + ((rows - 1) * gap) + footerHeight;

        const canvas = createCanvas(width, height);
        const ctx2d = canvas.getContext("2d");

        // Fundo
        ctx2d.fillStyle = "#23272A";
        ctx2d.fillRect(0, 0, width, height);

        // Carrega o ícone da cidade
        const townIconImg = await loadImage(CONSTANTS.TOWN_ICON_URL).catch(() => null);

        await this.drawHeader(ctx2d, padding);

        // --- PREPARAÇÃO DOS DADOS ---
        const preparedData = await Promise.all(players.map(async (p) => {
            // Imagem Minecraft
            const mcImage = await loadImage(`https://minotar.net/helm/${p.username}/64.png`).catch(() => null);

            // Dados do Discord
            const discordMember = this.client.getDiscordByNick(p.username); 
            let discordImage = null;
            let discordNick = null;
            
            if (discordMember && discordMember.user) {
                // Tenta pegar avatar
                const avatarUrl = discordMember.user.avatarURL("png", 32) || discordMember.user.defaultAvatarURL("png", 32);
                
                if (avatarUrl) {
                    discordImage = await loadImage(avatarUrl).catch(() => null);
                }
                
                // Pega o nick do servidor ou username
                discordNick = discordMember.nick || discordMember.user.username;
            }

            return { 
                player: p, 
                mcImage, 
                discordImage, 
                discordNick,
                isLinked: !!discordMember 
            };
        }));

        // --- LOOP DE DESENHO ---
        for (let i = 0; i < preparedData.length; i++) {
            const data = preparedData[i];
            const p = data.player;
            
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = padding + (col * (cardWidth + gap));
            const y = headerHeight + (row * (cardHeight + gap));

            // Fundo do Card
            ctx2d.fillStyle = "#2C2F33";
            this.roundRect(ctx2d, x, y, cardWidth, cardHeight, 10);
            ctx2d.fill();

            // Avatar Minecraft (Esquerda)
            if (data.mcImage) {
                this.roundImage(ctx2d, data.mcImage as Image, x + 10, y + 10, 45, 45, 5);
            } else {
                ctx2d.fillStyle = "#99AAB5";
                ctx2d.fillRect(x + 10, y + 10, 45, 45);
            }

            // --- POSICIONAMENTO ---
            let textX = x + 65; 
            const line1Y = y + 26; // Nome Principal
            const line2Y = y + 50; // Meta Info

            // 1. Linha Superior: Rank + Nick Minecraft
            const group = p.group?.toLowerCase() || "default";
            const groupName = group !== "default" ? group.charAt(0).toUpperCase() + group.slice(1) : "";
            const rawNickname = p.nickname || p.username;

            if (groupName) {
                ctx2d.font = "bold 15px Sans";
                ctx2d.fillStyle = CONSTANTS.COLORS[group] || "#FFFFFF";
                const tagText = `[${groupName}] `;
                ctx2d.fillText(tagText, textX, line1Y);
                textX += ctx2d.measureText(tagText).width;
            }

            ctx2d.font = "bold 17px Sans";
            this.drawMinecraftText(ctx2d, rawNickname, textX, line1Y);

            // 2. Linha Inferior
            let metaX = x + 65;
            let hasContentOnLeft = false;
            
            // --- A. Discord (Só aparece se estiver linkado) ---
            if (data.isLinked && data.discordNick) {
                const discSize = 16;
                const discY = line2Y - 12; 

                // Ícone Discord
                if (data.discordImage) {
                    this.roundImage(ctx2d, data.discordImage as Image, metaX, discY, discSize, discSize, discSize/2);
                } else {
                    ctx2d.beginPath();
                    ctx2d.fillStyle = CONSTANTS.COLORS.discord;
                    ctx2d.arc(metaX + discSize/2, discY + discSize/2, discSize/2, 0, Math.PI * 2);
                    ctx2d.fill();
                }
                metaX += discSize + 5; 

                // Nome (Nick do Discord)
                ctx2d.font = "14px Sans";
                ctx2d.fillStyle = "#dedede"; // Cor clara
                const nickText = `@${data.discordNick}`;
                ctx2d.fillText(nickText, metaX, line2Y);
                
                metaX += ctx2d.measureText(nickText).width + 10;
                hasContentOnLeft = true;
            }

            // --- B. Cidade (Towny) ---
            if (p.towny && p.towny.townName) {
                // Separador se tiver discord antes
                if (hasContentOnLeft) {
                    ctx2d.fillStyle = "#484B52"; 
                    ctx2d.fillRect(metaX - 6, line2Y - 9, 1.5, 11); 
                }

                const townIconSize = 14;
                const townIconY = line2Y - 11;

                // Desenha Ícone da Cidade
                if (townIconImg) {
                    ctx2d.drawImage(townIconImg as Image, metaX, townIconY, townIconSize, townIconSize);
                } else {
                    ctx2d.fillStyle = CONSTANTS.COLORS.town;
                    ctx2d.fillRect(metaX, townIconY, townIconSize, townIconSize);
                }

                metaX += townIconSize + 5;

                // Nome da cidade (AQUI ESTÁ A CORREÇÃO DO REPLACE)
                ctx2d.font = "14px Sans";
                ctx2d.fillStyle = CONSTANTS.COLORS.town;
                const townText = p.towny.townName.replace(/_/g, " "); // Troca _ por espaço
                ctx2d.fillText(townText, metaX, line2Y);
            }
        }

        // Footer Total
        ctx2d.fillStyle = "#888";
        ctx2d.font = "18px Sans";
        ctx2d.textAlign = "center";
        const totalText = `Total: ${players.length} jogadores conectados`;
        ctx2d.fillText(totalText, width / 2, height - 15);

        const buffer = canvas.toBuffer();
        
        await ctx.sendMessage({
            content: `📊 **Lista de Jogadores** | ${ctx.author.mention}`,
            files: [{ contents: buffer, name: "playerlist.png" }],
            components: [{
                type: 1,
                components: [{
                    type: 2,
                    style: 2,
                    customID: "confirm_read",
                    label: "Fechar",
                    emoji: { id: "1300170561607172096", name: "lixo" }
                }]
            }]
        });
    }

    // --- HELPERS ---

    async drawHeader(ctx: CanvasRenderingContext2D, padding: number) {
        const logoSize = 80;
        try {
            const logo = await loadImage("https://i.imgur.com/S6tkD7r.jpeg");
            this.roundImage(ctx, logo, padding, padding, logoSize, logoSize, logoSize/2);
        } catch {}

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 36px Sans";
        ctx.textAlign = "left";
        ctx.fillText("CraftSapiens", padding + logoSize + 20, padding + 50);
        ctx.fillStyle = "#AAAAAA";
        ctx.font = "24px Sans";
        ctx.fillText("Jogadores Online", padding + logoSize + 20, padding + 85);
    }

    roundImage(ctx: CanvasRenderingContext2D, img: Image, x: number, y: number, w: number, h: number, r: number) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
    }

    drawMinecraftText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
        const parts = text.split("§");
        let currentX = x;
        if (parts[0].length > 0) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(parts[0], currentX, y);
            currentX += ctx.measureText(parts[0]).width;
        }
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.length === 0) continue;
            const colorCode = part.charAt(0);
            const content = part.substring(1);
            ctx.fillStyle = CONSTANTS.MC_COLORS[colorCode] || "#FFFFFF";
            ctx.fillText(content, currentX, y);
            currentX += ctx.measureText(content).width;
        }
    }

    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}