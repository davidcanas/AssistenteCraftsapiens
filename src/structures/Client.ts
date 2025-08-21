/* eslint-disable @typescript-eslint/no-var-requires */
import fs from "fs";
import {
	Client,
	ClientOptions,
	Constants,
	Guild,
	User,
	ClientEvents,
	Member,
} from "oceanic.js";

import { Command, Utils, Api } from "../typings/index";

import global from "../models/globalDB";
import users from "../models/userDB";
import staff from "../models/staffDB";

import Embed from "./Embed";

import { NodeOptions } from "vulkava";

import Music from "./Music";

import levenshteinDistance from "../utils/levenshteinDistance";

import fetch from "node-fetch";

import path from "path";
import ninaBot from "../submodules/nina/ninaBot";
import adaBot from "../submodules/ada/adaBot";
import luyBot from "../submodules/luy/luyBot";

export default class DGClient extends Client {
	commands: Array<Command>;
	music: Music;
	nina: Client;
	ada: Client;
	luy: Client;
	db: {
		global: typeof global;
		users: typeof users;
		staff: typeof staff;
	};
	api: Api;
	utils: Utils;
	fetch: typeof fetch;
	embed: typeof Embed;
	owner: User;
	guildID: string;
	allowedUsers: Array<string>;
	ignoreRoles: string[];

