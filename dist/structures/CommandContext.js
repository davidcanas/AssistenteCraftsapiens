"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Type = void 0;
const oceanic_js_1 = require("oceanic.js");
var Type;
(function (Type) {
    Type[Type["MESSAGE"] = 0] = "MESSAGE";
    Type[Type["INTERACTION"] = 1] = "INTERACTION";
})(Type || (exports.Type = Type = {}));
class CommandContext {
    constructor(client, interaction, args = []) {
        this.args = [];
        this.client = client;
        this.interactionOrMessage = interaction;
        if (interaction instanceof oceanic_js_1.Message) {
            this.type = Type.MESSAGE;
            this.args = args;
            this.attachments = [...interaction.attachments.values()];
        }
        else {
            this.type = Type.INTERACTION;
            this.attachments = [];
            if (interaction.data.type === 1) {
                if (interaction.data.options.raw?.[0]?.type === 1) {
                    this.args.push(interaction.data.options.raw[0].name.toString().trim());
                    if (interaction.data.options.raw[0].options) {
                        for (const val of interaction.data.options.raw[0].options) {
                            this.args.push(val.value.toString().trim());
                        }
                    }
                }
                else {
                    if (interaction.data.resolved?.users) {
                        this.targetUsers = interaction.data.resolved?.users?.map((user) => user);
                    }
                    if (interaction.data.resolved?.roles) {
                        this.targetRoles = interaction.data.resolved?.roles?.map((role) => role);
                    }
                    if (interaction.data.resolved?.channels) {
                        this.targetChannels = interaction.data.resolved?.channels?.map((channel) => channel);
                    }
                    const options = interaction.data.options
                        .raw;
                    this.args = options.map((ops) => ops.value.toString().trim());
                    this.argsObj = options.map((ops) => ops);
                }
            }
            else if (interaction.data.type === 2) {
                this.targetUsers = interaction.data.resolved?.users?.map((user) => user);
            }
            else if (interaction.data.type === 3) {
                this.args = interaction.data
                    .resolved.messages.get(interaction.data.targetID)
                    .content.split(/ +/);
            }
        }
    }
    get msg() {
        return this.interactionOrMessage;
    }
    get author() {
        if (this.interactionOrMessage instanceof oceanic_js_1.Message)
            return this.interactionOrMessage.author;
        return this.interactionOrMessage.member.user;
    }
    get member() {
        return this.interactionOrMessage.member;
    }
    get guild() {
        return this.client.guilds.get(this.interactionOrMessage.guildID);
    }
    get channel() {
        return this.interactionOrMessage.channel;
    }
    async sendMessage(content) {
        content = this.formatContent(content);
        const fetchReply = !!content.fetchReply;
        delete content.fetchReply;
        if (content.content === undefined)
            content.content = "";
        if (this.interactionOrMessage instanceof oceanic_js_1.Message) {
            content.messageReference = {
                messageID: this.interactionOrMessage.id,
            };
            this.channel.createMessage(content);
            return;
        }
        else {
            if (this.deferred) {
                await this.interactionOrMessage.editOriginal(content);
            }
            else {
                await this.interactionOrMessage.createMessage(content);
            }
            if (fetchReply) {
                return this.interactionOrMessage.getOriginal();
            }
        }
    }
    formatContent(content) {
        if (typeof content === "string")
            return { content };
        return content;
    }
    errorEmbed(title) {
        const embed = new this.client.embed()
            .setTitle("❌ Ocorreu um erro")
            .setDescription(title)
            .setColor("ff0000");
        this.sendMessage({ content: "", embeds: [embed], flags: 1 << 6 });
    }
    MsToDate(time) {
        if (!time)
            return "No time provided";
        if (isNaN(time))
            return "The time provided is not a number ! ";
        time = Math.round(time / 1000);
        const s = time % 60, m = ~~((time / 60) % 60), h = ~~((time / 60 / 60) % 24), d = ~~(time / 60 / 60 / 24);
        return `${d}D:${h}H:${m}M:${s}S`;
    }
    //MsToHour by: 5antos :D
    MsToHour(time) {
        time = Math.round(time / 1000);
        const s = time % 60, m = ~~((time / 60) % 60), h = ~~(time / 60 / 60);
        return h === 0
            ? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${String(Math.abs(h) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    progressBar(current, total, barSize) {
        const progress = Math.round((barSize * current) / total);
        return "━".repeat(progress > 0 ? progress - 1 : progress) + "🔘" + "━".repeat(barSize - progress);
        // 
    }
    async defer() {
        if (this.interactionOrMessage instanceof oceanic_js_1.CommandInteraction) {
            this.interactionOrMessage.defer();
            this.deferred = true;
        }
    }
}
exports.default = CommandContext;
