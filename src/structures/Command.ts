import Client from './Client';
import { CommandSettings } from '../typings';

export default class Command implements CommandSettings {
	client: Client;
	description: string;
	name: string;
	aliases?: Array<string>;
	category: 'Info' | 'DG' | 'Util' | 'Music';
	options: Array<object>;
	default_member_permissions?: number;
	autocomplete?: boolean;
	type: number;
	constructor(client: Client, options: CommandSettings) {
		this.client = client;
		this.name = options.name;
		this.description =
      options.category + ' | ' + options.description ||
      options.category + ' | ' + 'Nenhuma descrição especificada';
		this.aliases = options.aliases;
		this.category = options.category;
		this.options = options.options;
		this.default_member_permissions = options.default_member_permissions;
		this.autocomplete = options.autocomplete;
		this.type = 1;
	}
}
