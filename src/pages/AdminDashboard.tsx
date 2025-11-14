import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import TicketList from "../components/TicketList";
import SupportDashboard from "./SupportDashboard";
import { useNavigate } from "react-router-dom";

const knowledgeTable =
  import.meta.env.VITE_CONECTABOT_KB_TABLE || "ai_knowledge";
const FALLBACK_CATEGORIES = [
  "policy",
  "faq",
  "procedure",
  "integration",
  "service_area",
  "troubleshooting",
  "other",
];
const CATEGORY_LABELS: Record<string, string> = {
  policy: "Política",
  faq: "Perguntas frequentes",
  procedure: "Procedimento",
  integration: "Integração",
  service_area: "Área de serviço",
  troubleshooting: "Solução de problemas",
  other: "Outro",
};

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.55)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1600,
};
const modalStyle: React.CSSProperties = {
  width: "min(720px, 96vw)",
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 28px 70px rgba(15,23,42,0.25)",
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  maxHeight: "90vh",
  overflowY: "auto",
};

const normalizeUser = (raw: any) => {
  if (!raw) return null;
  if (raw.user_metadata) {
    return {
      id: raw.id,
      email: raw.email || raw.user_metadata?.email || "",
      full_name:
        raw.user_metadata?.full_name || raw.email || raw.user_metadata?.name,
      role: raw.user_metadata?.role || raw.role || "admin",
    };
  }
  return {
    id: raw.id,
    email: raw.email || "",
    full_name: raw.full_name || raw.email || "Administrador",
    role: raw.role || "admin",
  };
};

const AdminDashboard: React.FC<{ searchTerm?: string }> = ({
  searchTerm = "",
}) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [kbOpen, setKbOpen] = useState(false);
  const [kbForm, setKbForm] = useState({
    title: "",
    category: FALLBACK_CATEGORIES[0],
    triggers: "",
    answer: "",
    notes: "",
  });
  const [allowedCategories, setAllowedCategories] =
    useState<string[]>(FALLBACK_CATEGORIES);
  const [savingKb, setSavingKb] = useState(false);
  const [kbFeedback, setKbFeedback] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.warn("[AdminDashboard] getSession:", error.message);
      if (!active) return;
      let current = normalizeUser(session?.user);
      if (!current) {
        const { data: fallback, error: fbError } = await supabase
          .from("users")
          .select("id, full_name, email, role")
          .eq("role", "admin")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (fbError)
          console.warn("[AdminDashboard] fallback user:", fbError.message);
        current = normalizeUser(fallback);
      }
      setUser(current);
      setLoading(false);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(normalizeUser(session?.user));
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from(knowledgeTable)
        .select("category")
        .order("category", { ascending: true });
      if (error) {
        console.warn("[AdminDashboard] categorias KB:", error.message);
        setAllowedCategories(FALLBACK_CATEGORIES);
        setKbForm((prev) => ({
          ...prev,
          category: FALLBACK_CATEGORIES[0],
        }));
        return;
      }
      const existing = (data || [])
        .map((row: any) => row.category)
        .filter((cat) => typeof cat === "string" && cat.length > 0);
      const finalCats = Array.from(
        new Set([...FALLBACK_CATEGORIES, ...existing])
      ).filter((cat) => FALLBACK_CATEGORIES.includes(cat));
      setAllowedCategories(finalCats);
      setKbForm((prev) => ({
        ...prev,
        category: finalCats.includes(prev.category)
          ? prev.category
          : finalCats[0],
      }));
    })();
  }, []);

  const handleKbChange =
    (field: keyof typeof kbForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setKbForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const submitKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbForm.title || !kbForm.category || !kbForm.answer) {
      setKbFeedback("Informe título, categoria e resposta.");
      return;
    }
    setSavingKb(true);
    setKbFeedback("");
    const payload = {
      title: kbForm.title.trim(),
      content: kbForm.answer.trim(),
      category: kbForm.category.trim(),
      tags: kbForm.triggers
        ? kbForm.triggers
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      source: kbForm.notes.trim() || null,
      is_active: true,
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from(knowledgeTable).insert(payload);
    if (error) {
      setKbFeedback("Falha ao salvar: " + error.message);
    } else {
      setKbFeedback("Conhecimento registrado com sucesso.");
      setKbForm({
        title: "",
        category: allowedCategories[0] || FALLBACK_CATEGORIES[0],
        triggers: "",
        answer: "",
        notes: "",
      });
    }
    setSavingKb(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Nenhum usuário autenticado.</div>;

  const headerActions = (
    <>
      <button
        onClick={() => navigate("/bi")}
        style={{
          padding: "8px 16px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        Abrir painel BI
      </button>
      <button
        onClick={() => setKbOpen(true)}
        style={{
          padding: "8px 16px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg,#6366f1,#4338ca)",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        Alimentar ConectaBot
      </button>
    </>
  );

  return (
    <>
      <SupportDashboard
        user={user}
        searchTerm={searchTerm}
        extraHeaderActions={headerActions}
      />

      {kbOpen && (
        <div style={backdropStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>Novo conhecimento ConectaBot</h2>
              <button onClick={() => setKbOpen(false)}>×</button>
            </div>
            <form
              onSubmit={submitKnowledge}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label>
                Título
                <input
                  value={kbForm.title}
                  onChange={handleKbChange("title")}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5f5",
                  }}
                  required
                />
              </label>
              <label>
                Categoria
                <select
                  value={kbForm.category}
                  onChange={handleKbChange("category")}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5f5",
                    background: "#fff",
                  }}
                  required
                >
                  {allowedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Palavras-chave (separadas por vírgula)
                <input
                  value={kbForm.triggers}
                  onChange={handleKbChange("triggers")}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5f5",
                  }}
                />
              </label>
              <label>
                Resposta sugerida
                <textarea
                  value={kbForm.answer}
                  onChange={handleKbChange("answer")}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5f5",
                    minHeight: 140,
                  }}
                  required
                />
              </label>
              <label>
                Observações / origem
                <textarea
                  value={kbForm.notes}
                  onChange={handleKbChange("notes")}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #cbd5f5",
                    minHeight: 80,
                  }}
                />
              </label>
              {kbFeedback && (
                <p
                  style={{
                    fontSize: 13,
                    color: kbFeedback.startsWith("Falha")
                      ? "#b91c1c"
                      : "#047857",
                  }}
                >
                  {kbFeedback}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button type="button" onClick={() => setKbOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKb}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(135deg,#22c55e,#16a34a)",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {savingKb ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
            <p style={{ fontSize: 12, color: "#475569" }}>
              Categoria deve estar entre:{" "}
              {allowedCategories
                .map((cat) => CATEGORY_LABELS[cat] || cat)
                .join(", ")}
              .
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
