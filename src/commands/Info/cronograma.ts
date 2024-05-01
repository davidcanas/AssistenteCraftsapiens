import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

export default class Botinfo extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'botinfo',
			description: 'Informações sobre o estado do Assistente',
			category: 'Info',
			aliases: ['bi'],
			options: [],
		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		
        const cronograma = await this.client.getCronograma();
        const embed = new this.client.embed()
        .setTitle('📆 Cronograma de aulas') 
        .setDescription('Aqui está o cronograma de aulas mais recente da Craftsapiens!')
        .setImage(cronograma?.url)
        .setColor('RANDOM')
        .setTimestamp()
        .setFooter('Craftsapiens', this.client.user.avatarURL());

        ctx.sendMessage({
            embeds: [embed],
        });
        
        const db = await this.client.db.global.findOne({ id: ctx.guild.id });
        db.helped++;
        await db.save();
	}
}
