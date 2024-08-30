import { Client, ClientOptions } from "oceanic.js";
import { NodeOptions } from "vulkava";

import Music from "./subMusic";

export default class subClient extends Client {

	music: Music;

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


	}

	connect(): Promise<void> {
		return super.connect();
	}

	connectLavaLink(): void {
		const nodes: NodeOptions[] = [
			{
				id: `${this.user.username}'s Lavalink`,
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

	registerSlashCommands(): void {
		const cmds = [
			{
				name: this.user.username.toLowerCase(),
				description: this.user.username + " | Mostra a música que está tocando no momento",
				type: 1,
				options: []
			}
		];

		this.application.bulkEditGuildCommands("892472046729179136", cmds);
	}
	MsToHour(time) {
		time = Math.round(time / 1000);
		const s = time % 60,
			m = ~~((time / 60) % 60),
			h = ~~(time / 60 / 60);

		return h === 0
			? `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
			: `${String(Math.abs(h) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}
	progressBar(current, total, barSize) {
		const progress = Math.round((barSize * current) / total);

		return "━".repeat(progress > 0 ? progress - 1 : progress) + "🔘" + "━".repeat(barSize - progress);
	}
}
