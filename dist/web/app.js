"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Strategy_1 = __importDefault(require("./lib/Strategy"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const main_1 = __importDefault(require("../main"));
const path_1 = __importDefault(require("path"));
const dash_1 = __importDefault(require("./routes/dash"));
const punicoes_1 = __importDefault(require("./routes/punicoes"));
const mapa_1 = __importDefault(require("./routes/mapa"));
const getDynmapInfo_1 = require("../utils/getDynmapInfo");
const isAdmin_1 = __importDefault(require("./helpers/isAdmin"));
const app = (0, express_1.default)();
const port = process.env.PORT;
app.use((0, express_session_1.default)({
    secret: process.env.SECRET_WORD,
    resave: false,
    saveUninitialized: false
}));
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "views"));
passport_1.default.serializeUser(function (user, done) {
    done(null, user);
});
passport_1.default.deserializeUser(function (obj, done) {
    done(null, obj);
});
const scopes = ["identify", "guilds"];
passport_1.default.use(new Strategy_1.default({
    clientID: "734297444744953907",
    clientSecret: process.env.SECRET,
    callbackURL: "http://" + process.env.LOCAL_IP + ":" + port + "/callback",
    scope: scopes
}, function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
        return done(null, profile);
    });
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/dash", dash_1.default);
app.use("/punicoes", punicoes_1.default);
app.use("/mapa", mapa_1.default);
app.get("/", isAdmin_1.default, (req, res) => {
    res.status(200).render("index", {
        user: req.user,
        member: main_1.default.guilds.get("892472046729179136").members.get(req.user.id),
        avatar: main_1.default.users.get(req.user.id).avatarURL(),
        guild: main_1.default.guilds.get("892472046729179136"),
        highestRole: main_1.default.getHighestRole,
    });
});
app.get("/api/isLogged", async (req, res) => {
    if (req.isAuthenticated()) {
        const db = await main_1.default.db.staff.findOne({ id: req.user.id });
        if (!db) {
            return res.status(401).send({ logged: true, isStaff: false });
        }
        res.status(200).send({ logged: true, isStaff: true, user: req.user.username, id: req.user.id, avatar: main_1.default.users.get(req.user.id).avatarURL(), nick: db.nick });
    }
    else {
        res.status(200).send({ logged: false });
    }
});
app.get("/stats/survival", async (req, res) => {
    const playerList = await (0, getDynmapInfo_1.getDynmapPlayersVanilla)();
    res.status(200).render("stats_survival", {
        user: req.user,
        member: main_1.default.guilds.get("892472046729179136").members.get(req.user?.id),
        avatar: main_1.default.users.get(req.user?.id)?.avatarURL(),
        guild: main_1.default.guilds.get("892472046729179136"),
        highestRole: main_1.default.getHighestRole,
        playerList,
    });
});
app.get("/stats/topcall", async (req, res) => {
    const db = main_1.default.db;
    const topUsers = await db.users.find({}).sort({ totalTimeInCall: -1 }).exec();
    res.render("topcall", {
        user: req.user,
        member: main_1.default.guilds.get("892472046729179136").members.get(req.user?.id),
        avatar: main_1.default.users.get(req.user?.id)?.avatarURL(),
        guild: main_1.default.guilds.get("892472046729179136"),
        highestRole: main_1.default.getHighestRole,
        topUsers
    });
});
app.get("/login", passport_1.default.authenticate("discord", { scope: scopes }), function () { });
app.get("/callback", passport_1.default.authenticate("discord", { failureRedirect: "/" }), function (req, res) { res.redirect("/"); });
app.get("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});
app.get("*", (req, res) => {
    res.status(404).render("errors/404", { user: req.user });
});
app.listen(port, () => {
    console.log(`\x1b[32m[CLIENT] Dashboard online em: http://${process.env.LOCAL_IP}:${port}`);
});
