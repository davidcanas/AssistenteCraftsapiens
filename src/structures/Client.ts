/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import {
	Client,
	ClientOptions,
	Constants,
	Guild,
	User,
	ClientEvents,
	Member,
} from 'oceanic.js';

import { CityInfo, Command, Utils } from '../typings/index';

import staffJSON from '../data/staff.json';

import global from '../models/globalDB';
import users from '../models/userDB';
import staff from '../models/staffDB';

import Embed from './Embed';

import { NodeOptions } from 'vulkava';

import Music from './Music';

import levenshteinDistance from '../utils/levenshteinDistance';
import { getOnlinePlayerInfo, findCityInfo, findPlayerCity, getAllRegisteredCities, getAllRegisteredPlayers, getDynmapPlayers } from '../utils/getDynmapInfo';

import {
	ComponentCollector,
	MessageCollector,
	ReactionCollector,
} from './Collector';

import fetch from 'node-fetch';

import path from 'path';

export default class DGClient extends Client {
	commands: Array<Command>;
	music: Music;
	db: {
    global: typeof global;
	users: typeof users;
	staff: typeof staff;
  };
	utils: Utils;
	fetch: typeof fetch;
	embed: typeof Embed;
	owner: User;
	guildID: string;
	allowedUsers: Array<string>;
	messageCollectors: Array<MessageCollector>;
	componentCollectors: Array<ComponentCollector>;
	reactionCollectors: Array<ReactionCollector>;
	ignoreRoles: string[];

	constructor(token: string) {
		const clientOptions: ClientOptions = {
			auth: token,
			defaultImageFormat: 'png',
			gateway: {
				getAllUsers: true,
				intents: [
					'ALL'
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
			staff: staff,
		};
		this.utils = {
			levDistance: levenshteinDistance,
			dynmap: {
				findPlayerCity,
				findCityInfo,
				getAllRegisteredCities,
				getAllRegisteredPlayers,
				getDynmapPlayers,
				getOnlinePlayerInfo,
			},
		};
		this.fetch = fetch;
		this.embed = Embed;
		this.messageCollectors = [];
		this.componentCollectors = [];
		this.reactionCollectors = [];
		this.owner = this.users.get('733963304610824252');
		this.guildID = '892472046729179136';
		this.allowedUsers = ['733963304610824252', '402190502172295168', '828745580125225031', '286573832913813516'];
		this.ignoreRoles = [
			'939956623441555558',
			'917900552225054750',
			'901251917991256124',
			'90126307702514078',
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
			path.resolve(__dirname, '..', 'commands'),
		)) {
			if (dir.endsWith('.ts') || dir.endsWith('.js')) {
				const cmd = require(`../commands/${dir}`).default;
				this.commands.push(new cmd(this));
			} else {
				for (const file of fs.readdirSync(
					path.resolve(__dirname, '..', 'commands', dir),
				)) {
					if (file.endsWith('.ts') || file.endsWith('.js')) {
						const command = require(`../commands/${dir}/${file}`).default;
						this.commands.push(new command(this));
					}
				}
			}
		}

		console.log('Os comandos foram carregados.');
	}
	loadEvents(): void {
		for (const file of fs.readdirSync(
			path.resolve(__dirname, '..', 'events'),
		)) {
			if (file.endsWith('.ts') || file.endsWith('.js')) {
				const event = new (require(`../events/${file}`).default)(this);
				const eventName = file.split('.')[0] as keyof ClientEvents;

				if (eventName === 'ready') {
					super.once('ready', (...args) => event.run(...args));
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
		this.application.bulkEditGuildCommands('892472046729179136', cmds);
		console.log('Os slashs foram atualizados');
	}
	connectLavaLink(): void {
		const nodes: NodeOptions[] = [
			{
				id: 'Craftsapiens Lavalink Node',
				hostname: process.env.LAVALINKURL2 as string,
				port: 2333,
				password: process.env.LAVALINKPASSWORD2 as string,
				maxRetryAttempts: 10,
				retryAttemptsInterval: 3000,
				secure: false,
			}
		];

		this.music = new Music(this, nodes);

		this.music.init();
		super.on('packet', (packet) => this.music.handleVoiceUpdate(packet));
	}

	async getPlayerInfo(player: string) {
		try {
			let playerObj: { nick: string; uuid: null; original: boolean; discord?: string | null; staff?: string; isStaff?: boolean; city?: CityInfo; coords?: { x: number; y: number; z: number }; health?: number; armor?: number; online?: boolean };

			const findInMojangRequest = await fetch(
				`https://api.mojang.com/users/profiles/minecraft/${player}`
			);
			const findInDynmapData = await fetch(
				'http://jogar.craftsapiens.com.br:2053/up/world/Earth/'
			).then((r) => r.json());

			const findInMojang = await findInMojangRequest.json();

			if (findInMojang.errorMessage) {
				playerObj = {
					nick: player.toLowerCase(),
					uuid: null,
					original: false,
				};
			} else {
				playerObj = {
					nick: findInMojang.name,
					uuid: findInMojang.id,
					original: true,
				};
			}
			if (staffJSON.find(p => p.nick.toLowerCase() == playerObj.nick.toLowerCase())) {
				playerObj.isStaff = true;
				playerObj.staff = staffJSON.find(p => p.nick.toLowerCase() == playerObj.nick.toLowerCase()).role;
				playerObj.discord = staffJSON.find(p => p.nick.toLowerCase() == playerObj.nick.toLowerCase()).discord;
			} else {
				playerObj.isStaff = false;
				playerObj.discord = await this.guilds.get('892472046729179136')?.members.find(m => m?.nick && m.nick?.toLowerCase() == playerObj.nick?.toLowerCase() && m.roles.includes('1152666174157488258'))?.user.id || null;
			}
			const city = findPlayerCity(findInDynmapData, playerObj.nick);
			
			if (city) {
				playerObj.city = city;
			}
			const online = getOnlinePlayerInfo(findInDynmapData, playerObj.nick);
			if (online.online) {
				playerObj.coords = {
					x: online.x,
					y: online.y,
					z: online.z,
				};
				playerObj.health = online.health || 0;
				playerObj.online = true;
			}
			return playerObj;

		} catch (err) {
			console.log(err);
		}
	}
	async getCronograma() {
		const canal = this.guilds.get('892472046729179136').channels.get('939937615325560912'); 
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
		if (!member) return '';
		const roles = member.roles.map(r => guild?.roles.get(r));
		const highestRole = roles.reduce((a, b) => a.position > b.position ? a : b);
		return highestRole.name;
	}

	nFormatter(num, digits) {
		const lookup = [
          { value: 1, symbol: '' },
          { value: 1e3, symbol: 'k' },
          { value: 1e6, symbol: 'M' },
          { value: 1e9, symbol: 'G' },
          { value: 1e12, symbol: 'T' },
          { value: 1e15, symbol: 'P' },
          { value: 1e18, symbol: 'E' }
		];
		const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
		const item = lookup.findLast(item => num >= item.value);
		return item ? (num / item.value).toFixed(digits).replace(regexp, '').concat(item.symbol) : '0';
   }
   
    getDiscordByNick(nick): Member | null {
	const member = this.guilds.get('892472046729179136')?.members.find(m => m?.nick && m.nick?.toLowerCase() == nick?.toLowerCase() && m.roles.includes('1152666174157488258')) || null;

	return member;
}

}
