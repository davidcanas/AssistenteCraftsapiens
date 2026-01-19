import { Router } from "express";
import bodyParser from "body-parser";
import client from "../../main";
import isLogged from "../helpers/isLogged";
import isAdmin from "../helpers/isAdmin";

const router = Router();

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(isLogged);
router.use(isAdmin);

router.get("/", async (req, res) => {
  // Use projection to only fetch needed fields
  const users = await client.db.users.find({}, { id: 1, nick: 1, punicoes: 1 });
  const user = req.user;
  const member = client.guilds.get("892472046729179136").members.get(user.id);
  res.render("punicoes/listar", {
    dados: users,
    user,
    logged: !!user,
    username: user ? user.username : "",
    avatar: user ? client.users.get(user.id).avatarURL() : "",
    member,
    highestRole: client.getHighestRole,
    guild: client.guilds.get("892472046729179136"),
  });
});

router.get("/punir", (req, res) => {
  const user = req.user;
  const member = client.guilds.get("892472046729179136").members.get(user.id);
  res.render("punicoes/punir", {
    user,
    member,
    logged: !!user,
    username: user ? user.username : "",
    avatar: user ? client.users.get(user.id).avatarURL() : "",
    highestRole: client.getHighestRole,
    guild: client.guilds.get("892472046729179136"),
  });
});

router.get("/delete/:ID", async (req, res) => {

  const users = await client.db.users.findOne({ nick: req.params.ID.split("_")[0]});

  if (!users) return res.send("Usuário não encontrado!");
  
  // @ts-expect-error - punicao.id is not explicit in the type
  users.punicoes = users.punicoes.filter((punicao) => punicao.id !== req.params.ID);


  await users.save();

 res.redirect(`/punicoes/info/${users.nick}`);
}
);

router.post("/punir", async (req, res) => {

  const { nick, motivo, tipo, duracao, punido_por } = req.body;

  const member = client.guilds.get("892472046729179136").members.get(req.user.id);

  if (!nick || !motivo || !tipo || !punido_por || !duracao) return res.send("Preencha todos os campos!");
  const user = client.db.users;
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
  } else {
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
    avatar: logged ? client.users.get(req.user.id).avatarURL() : "",
    highestRole: client.getHighestRole,
    guild: client.guilds.get("892472046729179136"),
  });
});

router.get("/info/:Nick", async (req, res) => {
  const users = await client.db.users.findOne({ nick: req.params.Nick });
  if (!users) return res.send("Usuário não encontrado!");
  const logged = !!req.user;
  res.render("punicoes/userinfo.ejs", {
    dados: users,
    nick: req.params.Nick,
    n: 1,
    user: req.user,
    logged,
    username: req.user ? req.user.username : "",
    avatar: logged ? client.users.get(req.user.id).avatarURL() : "",
    member: client.guilds.get("892472046729179136").members.get(req.user.id),
    guild: client.guilds.get("892472046729179136"),
    highestRole: client.getHighestRole,
  });
});

export default router;
