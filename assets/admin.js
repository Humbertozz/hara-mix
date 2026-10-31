/* Painel da equipe: login, edição de produtos, fotos e gestão da equipe */
(function () {
  const { $, esc, brl, norm, toast } = H;
  const sb = H.cliente();
  const NOME_LOJA = { hara: "Harã", mix: "Harã Mix" };
  let ME = null, P = [], LOJA = null, aba = null, filtro = "sem", mostrar = 60, recovering = false;

  const show = v => ["v-wait", "v-login", "v-msg", "v-app"].forEach(id => ($(id).hidden = id !== v));
  const err = (id, m) => { const e = $(id); e.textContent = m || ""; e.hidden = !m; };
  function busy(btn, on, txt) {
    if (on) { btn.dataset.txt = btn.textContent; btn.textContent = txt || "Aguarde…"; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; }
  }
  const traduz = e => {
    const m = (e && (e.message || e.error_description)) || String(e || "");
    if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(m)) return "Este e-mail ainda não foi confirmado. Veja a caixa de entrada (e o spam).";
    if (/rate limit|too many/i.test(m)) return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    if (/password should be at least|weak password/i.test(m)) return "Senha fraca. Use pelo menos 8 caracteres.";
    if (/same password|should be different/i.test(m)) return "A senha nova precisa ser diferente da atual.";
    if (/failed to fetch|network/i.test(m)) return "Sem conexão com o servidor. Verifique sua internet.";
    if (/row-level security|permission denied|violates/i.test(m)) return "Você não tem permissão para fazer isso.";
    if (/duplicate key/i.test(m)) return "Já existe um produto com esse código.";
    return m || "Algo deu errado. Tente de novo.";
  };
  function mensagem(t, p, sair) { $("msg-t").textContent = t; $("msg-p").innerHTML = p; $("msg-sair").hidden = !sair; show("v-msg"); }

  /* ================= LOGIN ================= */
  document.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => {
    const i = $(b.dataset.eye); const vis = i.type === "password"; i.type = vis ? "text" : "password"; b.textContent = vis ? "Ocultar" : "Ver";
  });
  function formLogin(qual) {
    ["f-login", "f-reset", "f-nova"].forEach(id => ($(id).hidden = id !== qual));
    show("v-login"); const f = $(qual).querySelector("input"); f && f.focus();
  }
  $("lg-esqueci").onclick = () => { $("rs-email").value = $("lg-email").value; err("rs-err"); $("rs-ok").hidden = true; formLogin("f-reset"); };
  $("rs-voltar").onclick = () => formLogin("f-login");

  $("f-login").onsubmit = async e => {
    e.preventDefault(); err("lg-err");
    const email = $("lg-email").value.trim(), senha = $("lg-senha").value;
    if (!email || !senha) return err("lg-err", "Preencha e-mail e senha.");
    busy($("lg-btn"), true, "Entrando…");
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    busy($("lg-btn"), false);
    if (error) return err("lg-err", traduz(error));
    $("lg-senha").value = "";
    entrar(data.user);
  };
  $("f-reset").onsubmit = async e => {
    e.preventDefault(); err("rs-err"); $("rs-ok").hidden = true;
    const email = $("rs-email").value.trim();
    if (!email) return err("rs-err", "Digite seu e-mail.");
    busy($("rs-btn"), true, "Enviando…");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    busy($("rs-btn"), false);
    if (error) return err("rs-err", traduz(error));
    $("rs-ok").textContent = "Se este e-mail tiver acesso, o link chega em alguns minutos. Confira também o spam.";
    $("rs-ok").hidden = false;
  };
  $("f-nova").onsubmit = async e => {
    e.preventDefault(); err("nv-err");
    const a = $("nv-senha").value, b = $("nv-senha2").value;
    if (a.length < 8) return err("nv-err", "Use pelo menos 8 caracteres.");
    if (a !== b) return err("nv-err", "As duas senhas não são iguais.");
    busy($("nv-btn"), true, "Salvando…");
    const { data, error } = await sb.auth.updateUser({ password: a });
    busy($("nv-btn"), false);
    if (error) return err("nv-err", traduz(error));
    recovering = false; history.replaceState(null, "", location.pathname);
    toast("Senha nova salva.", true); entrar(data.user);
  };
  async function sair() { await sb.auth.signOut(); ME = null; P = []; formLogin("f-login"); }
  $("btn-sair").onclick = sair; $("msg-sair").onclick = sair;

  /* trocar senha logado */
  $("btn-senha").onclick = () => { $("pw-1").value = $("pw-2").value = ""; err("pw-err"); abrirSheet("pw"); $("pw-1").focus(); };
  $("f-pw").onsubmit = async e => {
    e.preventDefault(); err("pw-err");
    const a = $("pw-1").value, b = $("pw-2").value;
    if (a.length < 8) return err("pw-err", "Use pelo menos 8 caracteres.");
    if (a !== b) return err("pw-err", "As duas senhas não são iguais.");
    busy($("pw-btn"), true, "Salvando…");
    const { error } = await sb.auth.updateUser({ password: a });
    busy($("pw-btn"), false);
    if (error) return err("pw-err", traduz(error));
    fecharSheet("pw"); toast("Senha trocada.", true);
  };

  /* ================= ENTRAR ================= */
  async function entrar(user) {
    show("v-wait");
    const { data, error } = await sb.from("catalogo_equipe").select("*").eq("user_id", user.id).maybeSingle();
    if (error) return mensagem("Não foi possível abrir o painel", esc(traduz(error)), true);
    if (!data || !data.ativo) {
      return mensagem("Sua conta ainda não tem acesso",
        `Você entrou como <b>${esc(user.email)}</b>, mas este login não está liberado para editar os catálogos. Peça ao responsável para liberar seu acesso.`, true);
    }
    ME = data;
    $("who-nome").textContent = "Olá, " + (ME.nome || ME.email.split("@")[0]);
    $("who-papel").textContent = ME.papel === "dono" ? "Dono · acesso total" : "Equipe · " + ME.lojas.map(l => NOME_LOJA[l]).join(" e ");
    let lojas = ME.papel === "dono" ? ["hara", "mix"] : ME.lojas.filter(l => NOME_LOJA[l]);
    if (CONFIG.loja) lojas = lojas.filter(l => l === CONFIG.loja);
    if (!lojas.length) return mensagem("Sem acesso a este catálogo",
      `Seu login (<b>${esc(user.email)}</b>) não está liberado para editar o catálogo ${esc(NOME_LOJA[CONFIG.loja] || "")}. Peça ao responsável.`, true);
    const abas = lojas.map(l => [l, lojas.length === 1 ? "Produtos" : "Catálogo " + NOME_LOJA[l]]);
    if (ME.papel === "dono") abas.push(["equipe", "Equipe"]);
    $("tabs").innerHTML = abas.map(([k, t]) => `<button class="tab" data-tab="${k}" aria-pressed="false">${esc(t)}</button>`).join("");
    show("v-app");
    let pref = null; try { pref = localStorage.getItem("hara-aba"); } catch (e) {}
    abrirAba(abas.some(a => a[0] === pref) ? pref : abas[0][0]);
  }
  $("tabs").onclick = e => { const b = e.target.closest(".tab"); if (b) abrirAba(b.dataset.tab); };
  function abrirAba(k) {
    aba = k; try { localStorage.setItem("hara-aba", k); } catch (e) {}
    $("tabs").querySelectorAll(".tab").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === k));
    $("t-equipe").hidden = k !== "equipe"; $("t-loja").hidden = k === "equipe";
    if (k === "equipe") carregarEquipe(); else carregarLoja(k);
  }

  /* ================= PRODUTOS ================= */
  async function carregarLoja(loja) {
    LOJA = loja; P = []; filtro = "sem"; mostrar = 60; $("pn-q").value = "";
    $("pn-view").href = CONFIG.catalogoUrl || ("../" + loja + "/");
    $("pn-list").innerHTML = '<li class="empty"><strong>Carregando produtos…</strong></li>'; pnChips();
    try { P = await H.produtos(sb, loja, false); }
    catch (e) { $("pn-list").innerHTML = `<li class="empty"><strong>Não foi possível carregar</strong>${esc(traduz(e))}</li>`; return; }
    if (LOJA !== loja) return;
    if (!P.some(p => !p.i)) filtro = "todos";
    pnChips(); pnRender();
  }
  function pnChips() {
    const done = P.filter(p => p.i).length;
    $("pn-done").textContent = done; $("pn-total").textContent = P.length;
    $("pn-fill").style.width = (P.length ? done / P.length * 100 : 0).toFixed(1) + "%";
    const F = [["sem", "Sem foto", P.length - done], ["com", "Com foto", done], ["oculto", "Ocultos", P.filter(p => p.h).length],
               ["preco", "Sem preço", P.filter(p => !p.p).length], ["esgotado", "Esgotados", P.filter(p => !p.e).length], ["todos", "Todos", P.length]];
    $("pn-chips").innerHTML = F.map(([k, l, n]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filtro}">${l} <small style="opacity:.7">${n}</small></button>`).join("");
  }
  $("pn-chips").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; filtro = b.dataset.f; mostrar = 60; pnChips(); pnRender(); };
  $("pn-q").addEventListener("input", () => { mostrar = 60; pnRender(); });
  $("pn-more").onclick = () => { mostrar += 60; pnRender(); };
  function pnRender() {
    const q = norm($("pn-q").value.trim());
    let L = P.filter(p => (filtro === "todos" || (filtro === "sem" && !p.i) || (filtro === "com" && p.i) || (filtro === "oculto" && p.h) || (filtro === "preco" && !p.p) || (filtro === "esgotado" && !p.e))
      && (!q || norm(p.n + " " + p.b + " " + p.sku).includes(q)));
    L.sort((a, b) => a.b.localeCompare(b.b, "pt") || a.n.localeCompare(b.n, "pt"));
    const total = L.length; L = L.slice(0, mostrar);
    $("pn-list").innerHTML = L.length ? L.map(p => `
      <li class="pn-item${p.h ? " is-off" : ""}">
        <div class="pn-thumb ph">${H.img(p)}</div>
        <div class="pn-info"><span class="brand">${esc(p.b)}</span><b>${esc(p.n)}</b>
          <small>${esc([p.s, p.p ? brl(p.p) : "Sob consulta", "cód. " + p.sku].filter(Boolean).join(" · "))}</small>
          <div class="pills">${p.i ? '<span class="pill ok">Com foto</span>' : '<span class="pill">Sem foto</span>'}${p.h ? '<span class="pill off">Oculto</span>' : ""}</div></div>
        <div class="pn-acts">
          <button class="stk ${p.e ? "on" : "off"}" data-stk="${esc(p.sku)}" aria-pressed="${p.e}" title="Tocar para trocar">${p.e ? "● Em estoque" : "○ Esgotado"}</button>
          <button class="ed-btn" data-ed="${esc(p.sku)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg><span>Editar</span></button>
          <button class="upl" data-up="${esc(p.sku)}">${H.CAM}<span>${p.i ? "Trocar foto" : "Enviar foto"}</span></button>
        </div>
      </li>`).join("")
      : `<li class="empty"><strong>${filtro === "sem" && !q ? "Todos os produtos já têm foto" : "Nada por aqui"}</strong>${filtro === "sem" && !q ? "Ótimo trabalho." : "Tente outra busca ou outro filtro."}</li>`;
    $("pn-more").hidden = total <= mostrar;
    $("pn-more").textContent = `Ver mais ${Math.min(60, total - mostrar)} de ${total - mostrar} restantes`;
  }
  $("pn-list").onclick = e => {
    const ed = e.target.closest("[data-ed]"); if (ed) return abrirEd(ed.dataset.ed);
    const up = e.target.closest("[data-up]"); if (up) return escolherFoto(up.dataset.up);
    const st = e.target.closest("[data-stk]"); if (st) return trocarEstoque(st);
  };
  async function trocarEstoque(btn) {
    const p = acha(btn.dataset.stk); if (!p || btn.disabled) return;
    const novo = !p.e; btn.disabled = true; btn.textContent = "Salvando…";
    const { data, error } = await sb.from("catalogo_produtos").update({ em_estoque: novo }).eq("loja", LOJA).eq("sku", p.sku).select().single();
    btn.disabled = false;
    if (error) { toast(traduz(error)); pnRender(); return; }
    atualizar(H.doBanco(data));
    toast(novo ? `${p.n}: em estoque.` : `${p.n}: marcado como esgotado.`, true);
  }
  const acha = sku => P.find(p => p.sku === sku);
  function atualizar(rec) { const i = P.findIndex(p => p.sku === rec.sku); if (i < 0) P.push(rec); else P[i] = rec; pnChips(); pnRender(); }

  /* ---- sheets ---- */
  const abertos = [];
  function abrirSheet(id) { $(id).hidden = false; abertos.push(id); document.body.style.overflow = "hidden"; }
  function fecharSheet(id) { $(id).hidden = true; const i = abertos.indexOf(id); if (i >= 0) abertos.splice(i, 1); if (!abertos.length) document.body.style.overflow = ""; }
  $("ed").addEventListener("click", e => { if (e.target.closest("[data-edclose]")) fecharSheet("ed"); });
  $("pw").addEventListener("click", e => { if (e.target.closest("[data-pwclose]")) fecharSheet("pw"); });
  $("crop").addEventListener("click", e => { if (e.target.closest("[data-crclose]")) fecharSheet("crop"); });
  addEventListener("keydown", e => { if (e.key === "Escape" && abertos.length) fecharSheet(abertos[abertos.length - 1]); });

  /* ---- editar ---- */
  let edSku = null, delArmado = false;
  function edFoto() {
    const p = acha(edSku); if (!p) return;
    $("ed-ph").innerHTML = H.img(p, true);
    $("ed-up").lastChild.textContent = p.i ? "Trocar foto" : "Enviar foto"; $("ed-rm").hidden = !p.i;
  }
  function abrirEd(sku) {
    const novo = !sku;
    const p = novo ? { n: "", b: "", s: "", c: LOJAS[LOJA].cats[0], g: "", p: 0, d: "", h: false, e: true, sku: "" } : acha(sku);
    edSku = novo ? null : sku;
    $("ed-c").innerHTML = LOJAS[LOJA].cats.map(c => `<option>${esc(c)}</option>`).join("");
    if (!LOJAS[LOJA].cats.includes(p.c)) $("ed-c").insertAdjacentHTML("beforeend", `<option>${esc(p.c)}</option>`);
    $("ed-brands").innerHTML = [...new Set(P.map(x => x.b))].sort().map(b => `<option value="${esc(b)}">`).join("");
    $("ed-title").textContent = novo ? "Novo produto · " + NOME_LOJA[LOJA] : "Editar produto";
    $("ed-sku").textContent = novo ? "Depois de salvar, você poderá enviar a foto" : "Código " + p.sku;
    $("ed-n").value = p.n; $("ed-b").value = p.b; $("ed-s").value = p.s; $("ed-c").value = p.c; $("ed-g").value = p.g || "";
    $("ed-p").value = p.p ? p.p.toFixed(2).replace(".", ",") : ""; $("ed-d").value = p.d || ""; $("ed-vis").checked = !p.h; $("ed-stk").checked = p.e !== false;
    err("ed-err"); $("ed-photo").hidden = novo;
    $("ed-del").hidden = novo || ME.papel !== "dono"; delArmado = false; $("ed-del").textContent = "Excluir produto";
    $("ed-ok").textContent = novo ? "Criar produto" : "Salvar";
    if (!novo) edFoto();
    abrirSheet("ed"); $("ed-n").focus();
  }
  $("pn-new").onclick = () => abrirEd(null);
  $("ed-form").onsubmit = async e => {
    e.preventDefault(); err("ed-err");
    const nome = $("ed-n").value.trim().replace(/\s+/g, " ");
    const raw = $("ed-p").value.trim().replace(/[R$\s]/g, "");
    const preco = raw ? Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw) : 0;
    if (!nome) return err("ed-err", "Digite o nome do produto.");
    if (raw && (!isFinite(preco) || preco < 0)) return err("ed-err", 'Preço inválido. Use o formato 89,90 ou deixe vazio para "Sob consulta".');
    const row = { nome, marca: $("ed-b").value.trim(), tamanho: $("ed-s").value.trim(), categoria: $("ed-c").value,
      publico: $("ed-g").value, preco: Math.round(preco * 100) / 100, descricao: $("ed-d").value.trim(), visivel: $("ed-vis").checked, em_estoque: $("ed-stk").checked };
    busy($("ed-ok"), true, "Salvando…");
    let res;
    if (edSku) res = await sb.from("catalogo_produtos").update(row).eq("loja", LOJA).eq("sku", edSku).select().single();
    else res = await sb.from("catalogo_produtos").insert({ ...row, loja: LOJA, sku: "N" + Date.now().toString(36).toUpperCase() }).select().single();
    busy($("ed-ok"), false);
    if (res.error) return err("ed-err", traduz(res.error));
    const rec = H.doBanco(res.data); const novo = !edSku;
    atualizar(rec);
    if (novo) { toast("Produto criado. Agora você pode enviar a foto.", true); fecharSheet("ed"); abrirEd(rec.sku); }
    else { toast("Salvo. Já aparece no catálogo.", true); fecharSheet("ed"); }
  };
  $("ed-del").onclick = async () => {
    if (!delArmado) { delArmado = true; $("ed-del").textContent = "Confirmar exclusão"; return; }
    busy($("ed-del"), true, "Excluindo…");
    const p = acha(edSku);
    const { error } = await sb.from("catalogo_produtos").delete().eq("loja", LOJA).eq("sku", edSku);
    busy($("ed-del"), false);
    if (error) return err("ed-err", traduz(error));
    apagarArquivo(p && p.i);
    P = P.filter(x => x.sku !== edSku); pnChips(); pnRender(); fecharSheet("ed"); toast("Produto excluído.", true);
  };
  $("ed-up").onclick = () => edSku && escolherFoto(edSku);
  $("ed-rm").onclick = async () => {
    const p = acha(edSku); if (!p) return;
    busy($("ed-rm"), true, "Removendo…");
    const { data, error } = await sb.from("catalogo_produtos").update({ foto_url: null }).eq("loja", LOJA).eq("sku", p.sku).select().single();
    busy($("ed-rm"), false);
    if (error) return toast(traduz(error));
    apagarArquivo(p.i); atualizar(H.doBanco(data)); edFoto(); toast("Foto removida.", true);
  };

  /* ---- fotos ---- */
  function caminhoDoArquivo(url) {
    const m = String(url || "").match(/\/storage\/v1\/object\/public\/catalogo\/(.+)$/);
    return m ? decodeURIComponent(m[1].split("?")[0]) : null;
  }
  function apagarArquivo(url) { const c = caminhoDoArquivo(url); if (c) sb.storage.from("catalogo").remove([c]).catch(() => {}); }

  const OUT = 1000, cv = $("cr-canvas"), cx = cv.getContext("2d");
  let cr = { sku: null, bmp: null, rot: 0, mode: "cover", bg: "auto", autoBg: "#ffffff", zoom: 1, x: 0, y: 0 }, pickSku = null;
  function escolherFoto(sku) { pickSku = sku; $("file").value = ""; $("file").click(); }
  $("cr-other").onclick = () => escolherFoto(cr.sku);
  $("file").onchange = async () => {
    const f = $("file").files[0]; if (!f || !pickSku) return;
    if (!f.type.startsWith("image/")) return toast("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");
    try {
      const bmp = await createImageBitmap(f);
      const p = acha(pickSku);
      cr = { sku: pickSku, bmp, rot: 0, mode: "cover", bg: cr.bg || "auto", autoBg: corBorda(bmp), zoom: 1, x: 0, y: 0 };
      $("cr-brand").textContent = p.b; $("cr-name").textContent = p.n;
      if ($("crop").hidden) abrirSheet("crop");
      modo("cover"); segBg(); $("cr-ok").focus();
    } catch (e) { toast("Não foi possível abrir essa imagem. Tente outra."); }
  };
  function corBorda(bmp) {
    const c = document.createElement("canvas"); c.width = c.height = 40; const g = c.getContext("2d"); g.drawImage(bmp, 0, 0, 40, 40);
    const d = g.getImageData(0, 0, 40, 40).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < 40; i++) for (const [x, y] of [[i, 0], [i, 39], [0, i], [39, i]]) { const k = (y * 40 + x) * 4; if (d[k + 3] < 10) continue; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; }
    if (!n) return "#ffffff"; const h = v => Math.round(v / n).toString(16).padStart(2, "0"); return "#" + h(r) + h(gg) + h(b);
  }
  const dims = () => cr.rot % 180 ? [cr.bmp.height, cr.bmp.width] : [cr.bmp.width, cr.bmp.height];
  const coverS = () => { const [w, h] = dims(); return Math.max(OUT / w, OUT / h); };
  const fitS = () => { const [w, h] = dims(); return Math.min(OUT / w, OUT / h); };
  const minS = () => fitS() * .6, maxS = () => coverS() * 4;
  const zToS = s => Math.round(Math.log(s / minS()) / Math.log(maxS() / minS()) * 1000);
  const sToZ = v => minS() * Math.pow(maxS() / minS(), v / 1000);
  function limita() {
    const [w, h] = dims(); const sw = w * cr.zoom, sh = h * cr.zoom;
    const lim = sz => sz >= OUT ? (sz - OUT) / 2 : (OUT - sz) / 2;
    cr.x = Math.max(-lim(sw), Math.min(lim(sw), cr.x)); cr.y = Math.max(-lim(sh), Math.min(lim(sh), cr.y));
  }
  function desenha(t = cx) {
    limita(); t.save(); t.fillStyle = cr.bg === "auto" ? cr.autoBg : cr.bg; t.fillRect(0, 0, OUT, OUT);
    t.translate(OUT / 2 + cr.x, OUT / 2 + cr.y); t.rotate(cr.rot * Math.PI / 180); t.scale(cr.zoom, cr.zoom);
    t.imageSmoothingQuality = "high"; t.drawImage(cr.bmp, -cr.bmp.width / 2, -cr.bmp.height / 2); t.restore();
    $("cr-zoom").value = zToS(cr.zoom);
  }
  function modo(m) { cr.mode = m; cr.zoom = m === "cover" ? coverS() : fitS(); cr.x = cr.y = 0; $("cr-cover").setAttribute("aria-pressed", m === "cover"); $("cr-fit").setAttribute("aria-pressed", m === "fit"); desenha(); }
  $("cr-cover").onclick = () => modo("cover"); $("cr-fit").onclick = () => modo("fit");
  $("cr-rot").onclick = () => { cr.rot = (cr.rot + 90) % 360; modo(cr.mode); };
  $("cr-zoom").oninput = e => { cr.zoom = sToZ(+e.target.value); desenha(); };
  $("cr-zin").onclick = () => { cr.zoom = Math.min(maxS(), cr.zoom * 1.12); desenha(); };
  $("cr-zout").onclick = () => { cr.zoom = Math.max(minS(), cr.zoom / 1.12); desenha(); };
  function segBg() { $("cr-bg").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.bg === cr.bg)); }
  $("cr-bg").onclick = e => { const b = e.target.closest("button"); if (!b) return; cr.bg = b.dataset.bg; segBg(); desenha(); };
  let drag = null;
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, ox: cr.x, oy: cr.y, k: OUT / cv.getBoundingClientRect().width }; cv.setPointerCapture(e.pointerId); $("cr-stage").classList.add("dragging"); });
  cv.addEventListener("pointermove", e => { if (!drag) return; cr.x = drag.ox + (e.clientX - drag.x) * drag.k; cr.y = drag.oy + (e.clientY - drag.y) * drag.k; desenha(); });
  const solta = () => { drag = null; $("cr-stage").classList.remove("dragging"); };
  cv.addEventListener("pointerup", solta); cv.addEventListener("pointercancel", solta);
  cv.addEventListener("wheel", e => { e.preventDefault(); cr.zoom = Math.min(maxS(), Math.max(minS(), cr.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); desenha(); }, { passive: false });
  const blobDe = (c, tipo, q) => new Promise(r => c.toBlob(b => r(b), tipo, q));
  $("cr-ok").onclick = async () => {
    const btn = $("cr-ok"); if (btn.disabled) return; busy(btn, true, "Enviando…");
    try {
      const out = document.createElement("canvas"); out.width = out.height = OUT; desenha(out.getContext("2d"));
      let blob = await blobDe(out, "image/webp", .88), ext = "webp";
      if (!blob || blob.type !== "image/webp") { blob = await blobDe(out, "image/jpeg", .9); ext = "jpg"; }
      const p = acha(cr.sku), caminho = `${LOJA}/${cr.sku}-${Date.now()}.${ext}`;
      const up = await sb.storage.from("catalogo").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
      if (up.error) throw up.error;
      const url = sb.storage.from("catalogo").getPublicUrl(caminho).data.publicUrl;
      const { data, error } = await sb.from("catalogo_produtos").update({ foto_url: url }).eq("loja", LOJA).eq("sku", cr.sku).select().single();
      if (error) { sb.storage.from("catalogo").remove([caminho]).catch(() => {}); throw error; }
      apagarArquivo(p && p.i);
      atualizar(H.doBanco(data)); fecharSheet("crop");
      if (!$("ed").hidden && edSku === cr.sku) edFoto();
      toast("Foto salva. Já aparece no catálogo.", true);
    } catch (e) { toast(/payload too large|exceeded/i.test(e && e.message) ? "Imagem grande demais." : traduz(e)); }
    finally { busy(btn, false); }
  };

  /* ================= EQUIPE (dono) ================= */
  $("eq-url").textContent = location.origin + location.pathname;
  $("mb-gerar").onclick = () => {
    const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; const v = new Uint32Array(10); crypto.getRandomValues(v);
    $("mb-senha").value = Array.from(v, n => a[n % a.length]).join("");
  };
  async function carregarEquipe() {
    const { data, error } = await sb.from("catalogo_equipe").select("*").order("papel").order("nome");
    if (error) { $("eq-list").innerHTML = `<li class="muted">${esc(traduz(error))}</li>`; return; }
    $("eq-list").innerHTML = data.map(m => {
      const eu = m.user_id === ME.user_id, dono = m.papel === "dono";
      return `<li class="eq-item${m.ativo ? "" : " is-off"}" data-uid="${m.user_id}">
        <div class="eq-who"><b>${esc(m.nome || m.email)}</b><small>${esc(m.email)}</small>
          <div class="pills"><span class="pill${dono ? " ok" : ""}">${dono ? "Dono" : "Funcionária"}</span>${m.ativo ? "" : '<span class="pill off">Sem acesso</span>'}${eu ? '<span class="pill">Você</span>' : ""}</div></div>
        ${dono ? '<p class="muted eq-note">Acesso total às duas lojas e à equipe.</p>' : `
        <div class="eq-ctrl">
          <label class="chk"><input type="checkbox" data-loja="hara" ${m.lojas.includes("hara") ? "checked" : ""}><span>Harã</span></label>
          <label class="chk"><input type="checkbox" data-loja="mix" ${m.lojas.includes("mix") ? "checked" : ""}><span>Harã Mix</span></label>
          <button class="cr-ghost sm" data-senha="1">Nova senha</button>
          <button class="${m.ativo ? "rm" : "cr-ghost"} sm" data-ativo="${m.ativo ? "0" : "1"}">${m.ativo ? "Bloquear acesso" : "Liberar acesso"}</button>
        </div>`}
      </li>`;
    }).join("") || '<li class="muted">Ninguém na equipe ainda.</li>';
  }
  $("eq-list").addEventListener("change", async e => {
    const cb = e.target.closest("[data-loja]"); if (!cb) return;
    const li = cb.closest("[data-uid]"); const lojas = [...li.querySelectorAll("[data-loja]:checked")].map(x => x.dataset.loja);
    if (!lojas.length) { cb.checked = true; return toast("Deixe pelo menos uma loja marcada. Para tirar o acesso, use Bloquear acesso."); }
    const { error } = await sb.from("catalogo_equipe").update({ lojas }).eq("user_id", li.dataset.uid);
    if (error) { cb.checked = !cb.checked; return toast(traduz(error)); }
    toast("Lojas atualizadas.", true);
  });
  $("eq-list").addEventListener("click", async e => {
    const ns = e.target.closest("[data-senha]");
    if (ns) {
      const li = ns.closest("[data-uid]"), nome = li.querySelector(".eq-who b").textContent, email = li.querySelector(".eq-who small").textContent;
      const al = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789", v = new Uint32Array(8); crypto.getRandomValues(v);
      const senha = "Hara-" + Array.from(v, n => al[n % al.length]).join("");
      busy(ns, true, "…");
      const { error } = await sb.rpc("catalogo_redefinir_senha", { p_user_id: li.dataset.uid, p_senha: senha });
      busy(ns, false);
      if (error) return toast(traduz(error));
      let box = li.querySelector(".ok-box"); if (!box) { box = document.createElement("div"); box.className = "ok-box eq-pw"; li.append(box); }
      box.hidden = false;
      box.innerHTML = `Senha nova de <b>${esc(nome)}</b>: <code>${esc(senha)}</code><br><button type="button" class="cr-ghost sm">Copiar mensagem</button>`;
      box.querySelector("button").onclick = () => navigator.clipboard.writeText(`Oi, ${nome}! Sua senha nova do painel Harã:\n${location.origin + location.pathname}\nE-mail: ${email}\nSenha: ${senha}\nDepois de entrar, troque em "Trocar senha".`).then(() => toast("Mensagem copiada.", true), () => toast("Não deu para copiar. Selecione o texto."));
      return;
    }
    const b = e.target.closest("[data-ativo]"); if (!b) return;
    const li = b.closest("[data-uid]"); busy(b, true, "…");
    const { error } = await sb.from("catalogo_equipe").update({ ativo: b.dataset.ativo === "1" }).eq("user_id", li.dataset.uid);
    busy(b, false);
    if (error) return toast(traduz(error));
    toast(b.dataset.ativo === "1" ? "Acesso liberado." : "Acesso bloqueado. Ela não consegue mais editar.", true); carregarEquipe();
  });
  $("f-membro").onsubmit = async e => {
    e.preventDefault(); err("mb-err"); $("mb-ok").hidden = true;
    const nome = $("mb-nome").value.trim(), email = $("mb-email").value.trim().toLowerCase(), senha = $("mb-senha").value;
    const lojas = [...document.querySelectorAll('[name="mb-loja"]:checked')].map(x => x.value);
    if (!nome || !email) return err("mb-err", "Preencha nome e e-mail.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("mb-err", "E-mail inválido.");
    if (senha.length < 8) return err("mb-err", "A senha provisória precisa ter pelo menos 8 caracteres.");
    if (!lojas.length) return err("mb-err", "Marque pelo menos uma loja.");
    busy($("mb-btn"), true, "Criando…");
    try {
      // o banco cria o login (já confirmado) e libera o acesso numa única chamada
      const { data: res, error } = await sb.rpc("catalogo_criar_membro", { p_email: email, p_nome: nome, p_senha: senha, p_lojas: lojas });
      if (error) throw error;
      const jaExistia = res === "existente", precisaConfirmar = false;
      const link = location.origin + location.pathname;
      $("mb-ok").innerHTML = jaExistia
        ? `<b>${esc(nome)}</b> já tinha login com este e-mail. O acesso ao catálogo foi liberado; a senha dela continua a mesma de antes.`
        : `<b>Acesso criado.</b> Envie para ${esc(nome)}:<br>Link: <code>${esc(link)}</code><br>E-mail: <code>${esc(email)}</code><br>Senha provisória: <code>${esc(senha)}</code>`
          + (precisaConfirmar ? `<br><br>⚠ O Supabase está pedindo confirmação de e-mail: ela precisa clicar no link que chegou na caixa de entrada antes do primeiro acesso.` : "")
          + `<br><br><button type="button" class="cr-ghost sm" id="mb-copiar">Copiar mensagem</button>`;
      $("mb-ok").hidden = false;
      const c = $("mb-copiar");
      if (c) c.onclick = () => {
        const txt = `Oi, ${nome}! Seu acesso ao painel do catálogo Harã:\n${link}\nE-mail: ${email}\nSenha provisória: ${senha}\nDepois de entrar, troque a senha em "Trocar senha".`;
        navigator.clipboard.writeText(txt).then(() => toast("Mensagem copiada.", true), () => toast("Não deu para copiar. Selecione o texto e copie."));
      };
      $("mb-nome").value = $("mb-email").value = $("mb-senha").value = "";
      document.querySelectorAll('[name="mb-loja"]').forEach(x => (x.checked = true));
      carregarEquipe();
    } catch (er) { err("mb-err", /Nenhum login encontrado/.test(er.message) ? "O login não foi criado. Confira se o cadastro por e-mail está ligado no Supabase (veja o README)." : traduz(er)); }
    finally { busy($("mb-btn"), false); }
  };

  /* ================= INÍCIO ================= */
  async function iniciar() {
    if (!sb) return mensagem("Painel ainda não configurado", "Preencha o arquivo <code>assets/config.js</code> com os dados do Supabase. O passo a passo está no README do projeto.", false);
    sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") { recovering = true; formLogin("f-nova"); } });
    const { data } = await sb.auth.getSession();
    if (recovering || /type=recovery/.test(location.hash)) { recovering = true; return formLogin("f-nova"); }
    if (data.session) entrar(data.session.user); else formLogin("f-login");
  }
  iniciar();
})();
