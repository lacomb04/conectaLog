import React, { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { Link } from "react-router-dom";
import TeamChatPanel from "../components/TeamChatPanel";
import ChatDock from "../components/ChatDock";
import ConectaBotChat from "../components/ConectaBotChat";

export default function Tickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const chatButtons = [
    {
      key: "team",
      label: "Equipe",
      icon: "🗨️",
      active: showTeamChat,
      bg: "linear-gradient(135deg,#0ea5e9,#0284c7)",
      onClick: () => {
        setShowAIChat(false);
        setShowTeamChat((o) => !o);
      },
    },
    {
      key: "bot",
      label: "ConectaBot",
      icon: "🤖",
      active: showAIChat,
      activeBg: "linear-gradient(135deg,#6366f1,#4338ca)",
      onClick: () => {
        setShowTeamChat(false);
        setShowAIChat((o) => !o);
      },
    },
  ];

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user.id);
      setTickets(data || []);
      setLoading(false);
    }
    fetchTickets();
  }, [user]);

  if (loading) return <div>Carregando tickets...</div>;
  if (!tickets.length) return <div>Nenhum ticket encontrado.</div>;

  return (
    <div style={{ padding: 32 }}>
      <h2>Meus Tickets</h2>
      <ul>
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link to={`/ticket/${ticket.id}`}>{ticket.title}</Link>
            <span style={{ marginLeft: 8, color: "#888" }}>
              {ticket.status}
            </span>
          </li>
        ))}
      </ul>
      {showTeamChat && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            right: 32,
            zIndex: 1300,
          }}
        >
          <TeamChatPanel user={user} onClose={() => setShowTeamChat(false)} />
        </div>
      )}
      {showAIChat && (
        <div
          style={{
            position: "fixed",
            bottom: 210,
            right: 32,
            zIndex: 1300,
          }}
        >
          <ConectaBotChat
            user={user}
            onTicketCreated={() => {
              setShowAIChat(false);
              setLoading(true);
              supabase
                .from("tickets")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false })
                .then(({ data }) => {
                  setTickets(data || []);
                  setLoading(false);
                });
            }}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
      <ChatDock buttons={chatButtons} />
    </div>
  );
}
