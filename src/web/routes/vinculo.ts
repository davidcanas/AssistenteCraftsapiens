import client from "../../main";
import { aplicarGrupos, criarCodigo, desvincular, statusVinculo } from "../../modules/vinculo";
import { criarRouter } from "../../modules/vinculo/rotas";

export default criarRouter({
	servico: { statusVinculo, criarCodigo, aplicarGrupos, desvincular },
	client: () => client,
	token: () => process.env.VINCULO_TOKEN,
});
