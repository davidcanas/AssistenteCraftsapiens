/* Tickets ao vivo: lê o stream SSE e atualiza a lista e o detalhe sem recarregar.
 * Dados do evento entram só via textContent (nunca innerHTML). */
(function () {
	"use strict";
	if (typeof EventSource === "undefined") return;

	var conversa = document.getElementById("conversa");
	var linha = document.querySelector("tr[data-ticket-id]");
	var naLista = !!linha;
	var noDetalhe = !!conversa;
	if (!naLista && !noDetalhe) return;

	// Indicador fixo "ao vivo / reconectando".
	var indicador = document.createElement("div");
	indicador.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:1050;padding:4px 10px;border-radius:12px;background:#282a36;border:1px solid #44475a;font-size:.8rem;";
	document.body.appendChild(indicador);
	function setIndicador(vivo) {
		indicador.textContent = vivo ? "● ao vivo" : "● reconectando";
		indicador.style.color = vivo ? "#50fa7b" : "#ffb86c";
	}
	setIndicador(false);

	var novos = 0;
	var faixa = null;
	var faixaTexto = null;

	function mostrarFaixa() {
		novos += 1;
		if (!faixa) {
			faixa = document.createElement("div");
			faixa.className = "alert alert-info d-flex justify-content-between align-items-center";
			faixaTexto = document.createElement("span");
			var link = document.createElement("a");
			link.href = location.href;
			link.textContent = "Atualizar";
			faixa.appendChild(faixaTexto);
			faixa.appendChild(link);
			var container = document.querySelector(".container");
			if (container) container.insertBefore(faixa, container.firstChild);
			else document.body.insertBefore(faixa, document.body.firstChild);
		}
		faixaTexto.textContent = novos + (novos === 1 ? " ticket novo" : " tickets novos") + " · ";
	}

	function linhaDoTicket(id) {
		var linhas = document.querySelectorAll("tr[data-ticket-id]");
		for (var i = 0; i < linhas.length; i++) {
			if (linhas[i].getAttribute("data-ticket-id") === id) return linhas[i];
		}
		return null;
	}

	function celula(tr, col) {
		return tr.querySelector('[data-col="' + col + '"]');
	}

	function aoAssumir(e) {
		var tr = linhaDoTicket(e.ticketId);
		if (!tr) return;
		var td = celula(tr, "assumido");
		if (td) td.textContent = e.staffId;
	}

	function aoSuperiorAssumir(e) {
		var tr = linhaDoTicket(e.ticketId);
		if (!tr) return;
		var td = celula(tr, "superiores");
		if (!td) return;
		var ids = td.getAttribute("data-live-ids");
		var lista = ids ? ids.split(",") : [];
		if (lista.indexOf(e.staffId) === -1) lista.push(e.staffId);
		td.setAttribute("data-live-ids", lista.join(","));
		// Mostra os já renderizados + os novos (o nome aparece ao recarregar).
		var atuais = [];
		var links = td.querySelectorAll("a");
		for (var i = 0; i < links.length; i++) atuais.push(links[i].textContent);
		var extras = lista.filter(function (id) {
			return !td.querySelector('a[href$="/' + id + '"]');
		});
		td.textContent = atuais.concat(extras).join(", ");
	}

	function aoFechar(e) {
		if (naLista) {
			var tr = linhaDoTicket(e.ticketId);
			var td = tr && celula(tr, "status");
			var badge = td && td.querySelector(".badge");
			if (badge) {
				badge.textContent = "fechado";
				badge.className = "badge bg-secondary";
			}
		}
		if (noDetalhe && conversa.getAttribute("data-ticket-id") === e.ticketId) {
			var aviso = document.createElement("div");
			aviso.className = "alert alert-secondary mt-2";
			aviso.textContent = "Ticket fechado · recarregue para ver a transcrição final";
			conversa.appendChild(aviso);
		}
	}

	function aoMensagem(e) {
		if (!noDetalhe || conversa.getAttribute("data-ticket-id") !== e.ticketId) return;

		var vazio = conversa.querySelector("p.text-secondary");
		if (vazio) vazio.remove();

		var msg = document.createElement("div");
		msg.className = "msg";

		var autor = document.createElement("strong");
		autor.className = e.autorId === conversa.getAttribute("data-jogador-id") ? "autor-jogador" : "autor-staff";
		autor.textContent = e.autorTag;
		msg.appendChild(autor);

		var quando = document.createElement("span");
		quando.className = "msg-quando ms-2";
		var data = new Date(e.em);
		quando.textContent = isNaN(data.getTime()) ? "" : data.toLocaleString("pt-BR");
		msg.appendChild(quando);

		if (e.conteudo) {
			var texto = document.createElement("div");
			texto.className = "msg-conteudo";
			texto.textContent = e.conteudo;
			msg.appendChild(texto);
		}

		(e.anexos || []).forEach(function (nome) {
			var d = document.createElement("div");
			d.className = "text-secondary";
			d.textContent = "📎 " + nome;
			msg.appendChild(d);
		});

		conversa.appendChild(msg);
	}

	var fonte = new EventSource("/tickets/stream");
	fonte.onopen = function () { setIndicador(true); };
	fonte.onerror = function () { setIndicador(false); };
	fonte.onmessage = function (ev) {
		var e;
		try { e = JSON.parse(ev.data); } catch (_) { return; }
		if (!e || typeof e.tipo !== "string") return;

		switch (e.tipo) {
			case "aberto":
				if (naLista) mostrarFaixa();
				break;
			case "assumido":
				if (naLista) aoAssumir(e);
				break;
			case "superior-assumiu":
				if (naLista) aoSuperiorAssumir(e);
				break;
			case "fechado":
				aoFechar(e);
				break;
			case "mensagem":
				aoMensagem(e);
				break;
		}
	};
})();
