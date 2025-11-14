import supabase from "./supabaseClient";

// Lista todos os tickets
export async function listarTickets() {
  const { data, error } = await supabase.from("tickets").select("*");
  if (error) throw error;
  return data;
}

// Cria um novo ticket
export async function criarTicket({ titulo, descricao, user_id }) {
  const { data, error } = await supabase
    .from("tickets")
    .insert([{ titulo, descricao, user_id }]);
  if (error) throw error;
  return data;
}

// Adiciona comentário ao ticket
export async function adicionarComentario({ ticket_id, user_id, mensagem }) {
  const { data, error } = await supabase
    .from("comments")
    .insert([{ ticket_id, user_id, mensagem }]);
  if (error) throw error;
  return data;
}
