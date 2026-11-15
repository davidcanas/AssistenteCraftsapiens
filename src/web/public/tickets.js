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

	function nomeDe(nome, id) {
		return nome || id;
	}

	// Acrescenta o superior ao fim do campo (sem apagar o que veio renderizado), sem repetir ids.
	function acrescentarSuperior(el, e) {
		var ids = (el.getAttribute("data-live-ids") || "").split(",").filter(Boolean);
		var links = el.querySelectorAll("a");
		for (var i = 0; i < links.length; i++) {
			var m = /\/(\d+)$/.exec(links[i].getAttribute("href") || "");
			if (m && ids.indexOf(m[1]) === -1) ids.push(m[1]);
		}
		if (ids.indexOf(e.staffId) !== -1) return;
		ids.push(e.staffId);
		el.setAttribute("data-live-ids", ids.join(","));
		var vazio = ids.length === 1 && links.length === 0;
		if (vazio) el.textContent = "";
		var nome = nomeDe(e.staffNome, e.staffId);
		el.appendChild(document.createTextNode((el.textContent.trim() ? ", " : "") + nome));
	}

	function doDetalhe(e) {
		return noDetalhe && conversa.getAttribute("data-ticket-id") === e.ticketId;
	}

	function aoAssumir(e) {
		if (naLista) {
			var tr = linhaDoTicket(e.ticketId);
			var td = tr && celula(tr, "assumido");
			if (td) td.textContent = nomeDe(e.staffNome, e.staffId);
		}
		if (doDetalhe(e)) {
			var campo = document.querySelector("[data-ticket-assumido]");
			if (campo) campo.textContent = nomeDe(e.staffNome, e.staffId);
		}
	}

	function aoSuperiorAssumir(e) {
		if (naLista) {
			var tr = linhaDoTicket(e.ticketId);
			var td = tr && celula(tr, "superiores");
			if (td) acrescentarSuperior(td, e);
		}
		if (doDetalhe(e)) {
			var campo = document.querySelector("[data-ticket-superiores]");
			if (campo) acrescentarSuperior(campo, e);
		}
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
		if (doDetalhe(e)) {
			var status = document.querySelector("[data-ticket-status]");
			if (status) {
				status.textContent = "Fechado";
				status.className = "badge bg-secondary ms-2";
			}
			var aviso = document.createElement("div");
			aviso.className = "alert alert-secondary mt-2";
			aviso.textContent = "Ticket fechado · recarregue em alguns segundos para ver a transcrição final";
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
	fonte.onerror = function () {
		if (fonte.readyState === EventSource.CLOSED) {
			indicador.textContent = "● desconectado · recarregue a página";
			indicador.style.color = "#ff5555";
			return;
		}
		setIndicador(false);
	};
	fonte.onmessage = function (ev) {
		var e;
		try { e = JSON.parse(ev.data); } catch (_) { return; }
		if (!e || typeof e.tipo !== "string") return;

		switch (e.tipo) {
			case "aberto":
				if (naLista) mostrarFaixa();
				break;
			case "assumido":
				aoAssumir(e);
				break;
			case "superior-assumiu":
				aoSuperiorAssumir(e);
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
