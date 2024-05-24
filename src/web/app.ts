import express from 'express';
import Strategy from './lib/Strategy';
import session from 'express-session';
import passport from 'passport';
import client from '../main';
import isLogged from './helpers/isLogged';
import path from 'path';
import dash from './routes/dash';
import punicoes from './routes/punicoes';
import { getDynmapPlayersVanilla } from '../utils/getDynmapInfo';

const app = express();
const port = 3200;


app.use(session({
    secret: process.env.SECRET_WORD,
    resave: false,
    saveUninitialized: false
  }));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });
  const scopes = ['identify', 'guilds'];
  passport.use(new Strategy({
    clientID: '734297444744953907',
    clientSecret: process.env.SECRET,
    callbackURL: 'http://' + process.env.LOCAL_IP + ':' + port + '/callback',

    scope: scopes
  }, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      return done(null, profile);
    });
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
// eslint-disable-next-line @typescript-eslint/no-var-requires
app.use('/dash', dash);
app.use('/punicoes', punicoes);

app.get('/', isLogged, (req, res) => {
	res.status(200).render('index', { 
    user: req.user,
    member: client.guilds.get('892472046729179136').members.get(req.user.id),
    avatar: client.users.get(req.user.id).avatarURL(),
    guild: client.guilds.get('892472046729179136'),
    highestRole: client.getHighestRole,
    
    });
});


app.get('/stats/survival', isLogged, async (req, res) => {
  
  const playerList = await getDynmapPlayersVanilla(client);

	res.status(200).render('stats_survival', { 
    user: req.user,
    member: client.guilds.get('892472046729179136').members.get(req.user.id),
    avatar: client.users.get(req.user.id).avatarURL(),
    guild: client.guilds.get('892472046729179136'),
    highestRole: client.getHighestRole,
    playerList,
    getPlayerInfo: await client.getPlayerInfo
    
    });
});
app.get('/login', passport.authenticate('discord', { scope: scopes }), function() { });
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.redirect('/'); });

app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.get('*', (req, res) => {
    res.status(404).render('errors/404');
});

app.listen(port, () => {
    console.log(`=> Dashboard online em: http://${process.env.LOCAL_IP}:${port}`);
});