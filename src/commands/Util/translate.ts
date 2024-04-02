/* eslint-disable @typescript-eslint/no-explicit-any */
import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import translate from '@iamtraction/google-translate';

export default class translatorClass extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'translate',
			description: 'Traduz um texto para o idioma desejado',
			category: 'Util',
			aliases: ['traduzir', 'tradutor'],
			options: [
				{
					type: 3,
					name: 'lang',
					description: 'A linguagem no qual o texto será traduzido',
					required: true

				},
				{
					type: 3,
					name: 'texto',
					description: 'O texto a ser traduzido',
					required: true

				}
			],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const texto = ctx.args.slice(1).join(' ');

		if (texto.length > 1000) {
			ctx.sendMessage({ content: 'O texto só pode ter no máximo 1000 caracteres', flags: 1 << 6 });
			return;
		}

		try {
			const tradutor = await translate(texto, {
				to: ctx.args[0]
			});

			const embed = new this.client.embed()
				.setColor('RANDOM')
				.setTitle(`<:translation:1186724476117852230> Tradutor: ${tradutor.from.language.iso} -> ${ctx.args[0]}`)
				.addField(`Texto original: (${tradutor.from.language.iso})`, `\`\`\`${texto}\`\`\``)
				.addField(`Texto traduzido: (${ctx.args[0]})`, `\`\`\`${tradutor.text ? tradutor.text : ''}\`\`\``)
				.setTimestamp();
                

			ctx.sendMessage({ embeds: [embed] });
		} catch (err: any) {
			if (err.message.startsWith('The language') && err.message.endsWith('is not supported.')) {
				ctx.sendMessage({ content: 'A linguagem especificada não é suportada!', flags: 1 << 6 });
				return;
			}
			ctx.sendMessage({ content: 'Ocorreu um erro na execução desse comando', flags: 1 << 6 });
		}
	}
}