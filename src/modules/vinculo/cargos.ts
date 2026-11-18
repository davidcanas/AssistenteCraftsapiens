import { CARGO_DEFAULT, GRUPO_CARGO } from "./config";

/** Minúsculas, sem repetição e sempre com `default`. */
export function normalizarGrupos(grupos: string[]): string[] {
	const set = new Set(grupos.map((g) => g.toLowerCase()));
	set.add("default");
	return [...set];
}

/** Compara os grupos do jogo com os cargos do membro; só mexe em cargos da tabela. */
export function planejarCargos(grupos: string[], cargosAtuais: string[]): { adicionar: string[]; remover: string[] } {
	const desejados = new Set<string>();
	for (const grupo of normalizarGrupos(grupos)) {
		const cargo = GRUPO_CARGO[grupo];
		if (cargo) desejados.add(cargo);
	}
	const gerenciados = new Set(Object.values(GRUPO_CARGO));
	return {
		adicionar: [...desejados].filter((c) => !cargosAtuais.includes(c)),
		remover: cargosAtuais.filter((c) => gerenciados.has(c) && !desejados.has(c)),
	};
}

/** Cargos da tabela a tirar ao desvincular (o `default` fica). */
export function cargosDoDesvinculo(cargosAtuais: string[]): string[] {
	const gerenciados = new Set(Object.values(GRUPO_CARGO));
	return cargosAtuais.filter((c) => gerenciados.has(c) && c !== CARGO_DEFAULT);
}
