"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const timezones_json_1 = __importDefault(require("../../data/timezones.json"));
class timezonesClass extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "timezones",
            description: "Mostra a hora atual nos principais fusos horários do mundo",
            category: "Util",
            aliases: ["tz"],
            options: [],
        });
    }
    async execute(ctx) {
        const results = [];
        timezones_json_1.default.timezones.forEach((timezone) => {
            const time = new Date().toLocaleString("pt-BR", { timeZone: timezone.name });
            const [date, hour] = time.split(" ");
            results.push(`${timezone.flag} | ${date} ${hour}`);
        });
        ctx.sendMessage(results.join("\n"));
    }
}
exports.default = timezonesClass;
