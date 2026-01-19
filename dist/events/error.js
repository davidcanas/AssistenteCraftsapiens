"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Error {
    constructor(client) {
        this.client = client;
    }
    run(err) {
        console.log("Erro no client");
        console.error(err);
    }
}
exports.default = Error;
