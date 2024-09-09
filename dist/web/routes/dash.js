"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const body_parser_1 = __importDefault(require("body-parser"));
const main_1 = __importDefault(require("../../main"));
const isLogged_1 = __importDefault(require("../helpers/isLogged"));
const isAdmin_1 = __importDefault(require("../helpers/isAdmin"));
const router = (0, express_1.Router)();
router.use(body_parser_1.default.urlencoded({ extended: true }));
router.use(body_parser_1.default.json());
router.use(isLogged_1.default);
router.use(isAdmin_1.default);
router.get("/", async (req, res) => {
    res.status(200).render("dash", {
        user: req.user,
        member: main_1.default.guilds.get("892472046729179136").members.get(req.user.id),
        avatar: main_1.default.users.get(req.user.id).avatarURL(),
        guild: main_1.default.guilds.get("892472046729179136"),
        highestRole: main_1.default.getHighestRole,
        nFormatter: main_1.default.nFormatter,
        db: await main_1.default.db.global.findOne({ id: "892472046729179136" })
    });
});
router.post("/classes", async (req, res) => {
    const db = await main_1.default.db.global.findOne({ id: "892472046729179136" });
    if (!db)
        return res.send("Erro ao buscar o banco de dados");
    if (req.body.enableClasses == "on")
        db.classes.enabled = false;
    else
        db.classes.enabled = true;
    db.classes.reason = req.body.txtBox;
    db.save();
    res.status(200).redirect("/dash");
});
router.get("/url/remove/:url", async (req, res) => {
    const db = await main_1.default.db.global.findOne({ id: "892472046729179136" });
    if (!db)
        return res.send("Erro ao buscar o banco de dados");
    if (!db.whitelistedUrl.includes(req.params.url))
        return res.send("Esse domínio não está na whitelist");
    db.whitelistedUrl = db.whitelistedUrl.filter((d) => d !== req.params.url);
    db.save();
    res.status(200).redirect("/dash");
});
router.post("/url/add", async (req, res) => {
    const db = await main_1.default.db.global.findOne({ id: "892472046729179136" });
    if (!db)
        return res.send("Erro ao buscar o banco de dados");
    if (req.body.links == "on")
        db.whitelistedUrlEnabled = true;
    else
        db.whitelistedUrlEnabled = false;
    if (req.body.url.length > 3) {
        if (db.whitelistedUrl.includes(req.body.url)) {
            db.save();
            res.send("Esse domínio já está na whitelist");
            return;
        }
        db.whitelistedUrl.push(req.body.url);
    }
    db.save();
    res.status(200).redirect("/dash");
});
exports.default = router;
