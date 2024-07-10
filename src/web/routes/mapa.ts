import { Router } from 'express';
import bodyParser from 'body-parser';
import client from '../../main';

const router = Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());


router.get('/', async (req, res) => {

    res.render('mapa/city');
    
});

router.get('/iframe', async (req, res) => {
    const serverData = await client.fetch('http://172.210.83.141:3005/').then(res => res.json());

    const cityName = req.query.cityName.replace(/\s+/g, '_');

    const cityInfo = await client.utils.dynmap.findCityInfo(serverData, cityName);

    res.render('mapa/iframe', { cityInfo, cityName });
});


export default router;