require("dotenv").config();

const apiKey = process.env.API_KEY;
const {
  listarTickets,
  adicionarComentario,
  listarComentarios,
} = require("./ticketService");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Exemplo: listar todos os tickets
async function mostrarTickets() {
  try {
    const tickets = await listarTickets();
    console.log("Tickets:", tickets);
    // Para cada ticket, listar comentários
    for (const ticket of tickets) {
      const comentarios = await listarComentarios(ticket.id);
      console.log(`Comentários do ticket ${ticket.id}:`, comentarios);
    }
  } catch (error) {
    console.error("Erro na área administrativa:", error);
  }
}

// Exibe todos os tickets e permite responder
async function mostrarAreaAdmin() {
  try {
    const tickets = await listarTickets();
    console.log("Tickets:", tickets);
    // Aqui você pode renderizar os tickets no frontend ou criar rotas para exibir no backend
  } catch (error) {
    console.error("Erro ao listar tickets:", error);
  }
}

// Exemplo: responder um ticket
async function responderTicket(ticket_id, admin_id, mensagem) {
  try {
    const resposta = await adicionarComentario({
      ticket_id,
      user_id: admin_id,
      mensagem,
    });
    console.log("Resposta adicionada:", resposta);
  } catch (error) {
    console.error("Erro ao responder ticket:", error);
  }
}

async function atribuirTicket(ticket_id, user_id) {
  await supabase
    .from("tickets")
    .update({ assigned_to: user_id })
    .eq("id", ticket_id);
  console.log(`Ticket ${ticket_id} atribuído ao usuário ${user_id}`);
}

async function transferirTicket(ticket_id, novo_user_id) {
  await supabase
    .from("tickets")
    .update({ assigned_to: novo_user_id })
    .eq("id", ticket_id);
  console.log(`Ticket ${ticket_id} transferido para usuário ${novo_user_id}`);
}

// Exporte se necessário
module.exports = {
  mostrarTickets,
  mostrarAreaAdmin,
  responderTicket,
  atribuirTicket,
  transferirTicket,
};
