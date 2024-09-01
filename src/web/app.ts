import express from "express";
import Strategy from "./lib/Strategy";
import session from "express-session";
import passport from "passport";
import client from "../main";
import isLogged from "./helpers/isLogged";
import path from "path";
import dash from "./routes/dash";
import punicoes from "./routes/punicoes";
import mapa from "./routes/mapa";
import { getDynmapPlayersVanilla } from "../utils/getDynmapInfo";
import isAdmin from "./helpers/isAdmin";

const app = express();
const port = process.env.PORT;


app.use(session({
    secret: process.env.SECRET_WORD,
    resave: false,
    saveUninitialized: false
  }));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });
  const scopes = ["identify", "guilds"];
  passport.use(new Strategy({
    clientID: "734297444744953907",
    clientSecret: process.env.SECRET,
    callbackURL: "http://" + process.env.LOCAL_IP + ":" + port + "/callback",

    scope: scopes
  }, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      return done(null, profile);
    });
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/dash", dash);
  app.use("/punicoes", punicoes);
  app.use("/mapa", mapa);

app.get("/", isAdmin, (req, res) => {
	res.status(200).render("index", { 
    user: req.user,
    member: client.guilds.get("892472046729179136").members.get(req.user.id),
    avatar: client.users.get(req.user.id).avatarURL(),
    guild: client.guilds.get("892472046729179136"),
    highestRole: client.getHighestRole,
    
    });
});

app.get("/api/isLogged", async (req, res) => {
  if(req.isAuthenticated()) {
    const db = await client.db.staff.findOne({ id: req.user.id });
    if (!db) {
      return res.status(401).send({ logged: true, isStaff: false});
    }

    res.status(200).send({ logged: true, isStaff: true, user: req.user.username, id: req.user.id, avatar: client.users.get(req.user.id).avatarURL(), nick: db.nick});
  } else {
    res.status(200).send({ logged: false });
  }
});

app.get("/stats/survival", async (req, res) => {
  
  const playerList = await getDynmapPlayersVanilla();

	res.status(200).render("stats_survival", { 
    user: req.user,
    member: client.guilds.get("892472046729179136").members.get(req.user?.id),
    avatar: client.users.get(req.user?.id)?.avatarURL(),
    guild: client.guilds.get("892472046729179136"),
    highestRole: client.getHighestRole,
    playerList,
    
    });
});

app.get("/stats/topcall", async (req, res) => {
  const db = client.db;
  const topUsers = await db.users.find({}).sort({ totalTimeInCall: -1 }).exec();
  res.render("topcall", { 
    user: req.user,
    member: client.guilds.get("892472046729179136").members.get(req.user?.id),
    avatar: client.users.get(req.user?.id)?.avatarURL(),
    guild: client.guilds.get("892472046729179136"),
    highestRole: client.getHighestRole,
    topUsers 
  });
});

app.get("/login", passport.authenticate("discord", { scope: scopes }), function() { });
app.get("/callback", passport.authenticate("discord", { failureRedirect: "/" }), function(req, res) { res.redirect("/"); });

app.get("/logout", function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect("/");
  });
});


app.get("*", (req, res) => {
    res.status(404).render("errors/404", {user: req.user});
});

app.listen(port, () => {
    console.log(`\x1b[32m[CLIENT] Dashboard online em: http://${process.env.LOCAL_IP}:${port}`);
});