import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from "canvas";

// Constantes de estilo e configuração
const CONSTANTS = {
    WIDTH: 900,
    BG_COLOR: "#23272A", // Discord Dark
    CARD_BG: "#2C2F33", // Slightly lighter
    TEXT_PRIMARY: "#FFFFFF",
    TEXT_SECONDARY: "#AAAAAA",
    ACCENT_COLOR: "#7289DA", // Default Discord Blurple
    PADDING: 30,
    GROUP_COLORS: {
        reitor: "#008B8B", dev: "#00BFFF", admin: "#8B0000", professor: "#00FF7F",
        moderador: "#FF4500", ajuda: "#9370DB", premium: "#228B22", vip: "#FFD700",
        default: "#AAAAAA"
    } as Record<string, string>
};

export default class PlayerInfo extends Command {
    constructor(client: Client) {
        super(client, {
            name: "playerinfo",
            description: "Obtenha informações visuais de um jogador do survival.",
            category: "Info",
            aliases: ["pinfo"],
            options: [{
                type: 3,
                name: "jogador",
                description: "Nome do jogador",
                required: false,
            }]
        });
    }

    stripColors(text: string): string {
        return text ? text.replace(/§[0-9A-FK-ORa-fk-or]/g, "") : "";
    }

    formatCurrency(amount: number): string {
        return amount?.toLocaleString("pt-PT") ?? "0";
    }

    async execute(ctx: CommandContext): Promise<void> {
        await ctx.defer();
        const playerName = ctx.args[0] || ctx.member?.nick || ctx.author.username;

        try {
            const playerInfo = await this.client.api.getPlayerInfo(playerName);
            if (!playerInfo?.data) {
                ctx.sendMessage(`❌ Jogador \`${playerName}\` não encontrado.`);
                return;
            }
            const data = playerInfo.data;

            // Preparação dos Dados
            const cleanNickname = this.stripColors(data.nickname || data.username);
            const username = data.username;
            const group = (data.group || "default").toLowerCase();
            const accentColor = CONSTANTS.GROUP_COLORS[group] || CONSTANTS.ACCENT_COLOR;
            const rankName = group.charAt(0).toUpperCase() + group.slice(1);
            const isOnline = data.status?.online ?? false;
            const friendsList = data.towny?.friends || [];
            const hasFriends = friendsList.length > 0;

            // Cálculo da Altura Dinâmica
            let mainHeight = 450;
            if (hasFriends) mainHeight += 120; // Espaço extra para amigos
            const height = mainHeight;

            // Inicialização do Canvas
            const canvas = createCanvas(CONSTANTS.WIDTH, height);
            const ctx2d = canvas.getContext("2d");

            // --- Fundo e Estrutura ---
            ctx2d.fillStyle = CONSTANTS.BG_COLOR;
            ctx2d.fillRect(0, 0, CONSTANTS.WIDTH, height);

            // --- Cabeçalho ---
            this.drawHeader(ctx2d);

            // --- Carregamento de Imagens (Async) ---
            const skinUrl = `https://mineskin.eu/armor/bust/${username}/180.png`;
            const skinImage = await loadImage(skinUrl).catch(() => null);
            // Ícones estáticos (você pode substituir por imagens reais se preferir)
            const icons = {
                money: "💰", kills: "⚔️", deaths: "💀", town: "🏰",
                nation: "🏳️", health: "❤️", hunger: "🍗"
            };

            // --- Layout Principal (Grid de 2 Colunas) ---
            const leftColWidth = 300;
            const rightColX = CONSTANTS.PADDING + leftColWidth + CONSTANTS.PADDING;
            let currentY = 100; // Começo do conteúdo abaixo do header

            // === COLUNA ESQUERDA: Identidade ===
            this.drawIdentityCard(ctx2d, CONSTANTS.PADDING, currentY, leftColWidth, 380, skinImage, cleanNickname, username, rankName, accentColor, isOnline);

            // === COLUNA DIREITA: Estatísticas ===
            const gridY = currentY;
            const cardW = 240;
            const cardH = 80;
            const gapX = 20;
            const gapY = 20;

            // Linha 1: Economia e Rank
            this.drawStatBox(ctx2d, rightColX, gridY, cardW, cardH, icons.money, "Dinheiro", `${this.formatCurrency(data.status?.money)} sapiens`, accentColor);
            this.drawStatBox(ctx2d, rightColX + cardW + gapX, gridY, cardW, cardH, "🛡️", "Rank", rankName, accentColor);
            
            // Linha 2: Combate
            this.drawStatBox(ctx2d, rightColX, gridY + cardH + gapY, cardW, cardH, icons.kills, "Kills", `${data.status?.kills ?? 0}`, "#FF5555");
            this.drawStatBox(ctx2d, rightColX + cardW + gapX, gridY + cardH + gapY, cardW, cardH, icons.deaths, "Mortes", `${data.status?.deaths ?? 0}`, "#AAAAAA");

            // Linha 3: Towny
            this.drawStatBox(ctx2d, rightColX, gridY + (cardH + gapY) * 2, cardW, cardH, icons.town, "Cidade", data.towny?.townName || "N/A", "#55FFFF");
            this.drawStatBox(ctx2d, rightColX + cardW + gapX, gridY + (cardH + gapY) * 2, cardW, cardH, icons.nation, "Nação", data.towny?.nationName || "N/A", "#FFFF55");

            // Linha 4 (Condicional): Status Online
            if (isOnline) {
                 const onlineY = gridY + (cardH + gapY) * 3;
                 this.drawStatBox(ctx2d, rightColX, onlineY, cardW, cardH, icons.health, "Vida", `${data.status?.health ?? 0.0}`, "#FF5555");
                 this.drawStatBox(ctx2d, rightColX + cardW + gapX, onlineY, cardW, cardH, icons.hunger, "Fome", `${data.status?.hunger ?? 0.0}`, "#FFAA00");
            }

            // === Rodapé: Amigos (Se houver) ===
            if (hasFriends) {
                const friendsY = gridY + (cardH + gapY) * (isOnline ? 4 : 3) + 10;
                this.drawFriendsSection(ctx2d, CONSTANTS.PADDING, friendsY, CONSTANTS.WIDTH - (CONSTANTS.PADDING * 2), friendsList);
            }

            // Enviar
            const buffer = canvas.toBuffer();
            await ctx.sendMessage({
                content: `👤 Informações de **${cleanNickname}** | ${ctx.author.mention}`,
                files: [{ contents: buffer, name: "playerinfo.png" }]
            });

        } catch (err) {
            console.error(err);
            ctx.sendMessage(`❌ Erro ao gerar imagem: \`${err}\``);
        }
    }

