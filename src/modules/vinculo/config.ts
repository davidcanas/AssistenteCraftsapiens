/** Guilda do Craftsapiens. */
export const GUILD_ID = "892472046729179136";

/** Grupo do LuckPerms -> cargo no Discord (o jogo manda). */
export const GRUPO_CARGO: Record<string, string> = {
	default: "901278048203190272",
	verificado: "1152666174157488258",
	vip: "943544844985466940",
	premium: "901251664579797022",
};

/** Cargo que todo membro vinculado mantém, mesmo ao desvincular. */
export const CARGO_DEFAULT = "901278048203190272";

/** Sem 0, O, 1, I para não confundir na hora de digitar. */
export const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TAMANHO_CODIGO = 6;
export const VALIDADE_CODIGO_MS = 600_000;

export const MAX_TENTATIVAS = 5;
export const JANELA_TENTATIVAS_MS = 600_000;
