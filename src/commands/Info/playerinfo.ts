import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from "canvas";

const CONSTANTS = {
    WIDTH: 900,
    BG_COLOR: "#23272A",
    CARD_BG: "#2C2F33",
    TEXT_PRIMARY: "#FFFFFF",
    TEXT_SECONDARY: "#AAAAAA",
    ACCENT_COLOR: "#7289DA",
    PADDING: 30,
    GROUP_COLORS: {
        reitor: "#008B8B", dev: "#00BFFF", admin: "#8B0000", professor: "#00FF7F",
        moderador: "#FF4500", ajuda: "#9370DB", premium: "#228B22", vip: "#FFD700",
        default: "#AAAAAA"
    } as Record<string, string>,
    ICONS: {
        money: "https://cdn-icons-png.flaticon.com/512/10384/10384161.png",
        kills: "https://cdn-icons-png.flaticon.com/256/2736/2736398.png",
        deaths: "https://cdn-icons-png.flaticon.com/512/521/521269.png",
        town: "https://cdn-icons-png.freepik.com/256/2942/2942149.png",
        nation: "https://cdn-icons-png.flaticon.com/512/6313/6313937.png",
        friends: "https://cdn-icons-png.flaticon.com/512/880/880594.png"
    }
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

    formatNumber(num: number): string {
        if (!num) return "0";
        if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
        return num.toString();
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

            const cleanNickname = this.stripColors(data.nickname || data.username);
            const username = data.username;
            const group = (data.group || "default").toLowerCase();
            const accentColor = CONSTANTS.GROUP_COLORS[group] || CONSTANTS.ACCENT_COLOR;
            const rankName = group !== "default" ? group.charAt(0).toUpperCase() + group.slice(1) : "";
            const displayName = rankName ? `[${rankName}] ${cleanNickname}` : cleanNickname;
            const isOnline = data.status?.online ?? false;
            const friendsList = data.towny?.friends || [];
            const hasFriends = friendsList.length > 0;

            // --- Dados do Discord ---
            const discordMember = this.client.getDiscordByNick(username);
            let discordAvatarUrl = null;
            if (discordMember && discordMember.user) {
                discordAvatarUrl = discordMember.user.avatarURL("png", 64) || discordMember.user.defaultAvatarURL("png", 64);
            }

            // --- Configuração Canvas ---
            let canvasHeight = 520;
            if (hasFriends) canvasHeight += 110;

            const canvas = createCanvas(CONSTANTS.WIDTH, canvasHeight);
            const ctx2d = canvas.getContext("2d");

            // Fundo
            ctx2d.fillStyle = CONSTANTS.BG_COLOR;
            ctx2d.fillRect(0, 0, CONSTANTS.WIDTH, canvasHeight);

            this.drawHeader(ctx2d);

            // --- Carregamento de Imagens ---
            const skinUrl = `https://mineskin.eu/armor/bust/${username}/180.png`;

            const [
                skinImage,
                discordImage,
                moneyIcon, killsIcon, deathsIcon,
                townIcon, nationIcon, friendsIcon
            ] = await Promise.all([
                loadImage(skinUrl).catch(() => null),
                discordAvatarUrl ? loadImage(discordAvatarUrl).catch(() => null) : Promise.resolve(null),
                loadImage(CONSTANTS.ICONS.money).catch(() => null),
                loadImage(CONSTANTS.ICONS.kills).catch(() => null),
                loadImage(CONSTANTS.ICONS.deaths).catch(() => null),
                loadImage(CONSTANTS.ICONS.town).catch(() => null),
                loadImage(CONSTANTS.ICONS.nation).catch(() => null),
                loadImage(CONSTANTS.ICONS.friends).catch(() => null)
            ]);

            // --- Layout ---
            const leftColWidth = 300;
            const rightColX = CONSTANTS.PADDING + leftColWidth + CONSTANTS.PADDING;
            const startY = 110;

            // 1. Identidade (com Discord Avatar)
            this.drawIdentityCard(ctx2d, CONSTANTS.PADDING, startY, leftColWidth, 380, skinImage, discordImage, displayName, username, accentColor, isOnline);

            // 2. Stats Grid
            const cardW = 250;
            const cardH = 80;
            const gapX = 20;
            const gapY = 20;
            let gridY = startY;

            // Linha 1
            this.drawStatBox(ctx2d, rightColX, gridY, cardW, cardH, moneyIcon, "Dinheiro", `${this.formatNumber(data.status?.money)}`, accentColor);
            this.drawStatBox(ctx2d, rightColX + cardW + gapX, gridY, cardW, cardH, killsIcon, "Kills", `${this.formatNumber(data.status?.kills ?? 0)}`, "#FF5555");

            // Linha 2
            gridY += cardH + gapY;
            this.drawStatBox(ctx2d, rightColX, gridY, cardW, cardH, deathsIcon, "Mortes", `${this.formatNumber(data.status?.deaths ?? 0)}`, "#AAAAAA");
            this.drawStatBox(ctx2d, rightColX + cardW + gapX, gridY, cardW, cardH, townIcon, "Cidade", data.towny?.townName?.replace(/_/g, " ") || "N/A", "#55FFFF");

            // Linha 3
            gridY += cardH + gapY;
            this.drawStatBox(ctx2d, rightColX, gridY, cardW, cardH, nationIcon, "Nação", data.towny?.nationName?.replace(/_/g, " ") || "N/A", "#FFFF55");

            // 3. Amigos (Smart Fit)
            const identityBottom = startY + 380;
            const statsBottom = gridY + cardH;
            const friendsStartY = Math.max(identityBottom, statsBottom) + 30;

            if (hasFriends) {
                this.drawFriendsSection(ctx2d, CONSTANTS.PADDING, friendsStartY, CONSTANTS.WIDTH - (CONSTANTS.PADDING * 2), friendsList, friendsIcon);
            }

            const buffer = canvas.toBuffer();
            await ctx.sendMessage({
                content: `👤 Informações de **${cleanNickname}** | ${ctx.author.mention}`,
                files: [{ contents: buffer, name: "playerinfo.png" }],
                components: [
                    {
                        type: 1,
                        components: [{
                            type: 2,
                            style: 5,
                            label: "Ver perfil online",
                            url: "http://jogar.craftsapiens.com.br:50024/player/" + username,
                            emoji: { name: "🔗" },
                        }],
                    }
                ]
            });


        } catch (err) {
            console.error(err);
            ctx.sendMessage(`❌ Erro ao gerar imagem: \`${err}\``);
        }
    }

    // --- Helpers ---

    drawHeader(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "bold 32px Sans";
        ctx.textAlign = "left";
        ctx.fillText("CraftSapiens", CONSTANTS.PADDING, 50);
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "24px Sans";
        ctx.fillText("| Informações do Jogador", CONSTANTS.PADDING + 240, 50);
        ctx.fillStyle = "#33363C";
        ctx.fillRect(CONSTANTS.PADDING, 75, CONSTANTS.WIDTH - (CONSTANTS.PADDING * 2), 2);
    }

    drawIdentityCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, img: Image | null, discordImg: Image | null, displayName: string, user: string, accent: string, online: boolean) {
        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, h, 15);
        ctx.fill();

        // Barra colorida topo
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(x, y, w, 10, [15, 15, 0, 0]);
        ctx.fill();

        const centerX = x + w / 2;
        let currentY = y + 40;

        // Skin do Minecraft
        if (img) {
            const imgSize = 180;
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 15;
            ctx.drawImage(img, centerX - imgSize / 2, currentY, imgSize, imgSize);
            ctx.shadowBlur = 0;
            currentY += imgSize + 25;
        } else {
            ctx.fillStyle = "#555";
            ctx.fillRect(centerX - 90, currentY, 180, 180);
            currentY += 205;
        }

        // Nome [TAG] Nick
        ctx.textAlign = "center";

        let fontSize = 28;
        ctx.font = `bold ${fontSize}px Sans`;
        while (ctx.measureText(displayName).width > w - 20 && fontSize > 14) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Sans`;
        }

        ctx.shadowColor = accent;
        ctx.shadowBlur = 5;
        ctx.fillStyle = accent;
        ctx.fillText(displayName, centerX, currentY);
        ctx.shadowBlur = 0;

        // --- Discord Avatar + @Username ---
        currentY += 35;
        const discSize = 24;
        const discPadding = 8;

        ctx.font = "italic 20px Sans";
        const textWidth = ctx.measureText(`@${user}`).width;

        const totalBlockWidth = discordImg ? (discSize + discPadding + textWidth) : textWidth;
        let startX = centerX - (totalBlockWidth / 2);

        if (discordImg) {
            ctx.save();
            ctx.beginPath();
            // Círculo para clip
            ctx.arc(startX + discSize / 2, currentY - 7, discSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            // Desenha imagem
            ctx.drawImage(discordImg, startX, currentY - 7 - discSize / 2, discSize, discSize);
            ctx.restore();

            // Avança o cursor
            startX += discSize + discPadding;
        }

        // Desenha o Texto
        ctx.textAlign = "left"; // Muda para left temporariamente para desenhar a partir do cálculo
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.fillText(`@${user}`, startX, currentY);
        ctx.textAlign = "center"; // Volta para center

        // Status
        currentY += 45;
        const statusColor = online ? "#43B581" : "#747F8D";
        const statusText = online ? "ONLINE AGORA" : "OFFLINE";

        ctx.beginPath();
        ctx.fillStyle = statusColor;
        ctx.arc(centerX - (ctx.measureText(statusText).width / 2) - 15, currentY - 7, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 18px Sans";
        ctx.fillStyle = statusColor;
        ctx.fillText(statusText, centerX, currentY);

        ctx.textAlign = "left";
    }

    drawStatBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, icon: Image | null, label: string, value: string, accentColor: string) {
        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, h, 12);
        ctx.fill();

        ctx.fillStyle = accentColor;
        ctx.fillRect(x, y + 10, 4, h - 20);

        if (icon) {
            ctx.drawImage(icon, x + 20, y + 25, 32, 32);
        }

        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "16px Sans";
        ctx.fillText(label.toUpperCase(), x + 70, y + 28);

        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "bold 22px Sans";
        ctx.fillText(value, x + 70, y + 55);
    }

    drawFriendsSection(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, friends: string[], icon: Image | null) {
        const h = 80;

        ctx.fillStyle = CONSTANTS.CARD_BG;
        this.roundRect(ctx, x, y, w, h, 12);
        ctx.fill();

        if (icon) {
            ctx.drawImage(icon, x + 20, y + 28, 24, 24);
        }

        // Título fixo
        ctx.fillStyle = CONSTANTS.TEXT_SECONDARY;
        ctx.font = "18px Sans";
        const titleText = `AMIGOS (${friends.length})`;
        ctx.fillText(titleText, x + 55, y + 46);


        ctx.fillStyle = CONSTANTS.TEXT_PRIMARY;
        ctx.font = "16px Sans";

        const startTextX = x + 55 + ctx.measureText(titleText).width + 30;
        const maxTextWidth = (x + w) - startTextX - 20;

        let finalText = "";

        for (let i = 0; i < friends.length; i++) {
            const separator = finalText.length > 0 ? "  •  " : "";
            const nextName = friends[i];

            const testString = finalText + separator + nextName;

            const potentialRest = friends.length - (i + 1);
            const counterWidth = potentialRest > 0 ? ctx.measureText(`  (+${potentialRest})`).width : 0;

            if (ctx.measureText(testString).width + counterWidth < maxTextWidth) {
                finalText = testString;
            } else {

                const remaining = friends.length - i;
                finalText += `  (+${remaining})`;
                break;
            }
        }

        ctx.fillText(finalText, startTextX, y + 46);
    }

    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.closePath();
    }
}