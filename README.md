# Harã Mix — catálogo e painel da equipe

Site do catálogo da **Harã Mix** (136 produtos Paris Elysees e Ciclo):

| Endereço | O que é |
|---|---|
| `/` | Catálogo Harã Mix |
| `/admin/` | **Painel da equipe**: login com e-mail e senha, edição de produtos e fotos, gestão das funcionárias |

Este site usa **o mesmo projeto do Supabase** que o site `hara-arabe`, com os mesmos logins e a mesma equipe.

## Configuração

1. **Primeiro, configure o Supabase** seguindo o README do repositório **hara-arabe**. Lá estão os arquivos SQL, que já criam os produtos das duas lojas.
2. Neste repositório, abra `assets/config.js`, clique no lápis (Edit) e cole os **mesmos** `supabaseUrl` e `supabaseAnonKey` usados no `hara-arabe`. Depois clique em **Commit changes**.
3. Em **Settings > Pages**, escolha **Deploy from a branch**, depois `main` / `(root)`, e clique em **Save**.

Em 1 ou 2 minutos o site fica no ar:
- Catálogo: `https://humbertozz.github.io/hara-mix/`
- Painel: `https://humbertozz.github.io/hara-mix/admin/`

## Usando o painel

Funciona igual ao painel da Harã:
- **Editar** nome, marca, tamanho, categoria, público, preço, descrição e se o produto aparece no catálogo. Tudo é salvo na hora.
- **Enviar foto** com enquadramento. A foto sai sempre quadrada, em 1000 × 1000 px.
- **+ Novo produto**, filtros (Sem foto, Com foto, Ocultos, Sem preço) e **Excluir**, este só para o dono.
- A aba **Equipe** é a mesma dos dois sites. Para entrar neste painel, a funcionária precisa estar liberada para a **Harã Mix**.

## Observações

- O catálogo **não sincroniza** com o sistema de estoque.
- 23 produtos estão com preço zero e aparecem como "Sob consulta". Use o filtro **Sem preço** no painel para corrigir.
- Os números das vendedoras ficam em `assets/config.js`.
