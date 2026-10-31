/* =====================================================================
   CONFIGURAÇÃO DO SITE — é o único arquivo que você precisa editar.

   Onde achar os dois valores do Supabase:
   Supabase > seu projeto do catálogo > Project Settings > API
     - "Project URL"          -> supabaseUrl
     - "anon public" (API key) -> supabaseAnonKey
   A chave "anon" foi feita para ficar pública no site. NUNCA coloque
   aqui a chave "service_role".
   ===================================================================== */
window.CONFIG = {
  // Qual catálogo é este site (não mude)
  loja: "mix",
  catalogoUrl: "../",

  supabaseUrl: "https://eujbnvnkrbkxlkfiuapq.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1amJudm5rcmJreGxrZml1YXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MjkwODIsImV4cCI6MjEwOTAwNTA4Mn0.MDq1d1lF4SBGe_HlqpGODbYW03POZaNOLEWCD-PGlR4",

  // Vendedoras que aparecem nos botões "Pedir com" dos catálogos
  // (a página de links inicial tem os números escritos direto no index.html)
  vendedoras: [
    { nome: "Milena",   whatsapp: "557991146126", exibicao: "(79) 9114-6126" },
    { nome: "Priscila", whatsapp: "557991146156", exibicao: "(79) 9114-6156" },
    { nome: "Clara",    whatsapp: "557991146154", exibicao: "(79) 9114-6154" }
  ]
};