	constructor(token: string) {
		const clientOptions: ClientOptions = {
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
			global: global,
			users: users,
			staff: staff
		};

		this.nina = ninaBot;
		this.ada = adaBot;
		this.luy = luyBot;

		this.utils = {
			levDistance: levenshteinDistance,
		};
		this.api = {
			getTownInfo: this.getTownInfo,
			getTownList: this.getTownList,
			getPlayerInfo: this.getPlayerInfo,
			getPlayerList: this.getPlayerList,
			getServerInfo: this.getServerInfo,
		};
		this.fetch = fetch;
		this.embed = Embed;
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
	async findUser(param: string, guild: Guild | null): Promise<User | null> {
		let user: User | null | undefined;

		const matched = param.match(/<@!?(\d{17,18})>/);

		if (matched) {
			try {
				user =
					this.users.get(matched[1]) || (await this.rest.users.get(matched[1]));
			} catch { /* vazio*/ }
		} else if (/\d{17,18}/.test(param)) {
			try {
				user = this.users.get(param) || (await this.rest.users.get(param));
			} catch { /* vazio */ }
		}

		if (!guild) return null;

		if (!user) {
			const usernameRegex = /(.+)?#(\d{4})/;
			const match = param.match(usernameRegex);

			if (match) {
				if (match[1])
					user = guild.members.find(
						(m) => m.username === match[1] && m.user.discriminator === match[2],
					)?.user;
				else
					user = guild.members.find((m) => m.user.discriminator === match[2])
						?.user;
			}
		}

		if (!user) {
			const lowerCaseParam = param.toLowerCase();
			let startsWith = false;

			for (const m of guild.members.values()) {
				if (
					(m.nick &&
						(m.nick === param ||
							m.nick.toLowerCase() === param.toLowerCase())) ||
					m.username === param ||
					m.username.toLowerCase() === param.toLowerCase()
				) {
					user = m.user;
					break;
				}

				if (
					(m.nick && m.nick.startsWith(lowerCaseParam)) ||
					m.username.toLowerCase().startsWith(lowerCaseParam)
				) {
					user = m.user;
					startsWith = true;
					continue;
				}

				if (
					!startsWith &&
					((m.nick && m.nick.toLowerCase().includes(lowerCaseParam)) ||
						m.username.toLowerCase().includes(lowerCaseParam))
				) {
					user = m.user;
				}
			}
		}
		return user || null;
	}
	connect(): Promise<void> {
		return super.connect();
	}

	loadCommands(): void {
		for (const dir of fs.readdirSync(
			path.resolve(__dirname, "..", "commands"),
		)) {
			if (dir.endsWith(".ts") || dir.endsWith(".js")) {
				const cmd = require(`../commands/${dir}`).default;
				this.commands.push(new cmd(this));
			} else {
				for (const file of fs.readdirSync(
					path.resolve(__dirname, "..", "commands", dir),
				)) {
					if (file.endsWith(".ts") || file.endsWith(".js")) {
						const command = require(`../commands/${dir}/${file}`).default;
						this.commands.push(new command(this));
					}
				}
			}
		}

		console.log("\x1b[32m[CLIENT] Os comandos foram carregados.");
	}
	loadEvents(): void {
		for (const file of fs.readdirSync(
			path.resolve(__dirname, "..", "events"),
		)) {
			if (file.endsWith(".ts") || file.endsWith(".js")) {
				const event = new (require(`../events/${file}`).default)(this);
				const eventName = file.split(".")[0] as keyof ClientEvents;

				if (eventName === "ready") {
					super.once("ready", (...args) => event.run(...args));
				} else {
					super.on(eventName, (...args) => event.run(...args));
				}
			}
		}
	}
	updateSlash(): void {
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
	connectLavaLink(): void {
		const nodes: NodeOptions[] = [
			{
				id: "Craftsapiens Lavalink Node",
				hostname: process.env.LAVALINKURL as string,
				port: 50011,
				password: process.env.LAVALINKPASSWORD as string,
				maxRetryAttempts: 10,
				retryAttemptsInterval: 3000,
				secure: false,
			}
		];

		this.music = new Music(this, nodes);

		this.music.init();
		super.on("packet", (packet) => this.music.handleVoiceUpdate(packet));
	}


	async getCronograma() {
		const canal = this.guilds.get("892472046729179136").channels.get("939937615325560912");
		if (canal.type !== Constants.ChannelTypes.GUILD_ANNOUNCEMENT) return null;
		const channelmessages = await canal.getMessages();
		const cronograma = channelmessages.find(m => m.attachments.size > 0).attachments.first();
		if (cronograma?.url) {
			return cronograma;
		}
		return null;
	}
	getHighestRole(guild, user: string): string {
		const member = guild?.members.find(m => m.user.id == user || m.nick == user);
		if (!member) return "";
		const roles = member?.roles.map(r => guild?.roles.get(r));
		if (!roles[0]) return "";
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

	getDiscordByNick(nick): Member | null {
		const member = this.guilds.get("892472046729179136")?.members.find(m => m?.nick && m.nick?.toLowerCase() == nick?.toLowerCase() && m.roles.includes("1152666174157488258")) || null;

		return member;
	}


	async getTownInfo(cityName: string): Promise<any> {
		const API_BASE = process.env.API_URL;
		const TOKEN = process.env.API_TOKEN;

		const res = await fetch(`${API_BASE}/towns/${cityName}`, {
			headers: {
				"Authorization": `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		const data = await res.json();

		if (!res.ok || data.error) {
			throw new Error(data.error || res.statusText);
		}
		return data;
	}

	async getTownList(): Promise<any> {
		const API_BASE = process.env.API_URL;
		const TOKEN = process.env.API_TOKEN;

		const res = await fetch(`${API_BASE}/towns`, {
			headers: {
				"Authorization": `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		const data = await res.json();

		if (!res.ok || data.error) {
			throw new Error(data.error || res.statusText);
		}
		return data;
	}

	async getPlayerList(): Promise<any> {
		const API_BASE = process.env.API_URL;
		const TOKEN = process.env.API_TOKEN;

		const res = await fetch(`${API_BASE}/players`, {
			headers: {
				"Authorization": `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			throw new Error(data.error || res.statusText);
		}
		return data;
	}

	async getPlayerInfo(playerName: string): Promise<any> {
		const API_BASE = process.env.API_URL;
		const TOKEN = process.env.API_TOKEN;

		const res = await fetch(`${API_BASE}/players/${playerName}`, {
			headers: {
				"Authorization": `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
			},
		});

		const data = await res.json();

		if (!res.ok || data.error) {
			throw new Error(data.error || res.statusText);
		}
		return data;
	}

	async getServerInfo(): Promise<any> {
		const API_BASE = process.env.API_URL;
		const TOKEN = process.env.API_TOKEN;
		const res = await fetch(`${API_BASE}/server`, {
			headers: {
				"Authorization": `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		const data = await res.json();
		if (!res.ok || data.error) {
			throw new Error(data.error || res.statusText);
		}
		return data;

	}

}
