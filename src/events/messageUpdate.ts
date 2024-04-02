import Client from '../structures/Client';

import { JSONMessage, Message } from 'oceanic.js';

export default class MessageUpdate {
	client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	run(message: Message, oldMessage: JSONMessage) {
		if (!oldMessage || !message || oldMessage.content === message.content)
			return;

		this.client.emit('messageCreate', message);
	}
}