    // --- Funções Auxiliares de Desenho ---

    drawHeader(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "bold 32px Sans";
        ctx.fillText("CraftSapiens", CONSTANTS.PADDING, 50);
        
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "24px Sans";
        ctx.fillText("| Informações do Jogador", CONSTANTS.PADDING + 210, 50);

        // Linha separadora
        ctx.fillStyle = "#33363C";
        ctx.fillRect(CONSTANTS.PADDING, 75, CONSTANTS.WIDTH - (CONSTANTS.PADDING*2), 2);
    }

    drawIdentityCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, img: Image | null, nick: string, user: string, rank: string, accent: string, online: boolean) {
        // Fundo do Card
        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, h, 15);
        ctx.fill();

        // Borda superior colorida (Rank)
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(x, y, w, 10, [15, 15, 0, 0]);
        ctx.fill();

        const centerX = x + w / 2;
        let currentY = y + 40;

        // Imagem (Skin Bust)
        if (img) {
            const imgSize = 180;
            // Sombra da imagem
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 15;
            ctx.drawImage(img, centerX - imgSize / 2, currentY, imgSize, imgSize);
            ctx.shadowBlur = 0;
            currentY += imgSize + 25;
        } else {
            // Placeholder se falhar
            ctx.fillStyle = "#555";
            ctx.fillRect(centerX - 90, currentY, 180, 180);
            currentY += 205;
        }

        // Nickname (Grande e colorido)
        ctx.textAlign = "center";
        ctx.font = "bold 32px Sans";
        // Sombra de texto para destacar
        ctx.shadowColor = accent;
        ctx.shadowBlur = 5;
        ctx.fillStyle = accent;
        ctx.fillText(nick, centerX, currentY);
        ctx.shadowBlur = 0;

        // Username (Menor e cinza)
        currentY += 30;
        ctx.font = "italic 20px Sans";
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.fillText(`@${user}`, centerX, currentY);

        // Status Online/Offline Indicator
        currentY += 45;
        const statusColor = online ? "#43B581" : "#747F8D";
        const statusText = online ? "ONLINE AGORA" : "OFFLINE";
        
        // Bolinha do status
        ctx.beginPath();
        ctx.fillStyle = statusColor;
        ctx.arc(centerX - (ctx.measureText(statusText).width/2) - 15, currentY - 7, 8, 0, Math.PI*2);
        ctx.fill();
        
        // Texto do status
        ctx.font = "bold 18px Sans";
        ctx.fillStyle = statusColor;
        ctx.fillText(statusText, centerX, currentY);

        ctx.textAlign = "left"; // Reset alignment
    }

    drawStatBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, icon: string, label: string, value: string, accentColor: string) {
        // Fundo do Card
        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, h, 12);
        ctx.fill();

        // Pequena barra lateral colorida
        ctx.fillStyle = accentColor;
        ctx.fillRect(x, y + 10, 4, h - 20);

        // Ícone (Emoji por enquanto, rápido e fácil)
        ctx.font = "36px Sans";
        ctx.fillText(icon, x + 20, y + h / 2 + 12);

        // Label (Título pequeno)
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "16px Sans";
        ctx.fillText(label.toUpperCase(), x + 70, y + 28);

        // Valor (Dado principal)
        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "bold 22px Sans";
        // Truncar se for muito longo
        let displayValue = value;
        if (ctx.measureText(displayValue).width > w - 80) {
             displayValue = value.substring(0, 15) + "...";
        }
        ctx.fillText(displayValue, x + 70, y + 55);
    }

    drawFriendsSection(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, friends: string[]) {
        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, 90, 12);
        ctx.fill();

        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "18px Sans";
        ctx.fillText(`👥 AMIGOS (${friends.length})`, x + 20, y + 30);

        // Lista horizontal de amigos
        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "16px Sans";
        
        // Pega os primeiros ~12 amigos para não lotar a imagem
        const displayFriends = friends.slice(0, 12).join("  •  ");
        let finalText = displayFriends;
        if (friends.length > 12) finalText += ` (+${friends.length - 12})`;

        ctx.fillText(finalText, x + 20, y + 65);
    }
    
    // Helper para retângulos arredondados
    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.closePath();
    }
}