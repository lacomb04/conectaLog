import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import GlobalStyle from "./styles/GlobalStyle";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import EmployeeHome from "./pages/EmployeeHome";
import TicketDetail from "./pages/TicketDetail";
import SupportDashboard from "./pages/SupportDashboard";
import BI from "./pages/BI";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTickets from "./pages/AdminTickets";
import supabase from "./services/supabaseClient"; // novo import

function Shell({ user, setUser }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setSearchTerm("");
  }, [user.role]);

  // Garantir que exista um registro na tabela users para o usuário logado
  useEffect(() => {
    if (!user?.email) return;
    let active = true;
    (async () => {
      try {
        // tenta por e-mail
        const { data: existing, error: selErr } = await supabase
          .from("users")
          .select("id, email, full_name, role")
          .eq("email", user.email)
          .maybeSingle();
        if (selErr) console.warn("[App] users.select:", selErr?.message);

        const payload = {
          // mantém id se já existir; se não houver, tenta usar o id do app
          ...(user.id ? { id: user.id } : {}),
          email: user.email,
          full_name: user.full_name || user.name || user.email.split("@")[0],
          role: user.role || "employee",
        };

        if (!existing) {
          const { error: insErr } = await supabase.from("users").upsert(payload, { onConflict: "email" });
          if (insErr) console.warn("[App] users.upsert:", insErr?.message);
        } else {
          // sincroniza role/nome caso tenham mudado
          const needUpdate =
            (payload.full_name && payload.full_name !== existing.full_name) ||
            (payload.role && payload.role !== existing.role);
          if (needUpdate) {
            const { error: updErr } = await supabase
              .from("users")
              .update({ full_name: payload.full_name, role: payload.role })
              .eq("email", user.email);
            if (updErr) console.warn("[App] users.update:", updErr?.message);
          }
          // injeta id real da tabela se o app não tiver
          if (!user.id && existing.id && active) {
            // atualiza somente em memória
            setUser({ ...user, id: existing.id });
          }
        }
      } catch (e) {
        console.warn("[App] ensure user row:", e?.message);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.email]); // ...existing code...

  const onHome = () => navigate("/");
  const onLogout = () => setUser(null);

  const navLinks =
    user.role === "admin"
      ? [
          { to: "/tickets", label: "Chamados" },
          { to: "/ativos", label: "Ativos" },
          { to: "/bi", label: "Painel BI" },
        ]
      : [];

  return (
    <Layout
      onHome={onHome}
      onLogout={onLogout}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={
        user.role === "employee"
          ? "Buscar meus chamados..."
          : "Buscar chamados..."
      }
      navLinks={navLinks}
    >
      <Routes>
        {user.role === "employee" && (
          <>
            <Route
              path="/"
              element={<EmployeeHome user={user} searchTerm={searchTerm} />}
            />
            <Route path="/ticket/:id" element={<TicketDetail user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === "support" && (
          <>
            <Route
              path="/"
              element={<SupportDashboard user={user} searchTerm={searchTerm} />}
            />
            <Route path="/ticket/:id" element={<TicketDetail user={user} />} />
            <Route path="/bi" element={<BI user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
        {user.role === "admin" && (
          <>
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route
              path="/tickets"
              element={<AdminTickets user={user} searchTerm={searchTerm} />}
            />
            <Route path="/ativos" element={<AdminDashboard user={user} />} />
            <Route path="/ticket/:id" element={<TicketDetail user={user} />} />
            <Route path="/bi" element={<BI user={user} />} />
            <Route path="*" element={<Navigate to="/tickets" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <GlobalStyle />
      <BrowserRouter>
        {!user ? (
          <Login onLogin={setUser} />
        ) : (
          <Shell user={user} setUser={setUser} />
        )}
      </BrowserRouter>
    </>
  );
}
