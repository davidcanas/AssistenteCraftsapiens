const LINHA = /^(\d{17,20})\s+([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

/** Lê o accounts.aof do DiscordSRV (`<discordId> <uuid>` por linha), ignorando linhas vazias ou malformadas. */
export function lerAccountsAof(texto: string): Array<{ discordId: string; uuid: string }> {
	const contas: Array<{ discordId: string; uuid: string }> = [];
	for (const linha of texto.split(/\r?\n/)) {
		const m = LINHA.exec(linha.trim());
		if (m) contas.push({ discordId: m[1], uuid: m[2] });
	}
	return contas;
}
