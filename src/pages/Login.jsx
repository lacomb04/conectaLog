import React, { useState } from "react";
import supabase from "../../supabaseClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    setLoading(false);
    if (error || !data) setErro("Usuário não encontrado");
    else onLogin(data);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        background:
          "linear-gradient(160deg, #f4f6fb 0%, #ffffff 40%, #f1f3f8 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(31, 41, 55, 0.1)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            padding: "48px 32px 32px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.4rem",
            }}
          >
            CL
          </div>
        </div>
        <Card
          style={{
            border: "none",
            borderRadius: 0,
            padding: "40px 36px 48px",
          }}
        >
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "var(--space-2)",
            }}
          >
            ConectaLog
          </h1>
          <p
            style={{
              textAlign: "center",
              color: "var(--muted)",
              marginBottom: "var(--space-5)",
            }}
          >
            Acesse com seu e-mail corporativo para gerenciar chamados.
          </p>
          <form
            onSubmit={handleLogin}
            className="center-column"
            style={{ alignItems: "stretch", gap: "var(--space-3)" }}
          >
            <Input
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                borderRadius: 18,
                padding: "14px 18px",
                fontSize: "1rem",
              }}
            />
            <Button
              type="submit"
              disabled={loading}
              style={{
                borderRadius: 18,
                padding: "14px 0",
                fontSize: "1.05rem",
                background: "#0f172a",
                color: "#fff",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            {erro && (
              <p
                style={{
                  color: "#d93025",
                  textAlign: "center",
                  marginTop: "var(--space-2)",
                }}
              >
                {erro}
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
