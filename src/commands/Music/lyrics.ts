import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { getLyrics, getSong } from 'genius-lyrics-api';

export default class Lyrics extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'lyrics',
			description: 'Veja a letra da música atual ou de outra música que você deseja',
			category: 'Music',
			aliases: [],
			options: [ 
                {
                    name: 'musica',
                    description: 'Nome da música',
                    type: 3,
                    required: false,
                },
            ],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const player = this.client.music.players.get(ctx.msg.guildID);
	
		if (!player && !ctx.args[0]) {
			ctx.sendMessage('Não estou a tocar nada e você não especificou nenhuma música');
			return;
		}
		

        if (ctx.args[0]) { 
            const [author, title] = ctx.args.join('').split(' - ').map(part => part.trim());

            const options = {
                apiKey: process.env.GENIUS,
                title: title,
                artist: author,
                optimizeQuery: true
            };
            const searchResult = await getLyrics(options).then((lyrics) => console.log(lyrics));
            if (!searchResult) {
                ctx.sendMessage('Não encontrei nenhuma música com esse nome');
                return;
            }
            console.log(searchResult);
            
        } else {   

            const options = {
                apiKey: process.env.GENIUS,
                title: player.current.title,
                artist: player.current.author,
                optimizeQuery: true
            };
            const searchResult = await getLyrics(options).then((lyrics) => console.log(lyrics));
            if (!searchResult) {
                ctx.sendMessage('Não encontrei a letra dessa música');
                return;
            }
            console.log(searchResult);
        }


	}
}