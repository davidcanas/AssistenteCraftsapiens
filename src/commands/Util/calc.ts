import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { create, all } from 'mathjs';

export default class calcClass extends Command {
	constructor(client: Client) {
		super(client, {
			name: 'calc',
			description: 'Efetua cálculos matemáticos',
			category: 'Util',
			aliases: ['calcular'],
			options: [
				{
					type: 3,
					name: 'calculo',
					description: 'A expressão matemática que você quer calcular',
					required: true

				}],

		});
	}

	async execute(ctx: CommandContext): Promise<void> {
		const math = create(all);
		const limitedEvaluate = math.evaluate;

		math.import({
			'import': function () { throw new Error(); },
			'createUnit': function () { throw new Error(); },
			'evaluate': function () { throw new Error(); },
			'parse': function () { throw new Error(); },
			'simplify': function () { throw new Error(); },
			'derivative': function () { throw new Error(); },
			'format': function () { throw new Error(); },
			'zeros': function () { throw new Error(); },
			'ones': function () { throw new Error(); },
			'identity': function () { throw new Error(); },
			'range': function () { throw new Error(); },
			'matrix': function () { throw new Error(); }
		}, { override: true });

		const expr = ctx.args.join(' ').replace(/π/g, 'pi').replace(/÷|:/g, '/').replace(/×/g, '*').replace(/\*\*/g, '^').replace(/"|'|\[|\]|\{|\}/g, '').toLowerCase();
		let result;

		if (!expr.length) {
			ctx.sendMessage({ content: 'Cálculo inválido', flags: 1 << 6 });
			return;
		}
		try {
			result = limitedEvaluate && limitedEvaluate(expr);
		} catch (err) {
			ctx.sendMessage({ content: 'Cálculo inválido', flags: 1 << 6 });
			return;
		}

		if (result === undefined || result === null || typeof result === 'function') {
			ctx.sendMessage({ content: 'Cálculo inválido', flags: 1 << 6 });
			return;
		}
		if (result === Infinity || result === -Infinity || result.toString() === 'NaN') result = 'Impossível calcular';

		const embed = new this.client.embed()
			.setTitle('<:calc:1187461287433740288> Calculadora')
			.setColor('RANDOM')
			.addField('Cálculo', `\`\`\`${ctx.args.join(' ')}\`\`\``)
			.addField('Resultado', `\`\`\`${result}\`\`\``);

		ctx.sendMessage({ embeds: [embed] });
	}
}