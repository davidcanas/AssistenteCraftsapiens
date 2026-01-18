"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = __importDefault(require("../../structures/Command"));
const mathjs_1 = require("mathjs");
const oceanic_js_1 = require("oceanic.js");
class calcClass extends Command_1.default {
    constructor(client) {
        super(client, {
            name: "calc",
            description: "Efetua cálculos matemáticos",
            category: "Util",
            aliases: ["calcular"],
            options: [
                {
                    type: oceanic_js_1.Constants.ApplicationCommandOptionTypes.USER,
                    name: "calculo",
                    description: "A expressão matemática que você quer calcular",
                    required: true
                }
            ],
        });
    }
    async execute(ctx) {
        const math = (0, mathjs_1.create)(mathjs_1.all);
        const limitedEvaluate = math.evaluate;
        math.import({
            "import": function () { throw new Error(); },
            "createUnit": function () { throw new Error(); },
            "evaluate": function () { throw new Error(); },
            "parse": function () { throw new Error(); },
            "simplify": function () { throw new Error(); },
            "derivative": function () { throw new Error(); },
            "format": function () { throw new Error(); },
            "zeros": function () { throw new Error(); },
            "ones": function () { throw new Error(); },
            "identity": function () { throw new Error(); },
            "range": function () { throw new Error(); },
            "matrix": function () { throw new Error(); }
        }, { override: true });
        const expr = ctx.args.join(" ").replace(/π/g, "pi").replace(/÷|:/g, "/").replace(/×/g, "*").replace(/\*\*/g, "^").replace(/"|'|\[|\]|\{|\}/g, "").toLowerCase();
        let result;
        if (!expr.length) {
            ctx.sendMessage({ content: "Cálculo inválido", flags: 1 << 6 });
            return;
        }
        try {
            result = limitedEvaluate && limitedEvaluate(expr);
        }
        catch (err) {
            ctx.sendMessage({ content: "Cálculo inválido", flags: 1 << 6 });
            return;
        }
        if (result === undefined || result === null || typeof result === "function") {
            ctx.sendMessage({ content: "Cálculo inválido", flags: 1 << 6 });
            return;
        }
        if (result === Infinity || result === -Infinity || result.toString() === "NaN")
            result = "Impossível calcular";
        const embed = new this.client.embed()
            .setTitle("<:calc:1187461287433740288> Calculadora")
            .setColor("RANDOM")
            .addField("Cálculo", `\`\`\`${ctx.args.join(" ")}\`\`\``)
            .addField("Resultado", `\`\`\`${result}\`\`\``);
        ctx.sendMessage({ embeds: [embed] });
    }
}
exports.default = calcClass;
