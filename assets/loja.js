/* Catálogo público (Harã ou Harã Mix, conforme <body data-loja>) */
(function () {
  const { $, esc, brl, norm } = H;
  const LOJA = document.body.dataset.loja;
  const CFG = LOJAS[LOJA];
  const CATS = ["Todos", ...CFG.cats];
  let P = [], cat = "Todos", shown = 40, last;

  function esqueleto() {
    $("grid").innerHTML = Array.from({ length: 6 }, () =>
      '<div class="card sk" aria-hidden="true"><div class="ph"></div><div class="body"><span class="sk-l"></span><span class="sk-l w"></span><span class="sk-l s"></span></div></div>').join("");
  }
  function aviso(titulo, texto) {
    $("grid").innerHTML = `<div class="empty"><strong>${esc(titulo)}</strong>${texto}</div>`;
    $("n").textContent = "0";
  }
  function marcas() {
    const sel = $("brand");
    [...new Set(P.map(p => p.b))].sort((a, b) => a.localeCompare(b, "pt")).forEach(b => {
      const o = document.createElement("option"); o.value = b;
      o.textContent = b + " (" + P.filter(p => p.b === b).length + ")"; sel.append(o);
    });
  }
  function chips() {
    $("chips").innerHTML = CATS.map(c => {
      const n = c === "Todos" ? P.length : P.filter(p => p.c === c).length;
      return `<button class="chip" data-c="${c}" aria-pressed="${c === cat}">${c} <small style="opacity:.7">${n}</small></button>`;
    }).join("");
  }
  $("chips").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.c; shown = 40;
    $("chips").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
    render();
  };

  function render() {
    const q = norm($("q").value.trim()), br = $("brand").value, s = $("sort").value;
    let L = P.map((p, i) => ({ ...p, idx: i })).filter(p =>
      (cat === "Todos" || p.c === cat) && (!br || p.b === br) && (!q || norm(p.n + " " + p.b).includes(q)));
    L.sort((a, b) => s === "feat" ? ((!!b.i - !!a.i) || (!!b.p - !!a.p) || a.n.localeCompare(b.n, "pt"))
      : s === "az" ? a.n.localeCompare(b.n, "pt")
      : s === "lo" ? ((a.p || 1e9) - (b.p || 1e9)) : (b.p - a.p));
    $("n").textContent = L.length;
    const pr = L.filter(p => p.p).map(p => p.p);
    $("range").textContent = pr.length ? brl(Math.min(...pr)) + " – " + brl(Math.max(...pr)) : "";
    const total = L.length; L = L.slice(0, shown);
    $("grid").innerHTML = L.length ? L.map(p => `
      <button class="card" data-i="${p.idx}" aria-label="${esc(p.n)}">
        <div class="ph">${H.img(p)}${p.g ? `<span class="tag">${esc(p.g)}</span>` : p.c !== "Perfumes" ? `<span class="tag">${esc(p.c)}</span>` : ""}</div>
        <div class="body"><span class="brand">${esc(p.b)}</span><span class="name">${esc(p.n)}</span><span class="size">${esc(p.s)}</span>
          <div class="foot"><span class="price${p.p ? "" : " ask"}">${p.p ? brl(p.p) : "Sob consulta"}</span><span class="buy">${H.WA}</span></div></div>
      </button>`).join("")
      : `<div class="empty"><strong>Nenhum produto encontrado</strong>Tente outra busca ou limpe os filtros.</div>`;
    $("more").hidden = total <= shown;
    $("more").textContent = `Ver mais ${Math.min(40, total - shown)} de ${total - shown} restantes`;
  }
  $("grid").onclick = e => { const c = e.target.closest(".card[data-i]"); if (c) abrir(P[+c.dataset.i]); };
  ["q", "brand", "sort"].forEach(id => $(id).addEventListener("input", () => { shown = 40; render(); }));
  $("more").onclick = () => { shown += 40; render(); };

  function abrir(p) {
    last = document.activeElement;
    $("s-ph").innerHTML = H.img(p, true);
    $("s-brand").textContent = p.b; $("s-name").textContent = p.n;
    $("s-meta").innerHTML = [p.c, p.g, p.s].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join("");
    $("s-price").textContent = p.p ? brl(p.p) : "Preço sob consulta"; $("s-price").className = "price" + (p.p ? "" : " ask");
    $("s-desc").textContent = p.d || "Fale com uma de nossas consultoras para saber mais sobre as notas, a fixação e a disponibilidade deste produto.";
    $("s-sellers").innerHTML = (CONFIG.vendedoras || []).map(v => {
      const msg = `Olá, ${v.nome}! Vi no ${CFG.msg} e tenho interesse no ${p.n}${p.b && p.b !== "Outras marcas" ? " (" + p.b + ")" : ""}${p.s ? " " + p.s : ""}${p.p ? " — " + brl(p.p) : ""} [cód. ${p.sku}]. Está disponível?`;
      return `<a class="seller" href="https://wa.me/${v.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><span class="mono">${esc(v.nome[0])}</span><span class="who"><b>${esc(v.nome)}</b><small>${esc(v.exibicao)}</small></span>${H.WA}</a>`;
    }).join("");
    $("sheet").hidden = false; document.body.style.overflow = "hidden";
    $("sheet").querySelector(".close").focus();
  }
  function fechar() { $("sheet").hidden = true; document.body.style.overflow = ""; last && last.focus(); }
  $("sheet").onclick = e => { if (e.target.closest("[data-close]")) fechar(); };
  addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) fechar(); });

  async function iniciar() {
    $("sort").value = "feat"; chips(); esqueleto();
    const sb = H.cliente();
    if (!sb) {
      aviso("Catálogo ainda não configurado", "Preencha o arquivo <code>assets/config.js</code> com os dados do Supabase (veja o README).");
      return;
    }
    try {
      P = await H.produtos(sb, LOJA, true);
      marcas(); chips(); render();
    } catch (e) {
      console.error(e);
      aviso("Não foi possível carregar o catálogo", "Verifique sua internet e tente de novo. Se preferir, chame uma consultora no WhatsApp: " +
        (CONFIG.vendedoras || []).map(v => `<a href="https://wa.me/${v.whatsapp}" target="_blank" rel="noopener">${esc(v.nome)}</a>`).join(", ") + ".");
    }
  }
  iniciar();
})();
