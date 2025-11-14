import React, { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { Link } from "react-router-dom";

export default function Admin() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [supportUsers, setSupportUsers] = useState([]);
  const [transferOpen, setTransferOpen] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .in("role", ["admin", "support"]);
      setSupportUsers((data || []).filter((u) => u.id !== user.id));
    })();
  }, [user?.id]);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      // Buscar apenas tickets não atribuídos ou atribuídos ao usuário atual
      const { data } = await supabase
        .from("tickets")
        .select("*, user:users(full_name)")
        .or(`assigned_to.is.null,assigned_to.eq.${user?.id || "000"}`)
        .order("created_at", { ascending: false });
      setTickets(data || []);
      setLoading(false);
    }
    if (user) fetchTickets();
  }, [user]);

  async function assignToSelf(id) {
    if (!user?.id) return;
    await supabase
      .from("tickets")
      .update({ assigned_to: user.id })
      .eq("id", id);
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, assigned_to: user.id } : t))
    );
  }

  async function transferTicket(id, newUserId) {
    if (!newUserId) return;
    await supabase
      .from("tickets")
      .update({ assigned_to: newUserId })
      .eq("id", id);
    setTickets((prev) =>
      prev.filter((t) => {
        // Após transferir para outro, ele some da lista (pois não é mais do usuário)
        if (t.id === id) return false;
        return true;
      })
    );
    setTransferOpen(null);
  }

  if (loading) return <div>Carregando tickets...</div>;
  if (!tickets.length) return <div>Nenhum ticket encontrado.</div>;
  if (!user) return <div>Carregando usuário...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>Área Administrativa</h1>
      <ul>
        {tickets.map((ticket) => {
          const isMine = ticket.assigned_to === user.id;
          return (
            <li key={ticket.id}>
              <Link to={`/ticket/${ticket.id}`}>{ticket.title}</Link>
              <span style={{ marginLeft: 8, color: "#888" }}>
                {ticket.status}
              </span>
              <span style={{ marginLeft: 8 }}>{ticket.user?.full_name}</span>
              {!ticket.assigned_to && (
                <button
                  style={{ marginLeft: 12 }}
                  onClick={() => assignToSelf(ticket.id)}
                >
                  Assumir
                </button>
              )}
              {isMine && (
                <>
                  <button
                    style={{ marginLeft: 12 }}
                    onClick={() =>
                      setTransferOpen((cur) =>
                        cur === ticket.id ? null : ticket.id
                      )
                    }
                  >
                    Transferir
                  </button>
                  {transferOpen === ticket.id && (
                    <select
                      style={{ marginLeft: 8 }}
                      defaultValue=""
                      onChange={(e) =>
                        transferTicket(ticket.id, e.target.value)
                      }
                    >
                      <option value="">Selecionar destino...</option>
                      {supportUsers.map((su) => (
                        <option key={su.id} value={su.id}>
                          {su.full_name || su.email}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
