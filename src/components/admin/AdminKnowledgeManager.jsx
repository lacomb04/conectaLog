import React, { useEffect, useState } from "react";
import supabase from "../../../supabaseClient";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { Input, TextArea } from "../ui/Input";
import Select from "../ui/Select";
import Badge from "../ui/Badge";

const categories = [
  { value: "institucional", label: "Institucional" },
  { value: "procedimentos", label: "Procedimentos" },
  { value: "faq", label: "FAQ" },
  { value: "servicos", label: "Serviços" },
];

export default function AdminKnowledgeManager({ user }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: categories[0].value,
    content: "",
  });

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar base IA:", error);
      setEntries([]);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      created_by: user?.id || null,
    };
    const { error } = await supabase.from("ai_knowledge_base").insert(payload);
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar conhecimento:", error);
      return;
    }
    setForm({ title: "", category: categories[0].value, content: "" });
    await loadEntries();
  }

  async function handleDelete(id) {
    const { error } = await supabase
      .from("ai_knowledge_base")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Erro ao remover conhecimento:", error);
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <Card style={{ marginTop: "var(--space-5)" }}>
      <div className="stack-between">
        <h3 style={{ margin: 0 }}>Base de conhecimento da IA</h3>
        <Badge tone="info">{entries.length}</Badge>
      </div>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-3)" }}>
        Cadastre informações estratégicas para treinar o ConectaBot.
      </p>
      <form
        onSubmit={handleSubmit}
        className="stack"
        style={{ flexDirection: "column", gap: "var(--space-3)" }}
      >
        <Input
          placeholder="Título"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          required
        />
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          <Select
            value={form.category}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, category: e.target.value }))
            }
            style={{ maxWidth: 240 }}
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
        <TextArea
          rows={6}
          placeholder="Conteúdo detalhado (markdown opcional)"
          value={form.content}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, content: e.target.value }))
          }
          required
        />
      </form>
      <div
        className="stack"
        style={{
          flexDirection: "column",
          gap: "var(--space-3)",
          marginTop: "var(--space-4)",
        }}
      >
        {loading ? (
          <p>Carregando registros...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            Nenhum conhecimento cadastrado ainda.
          </p>
        ) : (
          entries.map((entry) => (
            <Card
              key={entry.id}
              style={{
                padding: "var(--space-3)",
                borderRadius: "20px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="stack-between"
                style={{ alignItems: "flex-start" }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>{entry.title}</h4>
                  <small style={{ color: "var(--muted)" }}>
                    {entry.category} •{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </small>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entry.id)}
                  style={{ color: "#ef4444" }}
                >
                  Remover
                </Button>
              </div>
              <p style={{ marginTop: "var(--space-3)", whiteSpace: "pre-wrap" }}>
                {entry.content}
              </p>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
}
