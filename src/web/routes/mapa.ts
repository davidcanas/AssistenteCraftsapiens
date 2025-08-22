import { Router } from "express";
import bodyParser from "body-parser";
import client from "../../main";

const router = Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());


router.get("/", async (req, res) => {

    res.render("mapa/city");
    
});

router.get("/iframe", async (req, res) => {

    if(req.query.cityName) {
        req.query.cityName = req.query.cityName.replace(/\s+/g, "_");
    } else {
        req.query.cityName = "spawn";
    }
    
    const cityName = req.query.cityName.replace(/\s+/g, "_");
    const cityInfo = await client.api.getTownInfo(cityName);
    console.log(cityInfo);

    res.render("mapa/iframe", { cityInfo, cityName });

});


export default router;