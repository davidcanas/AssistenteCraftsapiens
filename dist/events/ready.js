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
        // Clear existing interval to prevent memory leaks on reconnect
        if (this.client.statusInterval) {
            clearInterval(this.client.statusInterval);
        }
        this.client.statusInterval = setInterval(async () => {
            this.client.editStatus("online", [
                {
                    name: `${activities[i++ % activities.length]}`,
                    type: 2,
                },
            ]);
        }, 15000);
        console.log("\x1b[32m[CLIENT] O client foi conectado com sucesso");
        this.client.updateSlash();
        if (process.env.DEVELOPMENT !== "true") {
            this.client.connectLavaLink();
        }
    }
}
exports.default = ready;
