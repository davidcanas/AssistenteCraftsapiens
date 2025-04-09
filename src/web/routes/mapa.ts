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

    res.render("mapa/iframe");
});


export default router;