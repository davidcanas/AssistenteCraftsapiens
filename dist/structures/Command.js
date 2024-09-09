"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Command {
    constructor(client, options) {
        this.client = client;
        this.name = options.name;
        this.description =
            options.category + " | " + options.description ||
                options.category + " | " + "Nenhuma descrição especificada";
        this.aliases = options.aliases;
        this.category = options.category;
        this.options = options.options;
        this.default_member_permissions = options.default_member_permissions;
        this.autocomplete = options.autocomplete;
        this.type = 1;
    }
}
exports.default = Command;
