"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-var-requires */
const fs_1 = __importDefault(require("fs"));
const oceanic_js_1 = require("oceanic.js");
const globalDB_1 = __importDefault(require("../models/globalDB"));
const userDB_1 = __importDefault(require("../models/userDB"));
const staffDB_1 = __importDefault(require("../models/staffDB"));
const Embed_1 = __importDefault(require("./Embed"));
const Music_1 = __importDefault(require("./Music"));
const levenshteinDistance_1 = __importDefault(require("../utils/levenshteinDistance"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const ninaBot_1 = __importDefault(require("../submodules/nina/ninaBot"));
const adaBot_1 = __importDefault(require("../submodules/ada/adaBot"));
const luyBot_1 = __importDefault(require("../submodules/luy/luyBot"));
class DGClient extends oceanic_js_1.Client {
    constructor(token) {
        const clientOptions = {
            auth: token,
            defaultImageFormat: "png",
            gateway: {
                getAllUsers: true,
                intents: [
                    "ALL"
                ],
            },
            collectionLimits: {
                messages: 100,
            },
        };
        super(clientOptions);
        this.commands = [];
        this.db = {
            global: globalDB_1.default,
            users: userDB_1.default,
            staff: staffDB_1.default
        };
        this.nina = ninaBot_1.default;
        this.ada = adaBot_1.default;
        this.luy = luyBot_1.default;
        this.utils = {
            levDistance: levenshteinDistance_1.default,
        };
        this.api = {
            getTownInfo: this.getTownInfo,
            getTownList: this.getTownList,
            getPlayerInfo: this.getPlayerInfo,
            getPlayerList: this.getPlayerList,
            getNationInfo: this.getNationInfo,
            getNationList: this.getNationList,
            getServerInfo: this.getServerInfo,
        };
        this.fetch = node_fetch_1.default;
        this.embed = Embed_1.default;
        this.owner = this.users.get("733963304610824252");
        this.guildID = "892472046729179136";
        this.allowedUsers = ["733963304610824252", "402190502172295168", "828745580125225031", "286573832913813516"];
        this.ignoreRoles = [
            "939956623441555558",
            "917900552225054750",
            "901251917991256124",
            "90126307702514078",
        ];
    }
    async findUser(param, guild) {
        let user;
        const matched = param.match(/<@!?(\d{17,18})>/);
        if (matched) {
            try {
                user =
                    this.users.get(matched[1]) || (await this.rest.users.get(matched[1]));
            }
            catch { /* vazio*/ }
        }
        else if (/\d{17,18}/.test(param)) {
            try {
                user = this.users.get(param) || (await this.rest.users.get(param));
            }
            catch { /* vazio */ }
        }
        if (!guild)
            return null;
        if (!user) {
            const usernameRegex = /(.+)?#(\d{4})/;
            const match = param.match(usernameRegex);
            if (match) {
                if (match[1])
                    user = guild.members.find((m) => m.username === match[1] && m.user.discriminator === match[2])?.user;
                else
                    user = guild.members.find((m) => m.user.discriminator === match[2])
                        ?.user;
            }
        }
        if (!user) {
            const lowerCaseParam = param.toLowerCase();
            let startsWith = false;
            for (const m of guild.members.values()) {
                if ((m.nick &&
                    (m.nick === param ||
                        m.nick.toLowerCase() === param.toLowerCase())) ||
                    m.username === param ||
                    m.username.toLowerCase() === param.toLowerCase()) {
                    user = m.user;
                    break;
                }
                if ((m.nick && m.nick.startsWith(lowerCaseParam)) ||
                    m.username.toLowerCase().startsWith(lowerCaseParam)) {
                    user = m.user;
                    startsWith = true;
                    continue;
                }
                if (!startsWith &&
                    ((m.nick && m.nick.toLowerCase().includes(lowerCaseParam)) ||
                        m.username.toLowerCase().includes(lowerCaseParam))) {
                    user = m.user;
                }
            }
        }
        return user || null;
    }
    connect() {
        return super.connect();
    }
    loadCommands() {
        for (const dir of fs_1.default.readdirSync(path_1.default.resolve(__dirname, "..", "commands"))) {
            if (dir.endsWith(".ts") || dir.endsWith(".js")) {
                const cmd = require(`../commands/${dir}`).default;
                this.commands.push(new cmd(this));
            }
            else {
                for (const file of fs_1.default.readdirSync(path_1.default.resolve(__dirname, "..", "commands", dir))) {
                    if (file.endsWith(".ts") || file.endsWith(".js")) {
                        const command = require(`../commands/${dir}/${file}`).default;
                        this.commands.push(new command(this));
                    }
                }
            }
        }
        console.log("\x1b[32m[CLIENT] Os comandos foram carregados.");
    }
    loadEvents() {
        for (const file of fs_1.default.readdirSync(path_1.default.resolve(__dirname, "..", "events"))) {
            if (file.endsWith(".ts") || file.endsWith(".js")) {
                const event = new (require(`../events/${file}`).default)(this);
                const eventName = file.split(".")[0];
                if (eventName === "ready") {
                    super.once("ready", (...args) => event.run(...args));
                }
                else {
                    super.on(eventName, (...args) => event.run(...args));
                }
            }
        }
    }
    updateSlash() {
        const cmds = [];
        const map = Array.from(this.commands);
        for (const command of Object(map)) {
            cmds.push({
                name: command.name,
                description: command.description,
                options: command.options,
                permissions: command.permissions,
                type: command.type || 1,
                autocomplete: command.autocomplete || false,
            });
        }
        this.application.bulkEditGuildCommands("892472046729179136", cmds);
        console.log("\x1b[32m[CLIENT] Os slash commands foram atualizados");
    }
    connectLavaLink() {
        const nodes = [
            {
                id: "Craftsapiens Lavalink Node",
                hostname: process.env.LAVALINKURL,
                port: 50011,
                password: process.env.LAVALINKPASSWORD,
                maxRetryAttempts: 10,
                retryAttemptsInterval: 3000,
                secure: false,
            }
        ];
        this.music = new Music_1.default(this, nodes);
        this.music.init();
        super.on("packet", (packet) => this.music.handleVoiceUpdate(packet));
    }
    async getCronograma() {
        const canal = this.guilds.get("892472046729179136").channels.get("939937615325560912");
        if (canal.type !== oceanic_js_1.Constants.ChannelTypes.GUILD_ANNOUNCEMENT)
            return null;
        const channelmessages = await canal.getMessages();
        const cronograma = channelmessages.find(m => m.attachments.size > 0).attachments.first();
        if (cronograma?.url) {
            return cronograma;
        }
        return null;
    }
    getHighestRole(guild, user) {
        const member = guild?.members.find(m => m.user.id == user || m.nick == user);
        if (!member)
            return "";
        const roles = member?.roles.map(r => guild?.roles.get(r));
        if (!roles[0])
            return "";
        const highestRole = roles?.reduce((a, b) => a.position > b.position ? a : b);
        return highestRole?.name;
    }
    nFormatter(num, digits) {
        const lookup = [
            { value: 1, symbol: "" },
            { value: 1e3, symbol: "k" },
            { value: 1e6, symbol: "M" },
            { value: 1e9, symbol: "G" },
            { value: 1e12, symbol: "T" },
            { value: 1e15, symbol: "P" },
            { value: 1e18, symbol: "E" }
        ];
        const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
        const item = lookup.findLast(item => num >= item.value);
        return item ? (num / item.value).toFixed(digits).replace(regexp, "").concat(item.symbol) : "0";
    }
    getDiscordByNick(nick) {
        const member = this.guilds.get("892472046729179136")?.members.find(m => m?.nick && m.nick?.toLowerCase() == nick?.toLowerCase() && m.roles.includes("1152666174157488258")) || null;
        return member;
    }
    async getTownInfo(cityName) {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/towns/${cityName}`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getTownList() {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/towns`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getNationInfo(nationName) {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/nations/${nationName}`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getNationList() {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/nations`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getPlayerList() {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/players`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getPlayerInfo(playerName) {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/players/${playerName}`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
    async getServerInfo() {
        const API_BASE = process.env.API_URL;
        const TOKEN = process.env.API_TOKEN;
        const res = await (0, node_fetch_1.default)(`${API_BASE}/server`, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        const data = await res.json();
        return data;
    }
}
exports.default = DGClient;
