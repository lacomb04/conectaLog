require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Inicializa o Supabase usando as variáveis de ambiente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Exemplo: buscar dados de uma tabela chamada 'usuarios'
async function buscarUsuarios() {
  const { data, error } = await supabase.from("usuarios").select("*");
  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
  return data;
}

// ...existing code...
// Agora você pode usar o objeto 'supabase' para acessar o banco de dados

module.exports = { buscarUsuarios };
