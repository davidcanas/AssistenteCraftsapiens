import fetch from "node-fetch";
import staffJSON from "../data/staff.json";

export async function getDynmapPlayers() {
    const req = await fetch(
        "http://jogar.craftsapiens.com.br:10004/up/world/Earth/"
    );
    const result = await req.json();

    const playerArray: Object[] = [];

    result.players.forEach((player: any) => {

        if (player.name.includes("_")) {
            player.name = player.name.replace(/_/g, "\\_");
        }

        if (staffJSON.find(p => p.nick == player.name)) {
            player.name = `\`✨\` **[${staffJSON.find(p => p.nick == player.name).role}]** ${player.name}`;
            playerArray.push({ name: player.name, health: player.health, order: 1 });
            return;
        } else {
            playerArray.push({ name: player.name, health: player.health, order: player.name.length });
        }
    });

    // @ts-ignore
    playerArray.sort((a, b) => a.order - b.order);
    if (playerArray.length == 0) return ["Ninguém online no momento."];


    const p = playerArray.map((p: any) => `${p.name} \`(${p.health} ❤️)\``);

    return p;
}

export async function getDynmapPlayersVanilla() {
    const req = await fetch(
        "http://jogar.craftsapiens.com.br:10004/up/world/Earth/"
    );
    const result = await req.json();

    const playerArray: Object[] = [];

    result.players.forEach((player: any) => {


        if (staffJSON.find(p => p.nick == player.name)) {
            playerArray.push({ name: player.name, health: player.health, order: 1 });
            return;
        } else {
            playerArray.push({ name: player.name, health: player.health, order: player.name.length });
        }
    });

    // @ts-ignore
    playerArray.sort((a, b) => a.order - b.order);
    if (playerArray.length == 0) return ["Ninguém online no momento."];


    const p = playerArray.map((p: any) => p.name);

    return p;
}
