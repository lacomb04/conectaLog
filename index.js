require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Inicializa o Supabase usando as variáveis de ambiente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Teste: inserir um chamado
async function criarChamado() {
  const { data, error } = await supabase
    .from("chamados") // troque pelo nome correto da sua tabela
    .insert([{ titulo: "Teste", descricao: "Chamado de teste" }]);
  if (error) {
    console.error("Erro ao criar chamado:", error);
  } else {
    console.log("Chamado criado:", data);
  }
}

// Teste: listar chamados
async function listarChamados() {
  const { data, error } = await supabase
    .from("chamados") // troque pelo nome correto da sua tabela
    .select("*");
  if (error) {
    console.error("Erro ao listar chamados:", error);
  } else {
    console.log("Lista de chamados:", data);
  }
}

// Função para inserir um ticket
async function criarTicket(ticket) {
  const { data, error } = await supabase.from("tickets").insert([ticket]);
  if (error) {
    console.error("Erro ao criar ticket:", error);
    return null;
  }
  return data;
}

// Função para listar tickets
async function listarTickets() {
  const { data, error } = await supabase.from("tickets").select("*");
  if (error) {
    console.error("Erro ao listar tickets:", error);
    return [];
  }
  return data;
}

// Executa os testes
(async () => {
  await criarChamado();
  await listarChamados();

  // Criar um ticket de teste
  const novoTicket = { titulo: "Teste", descricao: "Ticket de teste" }; // ajuste os campos conforme sua tabela
  const resultado = await criarTicket(novoTicket);
  console.log("Ticket criado:", resultado);

  // Listar tickets
  const tickets = await listarTickets();
  console.log("Lista de tickets:", tickets);
})();

// Exporta o cliente para uso em outros módulos
module.exports = supabase;

// Agora você pode usar o objeto 'supabase' para acessar o banco de dados
