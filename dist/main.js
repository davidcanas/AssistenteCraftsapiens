"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Client_1 = __importDefault(require("./structures/Client"));
const mongoose_1 = __importDefault(require("mongoose"));
process.on("uncaughtException", (error) => {
    console.log("Uma exception não tratada foi encontrada!");
    console.error(error);
});
process.on("unhandledRejection", (error) => {
    console.log("Uma promise foi rejeitada sem tratamento!");
    console.error(error);
});
mongoose_1.default
    .connect(process.env.MONGODB)
    .then(() => console.log("\x1b[32m[CLIENT] A database foi conectada com sucesso!"));
const client = new Client_1.default(process.env.TOKEN);
client.loadCommands();
client.loadEvents();
client.connect();
require("./web/app");
require("./submodules/nina/ninaBot");
require("./submodules/ada/adaBot");
require("./submodules/luy/luyBot");
exports.default = client;
