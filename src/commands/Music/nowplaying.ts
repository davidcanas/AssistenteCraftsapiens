import Command from "../../structures/Command";
import Client from "../../structures/Client";
import CommandContext from "../../structures/CommandContext";
import { User } from "oceanic.js";

export default class NowPlaying extends Command {
	constructor(client: Client) {
		super(client, {
			name: "np",
			description: "Veja a musica que está sendo tocada nesse momento",
			category: "Music",
			aliases: ["nowplaying"],
			options: [
			], 
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		if (ctx.channel.type !== 0 || !ctx.guild) return;
		
		const currPlayer = this.client.music.players.get(ctx.guild.id as string);
		

		if (!currPlayer || !currPlayer.connected) {
			ctx.sendMessage("Não estou a tocar nada nesse momento.");
			return;
		}

		
        const song = currPlayer.queue.current; 
        const requester = song.requester as User;
        const progressBar = ctx.progressBar((currPlayer.position/1000), (song.info.duration/1000), 20);
        const embed = new this.client.embed()
            .setTitle("🎵 Tocando agora:")
            .setDescription(`\`\`\`\n${progressBar}\n[${ctx.MsToHour(currPlayer.position)}]            [${ctx.MsToHour(song.info.duration)}]\n\`\`\``)
            .addField("🎶 Título:", `\`${song.info.title}\``)
            .addField("⏲️ Duração:", `\`${ctx.MsToHour(song.info.duration)}\``)
            .addField("👤 Pedido por:", `<@${requester.id}>`)
            .setThumbnail(song.info.artworkUrl)
            .setColor("RANDOM");
        
        ctx.sendMessage({ embeds: [embed]});
	}
}