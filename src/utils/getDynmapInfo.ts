import staffJSON from '../data/staff.json';
import DGClient from '../structures/Client';

interface Player {
    world?: string;
    armor?: number;
    online?: boolean;
    name?: string;
    x?: number;
    y?: number;
    z?: number;
    health?: number;
    sort?: number;
    type?: string;
    account?: string;
}

interface Marker {
    desc: string;
}

interface CityMarker extends Marker {
    id: string;
    label: string;
}

interface ServerData {
    players: Player[];
    updates: any[];
}

interface CityInfo {
    city: string;
    mayor: string;
    nation: string;
    members: string[];
}

export function getAllRegisteredCities(serverData: ServerData): string[] {
	const cityMarkers: CityMarker[] = serverData.updates.filter(update => update.type === 'component' && update.ctype === 'markers') as CityMarker[];
	const registeredCities: string[] = [];

	cityMarkers.forEach((cityMarker: CityMarker) => {
		registeredCities.push(cityMarker.label.replace(/_/g, ' '));
	});

	return Array.from(new Set(registeredCities));
}

export function getAllRegisteredPlayers(serverData: ServerData): string[] {
	const registeredPlayers: string[] = [];
	const cityMarkers: CityMarker[] = serverData.updates.filter(update => update.type === 'component' && update.ctype === 'markers') as CityMarker[];

	cityMarkers.forEach((cityMarker: CityMarker) => {
		if (cityMarker.desc) {
			const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);

			if (associateListMatch && associateListMatch[1]) {
				const associates = associateListMatch[1].split(', ');
				registeredPlayers.push(...associates);
			}
		}
	});

	return Array.from(new Set(registeredPlayers));
}

export function findPlayerCity(serverData: ServerData, playerName: string): CityInfo | undefined {
	const cityMarkers: CityMarker[] = serverData.updates.filter(update => update.type === 'component' && update.ctype === 'markers') as CityMarker[];

	for (const cityMarker of cityMarkers) {
		if (cityMarker.desc) {
			const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);

			if (associateListMatch && associateListMatch[1]) {
				const associates = associateListMatch[1].split(', ');

				if (associates.includes(playerName)) {
					const mayorMatch = cityMarker.desc.match(/Mayor\s+<span[^>]*>(.*?)<\/span>/);
					const mayor = mayorMatch && mayorMatch[1] ? mayorMatch[1] : 'N/A';

					const nationMatch = cityMarker.desc.match(/nation:\s+([^\s<]*)/);
					const nation = nationMatch && nationMatch[1] ? nationMatch[1] : 'N/A';

					return { city: cityMarker.label.replace(/_/g, ' '), mayor, nation, members: associates };
				}
			}
		}
	}

	return undefined;
}

export function findCityInfo(serverData: ServerData, cityName: string): CityInfo | undefined {
	const cityMarker = serverData.updates.find(update => update.type === 'component' && update.ctype === 'markers' && update.label === cityName.replace(/ /g, '_')) as CityMarker;

	if (cityMarker && cityMarker.desc) {
		const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);
		const mayorMatch = cityMarker.desc.match(/Mayor\s+<span[^>]*>(.*?)<\/span>/);
		const nationMatch = cityMarker.desc.match(/nation:\s+([^\s<]*)/);
        
		if (associateListMatch && associateListMatch[1] && mayorMatch && mayorMatch[1]) {
			const associates = associateListMatch[1].split(', ');
			const mayor = mayorMatch[1];
			const nation = nationMatch[1];

			return { city: cityMarker.label.replace(/_/g, ' '), mayor, nation, members: associates };
		}
	}

	return undefined;

}

export async function getDynmapPlayers() {
	const req = await fetch(
		'http://jogar.craftsapiens.com.br:2053/up/world/Earth/'
	);
	const result = await req.json();

	const playerArray: object[] = [];

	result.players.forEach((player: any) => {

		if (player.name.includes('_')) {
			player.name = player.name.replace(/_/g, '\\_');
		}

		if (staffJSON.find(p => p.nick == player.name)) {
			player.name = `\`✨\` **[${staffJSON.find(p => p.nick == player.name).role}]** ${player.name}`;
			playerArray.push({ name: player.name, health: player.health, order: 1 });
			return;
		} else {
			playerArray.push({ name: player.name, health: player.health, order: player.name.length });
		}
	});

	// @ts-expect-error - to make the sort work
	playerArray.sort((a, b) => a.order - b.order);
	if (playerArray.length == 0) return ['Ninguém online no momento.'];


	const p = playerArray.map((p: any) => `${p.name} \`(${p.health} ❤️)\``);

	return p;
}

export async function getDynmapPlayersVanilla(client: DGClient) {
	const req = await fetch(
		'http://jogar.craftsapiens.com.br:2053/up/world/Earth/'
	);
	const result = await req.json();
    
	const playerArray: object[] = [];
     
    const db = await client.db.staff.find({});

	result.players.forEach((player: any) => {


		if (db.find(p => p.nick == player.name)) {
			playerArray.push({ name: player.name, health: player.health, order: 1 });
			return;
		} else {
			playerArray.push({ name: player.name, health: player.health, order: player.name.length });
		}
	});

	// @ts-expect-error - sort needs to be fixed
	playerArray.sort((a, b) => a.order - b.order);
	if (playerArray.length == 0) return ['Ninguém online no momento.'];


	return playerArray;
}

export function getOnlinePlayerInfo(serverData: ServerData, playerName: string): Player {
	const player = serverData.players.find(player => player.name.toLowerCase() === playerName.toLowerCase());
	console.log(player);
	if (player && player?.x) {
		console.log('player x');
		return {
			name: player.name,
			online: true,
			health: player.health,
			armor: player.armor,
			x: player.x,
			y: player.y,
			z: player.z,
			world: player.world,
			account: player.account
		};
	} else {

		return { name: playerName, online: false };
    
	}
}
