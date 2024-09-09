"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ready {
    constructor(client) {
        this.client = client;
    }
    async run() {
        const activities = [
            "✨ | Pronto para ajudar na craftsapiens!",
            "👀 | jogar.craftsapiens.com.br",
            `🙍‍♂️ | Interagindo com ${this.client.users.size} jogadores!`,
        ];
        let i = 0;
        setInterval(async () => {
            this.client.editStatus("online", [
                {
                    name: `${activities[i++ % activities.length]}`,
                    type: 2,
                },
            ]);
        }, 15000);
        console.log("\x1b[32m[CLIENT] O client foi conectado com sucesso");
        this.client.updateSlash();
        this.client.connectLavaLink();
        await this.client.updateTownyCache();
    }
}
exports.default = ready;
