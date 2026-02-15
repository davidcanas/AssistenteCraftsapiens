import express from "express";
import Strategy from "./lib/Strategy";
import session from "express-session";
import passport from "passport";
import client from "../main";
import path from "path";
import dash from "./routes/dash";
import punicoes from "./routes/punicoes";
import mapa from "./routes/mapa";
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
  
  const response = await client.api.getPlayerList();
  const rawPlayers = response.data.players || [];

  const HIERARCHY = ["reitor", "dev", "admin", "professor", "moderador", "ajuda", "premium", "vip", "default"];

  const processedList = rawPlayers
    .filter(p => p.status.online) // Só quem está online
    .map(player => {
        const discordMember = client.getDiscordByNick(player.username);
        
        let discordData = null;
        if (discordMember) {
            discordData = {
                tag: discordMember.displayName || discordMember.user.username,
                avatar: discordMember.avatarURL()
            };
        }

        return {
            ...player, 
            discord: discordData, 
            sortGroup: (player.group || "default").toLowerCase() 
        };
    })
    .sort((a, b) => {
        let rankA = HIERARCHY.indexOf(a.sortGroup);
        let rankB = HIERARCHY.indexOf(b.sortGroup);

        if (rankA === -1) rankA = 99;
        if (rankB === -1) rankB = 99;
        
        return rankA - rankB;
    });

  // 4. Renderiza enviando a lista JÁ PRONTA
  res.status(200).render("stats_survival", { 
    user: req.user,
    member: client.guilds.get("892472046729179136")?.members.get(req.user?.id), 
    avatar: client.users.get(req.user?.id)?.avatarURL(),
    guild: client.guilds.get("892472046729179136"),
    highestRole: client.getHighestRole,
    playerList: processedList
  });
});

const CONSTANTS = {
    GROUP_COLORS: {
        reitor: "#008B8B", dev: "#00BFFF", admin: "#8B0000", professor: "#00FF7F",
        moderador: "#FF4500", ajuda: "#9370DB", premium: "#228B22", vip: "#FFD700",
        default: "#AAAAAA"
    },
    ACCENT_COLOR: "#7289DA",
    ICONS: {
        money: "https://cdn-icons-png.flaticon.com/512/10384/10384161.png",
        kills: "https://cdn-icons-png.flaticon.com/256/2736/2736398.png",
        deaths: "https://cdn-icons-png.flaticon.com/512/521/521269.png",
        town: "https://cdn-icons-png.freepik.com/256/2942/2942149.png",
        nation: "https://cdn-icons-png.flaticon.com/512/6313/6313937.png",
        friends: "https://cdn-icons-png.flaticon.com/512/880/880594.png"
    }
};

// Função auxiliar para formatar números (1k, 1M, etc)
function formatNumber(num) {
    if (!num) return "0";
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
}
// Rota 1: Página de pesquisa (sem nick)
app.get("/player", (req, res) => {
    res.render("playerinfo", {
        user: req.user,
        avatar: client.users.get(req.user?.id)?.avatarURL(),
        highestRole: client.getHighestRole,
        playerData: null, // Sem dados
        guild: client.guilds.get("892472046729179136"),
        member: client.guilds.get("892472046729179136").members.get(req.user?.id),
        targetName: "",
        error: null,
        icons: CONSTANTS.ICONS
    });
});

// Rota 2: Perfil do Jogador (/player/DG0837)
app.get("/player/:nick", async (req, res) => {
    // AQUI ESTÁ A MUDANÇA: req.params.nick em vez de req.query.player
    const targetName = req.params.nick; 
    
    let playerData = null;
    let error = null;

    try {
        const playerInfo = await client.api.getPlayerInfo(targetName);
        
        if (playerInfo && playerInfo.data) {
            const data = playerInfo.data;
            const username = data.username;
            const group = (data.group || "default").toLowerCase();
            
            // Lógica do Discord
            const discordMember = client.getDiscordByNick(username);
            let discordData = null;
            if (discordMember) {
                discordData = {
                    tag: discordMember.displayName || discordMember.user.username,
                    avatar: discordMember.avatarURL()
                };
            }

            playerData = {
                username: data.username,
                nickname: data.nickname || data.username,
                cleanNickname: (data.nickname || data.username).replace(/§[0-9A-FK-ORa-fk-or]/g, ""),
                groupDisplay: group !== "default" ? group.charAt(0).toUpperCase() + group.slice(1) : "",
                accentColor: CONSTANTS.GROUP_COLORS[group] || CONSTANTS.ACCENT_COLOR,
                isOnline: data.status?.online ?? false,
                stats: {
                    money: formatNumber(data.status?.money),
                    kills: formatNumber(data.status?.kills),
                    deaths: formatNumber(data.status?.deaths),
                    town: data.towny?.townName ? data.towny.townName.replace(/_/g, " ") : "N/A",
                    nation: data.towny?.nationName ? data.towny.nationName.replace(/_/g, " ") : "N/A"
                },
                friends: data.towny?.friends || [],
                discord: discordData,
                skinUrl: `https://mineskin.eu/armor/bust/${username}/180.png`
            };
        } else {
            error = `O jogador ${targetName} não foi encontrado.`;
        }
    } catch (err) {
        console.error(err);
        error = "Erro ao processar dados.";
    }

    res.render("playerinfo", {
        user: req.user,
        avatar: client.users.get(req.user?.id)?.avatarURL(),
        highestRole: client.getHighestRole,
        guild: client.guilds.get("892472046729179136"),
        member: client.guilds.get("892472046729179136").members.get(req.user?.id),
        playerData,
        targetName,
        error,
        icons: CONSTANTS.ICONS
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