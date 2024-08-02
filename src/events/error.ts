import Client from "../structures/Client";

export default class Error {
	client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	run(err: Error): void {
		console.error("Erro " + err);
	}
}
