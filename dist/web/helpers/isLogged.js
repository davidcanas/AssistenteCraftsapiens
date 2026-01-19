"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isLogged(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    else {
        return res.render("errors/401", { ip: req.ip, user: false });
    }
}
exports.default = isLogged;
