import React, { useState } from "react";
import { Link } from "react-router-dom";
import ConectaBotChat from "../components/ConectaBotChat";

export default function ConectaBotStandalone({ user }) {
  const [lastTicketMsg, setLastTicketMsg] = useState("");
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Central ConectaBot</h1>
        <div style={styles.actions}>
          <Link to="/" style={styles.linkBtn}>Início</Link>
          <Link to="/support" style={styles.linkBtn}>Tickets</Link>
        </div>
      </header>
      <p style={styles.subtitle}>
        Converse com o ConectaBot para tirar dúvidas rápidas ou abrir um novo chamado. 
        Ao concluir a coleta ele cria o ticket automaticamente.
      </p>
      {lastTicketMsg && (
        <div style={styles.alert}>
          {lastTicketMsg}
        </div>
      )}
      <div style={styles.chatArea}>
        <ConectaBotChat
          user={user}
          onTicketCreated={() => {
            setLastTicketMsg("Ticket criado com sucesso. Você pode acompanhá-lo na página de Tickets.");
          }}
          onClose={() => {
            // Nesta página não fechamos o container; poderíamos limpar o estado
            setLastTicketMsg("");
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "20px 24px", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { margin: 0, fontSize: 24 },
  actions: { display: "flex", gap: 8 },
  linkBtn: { background: "#1976d2", color: "#fff", padding: "6px 12px", borderRadius: 4, textDecoration: "none", fontSize: 14 },
  subtitle: { color: "#555", margin: "4px 0 16px" },
  alert: { background: "#e8f5e9", border: "1px solid #c8e6c9", padding: "8px 12px", borderRadius: 6, color: "#2e7d32", fontSize: 14, marginBottom: 12 },
  chatArea: { position: "relative", minHeight: 520 }
};
