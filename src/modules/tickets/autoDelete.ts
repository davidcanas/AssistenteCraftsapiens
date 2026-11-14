/** Respostas privadas do painel somem sozinhas para não acumularem no canal. */
export const PANEL_REPLY_TTL_MS = 5 * 60_000; // Precisa ser menor que os 15 min de validade do token da interação.

export function deleteReplyLater(interaction: { deleteOriginal(): Promise<void> }): void {
	const timer = setTimeout(() => {
		// Falha esperada quando o jogador já clicou em "Ignorar mensagem".
		interaction.deleteOriginal().catch(() => undefined);
	}, PANEL_REPLY_TTL_MS);
	timer.unref?.();
}
