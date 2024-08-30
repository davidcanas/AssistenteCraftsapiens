import dotenv from "dotenv";
dotenv.config();
import DGClient from "./structures/Client";
import database from "mongoose";

process.on("uncaughtException", (error) => {
	console.log("Uma exception não tratada foi encontrada!");
	console.error(error);
});

process.on("unhandledRejection", (error) => {
	console.log("Uma promise foi rejeitada sem tratamento!");
	console.error(error);
});

database
	.connect(process.env.MONGODB as string)
	.then(() => console.log("\x1b[32m[CLIENT] A database foi conectada com sucesso!"));

const client = new DGClient(process.env.TOKEN);

client.loadCommands();
client.loadEvents();
client.connect();

require("./web/app");
require("./submodules/nina/ninaBot");
require("./submodules/ada/adaBot");
require("./submodules/luy/luyBot");

export default client;
