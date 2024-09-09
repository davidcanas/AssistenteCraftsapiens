"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlinePlayerInfo = exports.getDynmapPlayersVanilla = exports.getDynmapPlayers = exports.findCityInfo = exports.findPlayerCity = exports.getAllRegisteredPlayers = exports.getAllRegisteredCities = void 0;
const staffDB_1 = __importDefault(require("../models/staffDB"));
function getAllRegisteredCities(serverData) {
    const cityMarkers = serverData.updates.filter(update => update.type === "component" && update.ctype === "markers" && update.id.includes("__home"));
    const registeredCities = [];
    const cityNamesSet = new Set();
    cityMarkers.forEach(cityMarker => {
        const cityName = cityMarker.label.replace(/_/g, " ");
        if (!cityNamesSet.has(cityName)) {
            cityNamesSet.add(cityName);
            if (cityMarker.desc) {
                const mayorMatch = cityMarker.desc.match(/Mayor\s+<span[^>]*>(.*?)<\/span>/);
                const mayor = mayorMatch && mayorMatch[1] ? mayorMatch[1] : "NPC";
                const nationNameMatch = cityMarker.desc.match(/nation:\s*([^<]*)/);
                const nationName = nationNameMatch && nationNameMatch[1] ? nationNameMatch[1] : "N/A";
                const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);
                const residents = associateListMatch && associateListMatch[1] ? associateListMatch[1].split(", ") : [];
                const ruinedMatch = cityMarker.desc.match(/ruined:\s*true/);
                const isRuined = ruinedMatch ? true : false;
                registeredCities.push({
                    name: cityName,
                    mayor: mayor,
                    members: residents,
                    nation: nationName,
                    ruined: isRuined,
                    coords: {
                        x: cityMarker.x,
                        y: cityMarker.y,
                        z: cityMarker.z
                    }
                });
            }
        }
    });
    return registeredCities;
}
exports.getAllRegisteredCities = getAllRegisteredCities;
function getAllRegisteredPlayers(serverData) {
    const registeredPlayers = [];
    const cityMarkers = serverData.updates.filter(update => update.type === "component" && update.ctype === "markers");
    cityMarkers.forEach((cityMarker) => {
        if (cityMarker.desc) {
            const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);
            if (associateListMatch && associateListMatch[1]) {
                const associates = associateListMatch[1].split(", ");
                registeredPlayers.push(...associates);
            }
        }
    });
    return Array.from(new Set(registeredPlayers));
}
exports.getAllRegisteredPlayers = getAllRegisteredPlayers;
function findPlayerCity(serverData, playerName) {
    const cityMarkers = serverData.updates.filter(update => update.type === "component" && update.ctype === "markers");
    for (const cityMarker of cityMarkers) {
        if (cityMarker.desc) {
            const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);
            if (associateListMatch && associateListMatch[1]) {
                const associates = associateListMatch[1].split(", ");
                if (associates.includes(playerName)) {
                    const mayorMatch = cityMarker.desc.match(/Mayor\s+<span[^>]*>(.*?)<\/span>/);
                    const mayor = mayorMatch && mayorMatch[1] ? mayorMatch[1] : "N/A";
                    const nationMatch = cityMarker.desc.match(/nation:\s+([^\s<]*)/);
                    const nation = nationMatch && nationMatch[1] ? nationMatch[1] : "N/A";
                    const ruinedMatch = cityMarker.desc.match(/ruined:\s*true/);
                    const isRuined = ruinedMatch ? true : false;
                    return {
                        name: cityMarker.label.replace(/_/g, " "),
                        mayor: mayor,
                        nation: nation,
                        members: associates,
                        ruined: isRuined,
                        coords: {
                            x: cityMarker.x,
                            y: cityMarker.y,
                            z: cityMarker.z
                        }
                    };
                }
            }
        }
    }
    return undefined;
}
exports.findPlayerCity = findPlayerCity;
function findCityInfo(serverData, cityName) {
    const cityMarker = serverData.updates.find(update => update.type === "component" && update.ctype === "markers" && update.label.toLowerCase() === cityName.toLowerCase().replace(/ /g, "_") && update.id.toLowerCase() === cityName.toLowerCase() + "__home");
    if (cityMarker && cityMarker.desc) {
        const associateListMatch = cityMarker.desc.match(/Associates\s+<span[^>]*>(.*?)<\/span>/);
        const mayorMatch = cityMarker.desc.match(/Mayor\s+<span[^>]*>(.*?)<\/span>/);
        const nationMatch = cityMarker.desc.match(/nation:\s+([^\s<]*)/);
        if (associateListMatch && associateListMatch[1] && mayorMatch && mayorMatch[1]) {
            const associates = associateListMatch[1].split(", ");
            const mayor = mayorMatch[1];
            const nation = nationMatch[1];
            const ruinedMatch = cityMarker.desc.match(/ruined:\s*true/);
            const isRuined = ruinedMatch ? true : false;
            return {
                name: cityMarker.label.replace(/_/g, " "),
                mayor: mayor,
                nation: nation,
                members: associates,
                coords: {
                    x: cityMarker.x,
                    y: cityMarker.y,
                    z: cityMarker.z,
                },
                ruined: isRuined
            };
        }
    }
    return undefined;
}
exports.findCityInfo = findCityInfo;
async function getDynmapPlayers() {
    const req = await fetch("http://172.17.0.1:2053/up/world/Earth/");
    const result = await req.json();
    const playerArray = [];
    //@ts-expect-error - playerArray needs to be fixed
    for (const player of result.players) {
        const db = await staffDB_1.default.findOne({ nick: player.name });
        if (db) {
            player.name = `[${db.role}] ${player.name}`;
            playerArray.push({ name: player.name, health: player.health, order: 1 });
        }
        else {
            playerArray.push({ name: player.name, health: player.health, order: player.name.length });
        }
    }
    playerArray.sort((a, b) => a.order - b.order);
    if (playerArray.length === 0)
        return ["Ninguém online no momento."];
    const p = playerArray.map((p) => `${p.name} (${p.health} ❤️)`);
    return p;
}
exports.getDynmapPlayers = getDynmapPlayers;
async function getDynmapPlayersVanilla() {
    const req = await fetch("http://172.17.0.1:2053/up/world/Earth/");
    const result = await req.json();
    const playerArray = [];
    const db = await staffDB_1.default.find({});
    // @ts-expect-error - playerArray needs to be fixed
    result.players.forEach((player) => {
        if (db.find(p => p.nick == player.name)) {
            playerArray.push({ name: player.name, health: player.health, order: 1 });
            return;
        }
        else {
            playerArray.push({ name: player.name, health: player.health, order: player.name.length });
        }
    });
    // @ts-expect-error - sort needs to be fixed
    playerArray.sort((a, b) => a.order - b.order);
    if (playerArray.length == 0)
        return ["Ninguém online no momento."];
    return playerArray;
}
exports.getDynmapPlayersVanilla = getDynmapPlayersVanilla;
function getOnlinePlayerInfo(serverData, playerName) {
    const player = serverData.players.find(player => player.name.toLowerCase() === playerName.toLowerCase());
    if (player && player?.x) {
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
    }
    else {
        return { name: playerName, online: false };
    }
}
exports.getOnlinePlayerInfo = getOnlinePlayerInfo;
