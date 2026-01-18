"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const body_parser_1 = __importDefault(require("body-parser"));
const main_1 = __importDefault(require("../../main"));
const router = (0, express_1.Router)();
router.use(body_parser_1.default.urlencoded({ extended: true }));
router.use(body_parser_1.default.json());
router.get("/", async (req, res) => {
    res.render("mapa/city");
});
router.get("/iframe", async (req, res) => {
    const cityName = req.query.cityName ? req.query.cityName.replace(/\s+/g, "_") : null;
    let cityInfo = null;
    if (req.query.cityName) {
        cityInfo = await main_1.default.api.getTownInfo(cityName);
        console.log(cityInfo);
    }
    res.render("mapa/iframe", { cityInfo, cityName });
});
exports.default = router;
