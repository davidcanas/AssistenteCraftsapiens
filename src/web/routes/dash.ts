import { Router } from 'express';
import bodyParser from 'body-parser';
import client from '../../main';
import isLogged from '../helpers/isLogged';
import isAdmin from '../helpers/isAdmin';
const router = Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(isLogged);
router.use(isAdmin);

router.get('/', async (req, res) => {
  
    res.status(200).render('dash', { 
      user: req.user, 
      member: client.guilds.get('892472046729179136').members.get(req.user.id), 
      avatar: client.users.get(req.user.id).avatarURL(), 
      guild: client.guilds.get('892472046729179136'), 
      highestRole: client.getHighestRole,
      nFormatter: client.nFormatter, 
      db: await client.db.global.findOne({id: '892472046729179136'})
    });
  });

router.post('/classes', async (req, res) => {
    const db = await client.db.global.findOne({id: '892472046729179136'});
  
    if (!db) return res.send('Erro ao buscar o banco de dados');
    if (req.body.enableClasses == 'on') db.classes.enabled = false;
    else db.classes.enabled = true;
    db.classes.reason = req.body.txtBox;
    db.save();
    res.status(200).redirect('/dash');
    }
);

router.get('/url/remove/:url', async (req, res) => {
    const db = await client.db.global.findOne({id: '892472046729179136'});
    if (!db) return res.send('Erro ao buscar o banco de dados');
    if (!db.whitelistedUrl.includes(req.params.url)) return res.send('Esse domínio não está na whitelist');
    db.whitelistedUrl = db.whitelistedUrl.filter((d) => d !== req.params.url);
    db.save();
    res.status(200).redirect('/dash');
    }
);

router.post('/url/add', async (req, res) => {
    const db = await client.db.global.findOne({id: '892472046729179136'});
    if (!db) return res.send('Erro ao buscar o banco de dados');
    if(req.body.links == 'on') db.whitelistedUrlEnabled = true;
    else db.whitelistedUrlEnabled = false;
   
    if (req.body.url.length > 3) { 

      if (db.whitelistedUrl.includes(req.body.url)) {
        db.save();
        res.send('Esse domínio já está na whitelist');
        return;
      }

      db.whitelistedUrl.push(req.body.url);

    }

    db.save();
    res.status(200).redirect('/dash');
    }
);

export default router;