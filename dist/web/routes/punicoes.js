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
    const users = await main_1.default.db.users.find({});
    const user = req.user;
    const member = main_1.default.guilds.get("892472046729179136").members.get(user.id);
    res.render("punicoes/listar", {
        dados: users,
        user,
        logged: !!user,
        username: user ? user.username : "",
        avatar: user ? main_1.default.users.get(user.id).avatarURL() : "",
        member,
        highestRole: main_1.default.getHighestRole,
        guild: main_1.default.guilds.get("892472046729179136"),
    });
});
router.get("/punir", (req, res) => {
    const user = req.user;
    const member = main_1.default.guilds.get("892472046729179136").members.get(user.id);
    res.render("punicoes/punir", {
        user,
        member,
        logged: !!user,
        username: user ? user.username : "",
        avatar: user ? main_1.default.users.get(user.id).avatarURL() : "",
        highestRole: main_1.default.getHighestRole,
        guild: main_1.default.guilds.get("892472046729179136"),
    });
});
router.get("/delete/:ID", async (req, res) => {
    const users = await main_1.default.db.users.findOne({ nick: req.params.ID.split("_")[0] });
    if (!users)
        return res.send("Usuário não encontrado!");
    // @ts-expect-error - punicao.id is not explicit in the type
    users.punicoes = users.punicoes.filter((punicao) => punicao.id !== req.params.ID);
    await users.save();
    res.redirect(`/punicoes/info/${users.nick}`);
});
router.post("/punir", async (req, res) => {
    const { nick, motivo, tipo, duracao, punido_por } = req.body;
    const member = main_1.default.guilds.get("892472046729179136").members.get(req.user.id);
    if (!nick || !motivo || !tipo || !punido_por || !duracao)
        return res.send("Preencha todos os campos!");
    const user = main_1.default.db.users;
    const userpunir = await user.findOne({ nick });
    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getHours()}:${(dataAtual.getMinutes() < 10 ? "0" : "") + dataAtual.getMinutes()} do dia ${dataAtual.getDate()}/${dataAtual.getMonth() + 1}/${dataAtual.getFullYear()}`;
    const punicoes = {
        id: `${nick}_${userpunir ? userpunir.punicoes.length + 1 : 1}`,
        motivo,
        tipo,
        duracao,
        punido_por,
        horario: dataFormatada,
    };
    if (!userpunir) {
        await user.create({
            nick,
            punicoes: [punicoes],
        });
    }
    else {
        userpunir.punicoes.push(punicoes);
        await userpunir.save();
    }
    const nomepuni = tipo === "mute" ? "mutado" : "Banido";
    const logged = !!req.user;
    res.render("punicoes/punido", {
        member,
        nick,
        motivo,
        tipo: nomepuni,
        duracao,
        npuni: userpunir ? userpunir.punicoes.length : 1,
        punido_por,
        user: req.user,
        logged,
        username: req.user ? req.user.username : "",
        avatar: logged ? main_1.default.users.get(req.user.id).avatarURL() : "",
        highestRole: main_1.default.getHighestRole,
        guild: main_1.default.guilds.get("892472046729179136"),
    });
});
router.get("/info/:Nick", async (req, res) => {
    const users = await main_1.default.db.users.findOne({ nick: req.params.Nick });
    if (!users)
        return res.send("Usuário não encontrado!");
    const logged = !!req.user;
    res.render("punicoes/userinfo.ejs", {
        dados: users,
        nick: req.params.Nick,
        n: 1,
        user: req.user,
        logged,
        username: req.user ? req.user.username : "",
        avatar: logged ? main_1.default.users.get(req.user.id).avatarURL() : "",
        member: main_1.default.guilds.get("892472046729179136").members.get(req.user.id),
        guild: main_1.default.guilds.get("892472046729179136"),
        highestRole: main_1.default.getHighestRole,
    });
});
exports.default = router;
