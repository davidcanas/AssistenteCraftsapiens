import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from "canvas";

// Interfaces para tipagem
interface Player {
    username: string;
    nickname?: string;
    group?: string;
    status: { online: boolean };
}

// Configurações de estilo
const CONSTANTS = {
    HIERARCHY: ["reitor", "dev", "admin", "professor", "moderador", "ajuda", "premium", "vip", "default"],
    COLORS: {
        premium: "#00AA00", vip: "#FFFF55", professor: "#55FF55", admin: "#AA0000",
        dev: "#55FFFF", reitor: "#00AAAA", ajuda: "#FFAA00", moderador: "#FF5555",
        default: "#FFFFFF"
    } as Record<string, string>,
    MC_COLORS: {
        "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
        "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
        "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
        "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF",
        "r": "#FFFFFF"
    } as Record<string, string>
};

export default class PlayerList extends Command {
    constructor(client: Client) {
        super(client, {
            name: "playerlist",
            description: "Obtenha a lista de jogadores online com detalhes.",
            category: "Info",
            aliases: ["tab", "pllist", "pl"],
            options: [],
        });
    }

    // Helper para remover códigos de cor do Minecraft (§a, §1, etc) para comparação
    stripColors(text: string): string {
        return text.replace(/§./g, "");
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();

        const response = await this.client.api.getPlayerList();
        
        // Filtragem e Ordenação
        const players: Player[] = response.data.players
            .filter((p: any) => p.status.online)
            .sort((a: any, b: any) => {
                const rankA = CONSTANTS.HIERARCHY.indexOf(a.group?.toLowerCase() || "default");
                const rankB = CONSTANTS.HIERARCHY.indexOf(b.group?.toLowerCase() || "default");
                return rankA - rankB; // Menor índice = maior hierarquia
            });

        // Configuração do Canvas
        const cols = 2; // Número de colunas
        const cardHeight = 60;
        const cardWidth = 380; // Largura de cada slot de jogador
        const gap = 15; // Espaço entre cards
        const headerHeight = 120;
        const footerHeight = 50;
        const padding = 20;

        const rows = Math.ceil(players.length / cols);
        const width = (cardWidth * cols) + (gap * (cols - 1)) + (padding * 2);
        const height = headerHeight + (rows * cardHeight) + ((rows - 1) * gap) + footerHeight;

        const canvas = createCanvas(width, height);
        const ctx2d = canvas.getContext("2d");

        // --- Fundo ---
        ctx2d.fillStyle = "#23272A"; // Dark discord theme
        ctx2d.fillRect(0, 0, width, height);

        // --- Header (Logo e Título) ---
        const logoSize = 80;
        try {
            const logo = await loadImage("https://i.imgur.com/S6tkD7r.jpeg");
            // Desenha logo circular
            ctx2d.save();
            ctx2d.beginPath();
            ctx2d.arc(padding + logoSize / 2, padding + logoSize / 2, logoSize / 2, 0, Math.PI * 2, true);
            ctx2d.closePath();
            ctx2d.clip();
            ctx2d.drawImage(logo, padding, padding, logoSize, logoSize);
            ctx2d.restore();
        } catch (e) {
            console.error("Erro ao carregar logo", e);
        }

        ctx2d.fillStyle = "#FFFFFF";
        ctx2d.font = "bold 36px Sans";
        ctx2d.textAlign = "left";
        ctx2d.fillText("CraftSapiens", padding + logoSize + 20, padding + 50);
        
        ctx2d.fillStyle = "#AAAAAA";
        ctx2d.font = "24px Sans";
        ctx2d.fillText("Jogadores Online", padding + logoSize + 20, padding + 85);

        // --- Renderização dos Jogadores ---
        
        // Pré-carregar avatares (opcional, mas recomendado para visual)
        // Se houver muitos players, isso pode demorar. Use com cautela ou limite.
        const avatarPromises = players.map(p => 
            loadImage(`https://minotar.net/helm/${p.username}/64.png`).catch(() => null)
        );
        const avatars = await Promise.all(avatarPromises);

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const x = padding + (col * (cardWidth + gap));
            const y = headerHeight + (row * (cardHeight + gap));

            // Fundo do Card do Jogador
            ctx2d.fillStyle = "#2C2F33"; // Um pouco mais claro que o fundo
            this.roundRect(ctx2d, x, y, cardWidth, cardHeight, 10);
            ctx2d.fill();

            // Avatar
            const avatarImg = avatars[i];
            if (avatarImg) {
                ctx2d.drawImage(avatarImg as Image, x + 10, y + 10, 40, 40);
            } else {
                // Placeholder se falhar
                ctx2d.fillStyle = "#99AAB5";
                ctx2d.fillRect(x + 10, y + 10, 40, 40);
            }

            // Dados do Texto
            const group = player.group?.toLowerCase() || "default";
            const groupColor = CONSTANTS.COLORS[group] || "#FFFFFF";
            const groupName = group !== "default" ? group.charAt(0).toUpperCase() + group.slice(1) : "";
            
            const rawNickname = player.nickname || player.username;
            const cleanNick = this.stripColors(rawNickname);
            const realUsername = player.username;
            
            // Lógica Sutil: Mostrar username se for diferente do nick
            const showRealUsername = cleanNick !== realUsername;

            let textX = x + 60; // Posição X do texto (depois do avatar)
            let textY = y + 28; // Posição Y da linha principal

            // 1. Desenhar Rank (Tag)
            if (groupName) {
                ctx2d.font = "bold 16px Sans";
                ctx2d.fillStyle = groupColor;
                const tagText = `[${groupName}] `;
                ctx2d.fillText(tagText, textX, textY);
                textX += ctx2d.measureText(tagText).width;
            }

            // 2. Desenhar Nickname (Colorido)
            ctx2d.font = "bold 18px Sans";
            this.drawMinecraftText(ctx2d, rawNickname, textX, textY);

            // 3. Desenhar Username Real (Sutil)
            if (showRealUsername) {
                ctx2d.fillStyle = "#72767d"; // Cinza discord escuro
                ctx2d.font = "italic 14px Sans";
                // Desenha embaixo do nick principal
                ctx2d.fillText(`@${realUsername}`, x + 60, y + 50);
            } else {
                 // Se não tiver username diferente, centraliza verticalmente melhor o nick
                 // (Opcional: Ajuste fino de layout se quiser)
            }
        }

        // --- Footer ---
        const footerY = height - 15;
        ctx2d.fillStyle = "#888";
        ctx2d.font = "18px Sans";
        ctx2d.textAlign = "center";
        const totalText = `Total: ${players.length} jogadores conectados`;
        ctx2d.fillText(totalText, width / 2, footerY);

        // Enviar
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

    // Função utilitária para desenhar texto com cores do Minecraft
    drawMinecraftText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
        const parts = text.split("§");
        let currentX = x;
        
        // Desenha a primeira parte (antes do primeiro §, geralmente vazia ou texto padrão)
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
            
            // Define a cor
            ctx.fillStyle = CONSTANTS.MC_COLORS[colorCode] || "#FFFFFF";
            
            ctx.fillText(content, currentX, y);
            currentX += ctx.measureText(content).width;
        }
    }

    // Função para desenhar retângulo arredondado
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