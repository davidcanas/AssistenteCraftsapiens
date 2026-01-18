"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = __importDefault(require("../../main"));
function isAdmin(req, res, next) {
    if (req.user && main_1.default.allowedUsers.includes(req.user.id)) {
        return next();
    }
    return res.status(401).render("errors/401", { ip: req.ip, user: req.user });
}
exports.default = isAdmin;
