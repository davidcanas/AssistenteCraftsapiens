/** Rejeita se `promise` não terminar em `ms` (fetch sem timeout pode ficar pendurado para sempre). */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Tempo esgotado (${ms} ms).`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
