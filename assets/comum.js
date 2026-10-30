/* Funções e dados compartilhados entre catálogo e painel */
window.LOJAS = {
  hara: {
    nome: "Harã",
    titulo: "Catálogo Harã",
    sub: "Perfumes árabes, miniaturas e linha corpo. Toque em um produto para pedir pelo WhatsApp.",
    cats: ["Perfumes", "Miniaturas", "Corpo e Banho", "Kits"],
    msg: "catálogo da Harã"
  },
  mix: {
    nome: "Harã Mix",
    titulo: "Catálogo Harã Mix",
    sub: "Perfumes Paris Elysees, deo colônias e linha corpo Ciclo. Toque em um produto para pedir pelo WhatsApp.",
    cats: ["Perfumes", "Deo Colônias", "Corpo e Banho", "Kits"],
    msg: "catálogo da Harã Mix"
  }
};

window.H = {
  $: id => document.getElementById(id),
  esc: s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
  brl: v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  norm: s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  configurado() {
    const c = window.CONFIG || {};
    return !!(c.supabaseUrl && c.supabaseAnonKey && !/SEU-PROJETO|COLE-AQUI/.test(c.supabaseUrl + c.supabaseAnonKey));
  },
  cliente() {
    if (!window.supabase || !H.configurado()) return null;
    if (!H._sb) H._sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "hara-catalogo-auth" }
    });
    return H._sb;
  },
  /* converte a linha do banco para o formato usado na tela */
  doBanco: r => ({
    id: r.id, sku: r.sku, n: r.nome, b: r.marca || "", s: r.tamanho || "", c: r.categoria || "Perfumes",
    g: r.publico || "", p: Number(r.preco) || 0, d: r.descricao || "", i: r.foto_url || "", h: r.visivel === false
  }),
  /* busca todos os produtos de uma loja, de 1000 em 1000 (limite do Supabase) */
  async produtos(sb, loja, soVisiveis) {
    const out = [];
    for (let de = 0; ; de += 1000) {
      let q = sb.from("catalogo_produtos")
        .select("id,sku,nome,marca,tamanho,categoria,publico,preco,descricao,foto_url,visivel")
        .eq("loja", loja).order("nome").range(de, de + 999);
      if (soVisiveis) q = q.eq("visivel", true);
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data.map(H.doBanco));
      if (data.length < 1000) break;
    }
    return out;
  },
  toast(t, ok) {
    const el = H.$("toast"); if (!el) return;
    el.textContent = t; el.className = "toast" + (ok ? " ok" : ""); el.hidden = false;
    clearTimeout(H._tt); H._tt = setTimeout(() => (el.hidden = true), 4500);
  },
  WA: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.24-1.37A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.82.83-3.03-.2-.31a8.2 8.2 0 1 1 6.95 3.85Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.13-.17.24-.64.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.1-.5.12-.12.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06 0 1.22.88 2.39 1 2.55.13.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.4.52.6.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.17-.47-.29Z"/></svg>',
  CAM: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  img(p, eager) {
    const fb = `<div class="fb"><span>${H.esc(p.b === "Outras marcas" || !p.b ? "Harã" : p.b)}</span></div>`;
    return p.i ? fb + `<img src="${H.esc(p.i)}" alt="${H.esc(p.n)}" ${eager ? "" : 'loading="lazy"'} decoding="async" onerror="this.remove()">` : fb;
  }
};
