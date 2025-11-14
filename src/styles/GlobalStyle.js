import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  :root{
    --bg:#eef2f8;
    --surface:#ffffff;
    --surface-2:#f2f5fb;
    --text:#14213d;
    --muted:#5b6478;
    --primary:#0f172a;
    --primary-strong:#1b2742;
    --border:#d9dfec;
    --success:#d5f0e1;
    --warning:#ffe9c7;
    --danger:#ffd8d8;
    --info:#dbe8ff;

    --space-1:4px;
    --space-2:8px;
    --space-3:12px;
    --space-4:16px;
    --space-5:24px;
    --space-6:32px;
    --radius:12px;
    --shadow:0 4px 16px rgba(0,0,0,.06);
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: 'SF Pro Display', 'Inter', 'Helvetica Neue', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    background: radial-gradient(120% 120% at 50% 0%, #f7f9ff 0%, var(--bg) 100%);
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; display:block; }

  .container {
    margin: 0 auto;
    padding: 0 var(--space-4);
  }

  /* Grid utilitária para cards */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: var(--space-5);
    align-items: stretch;
    justify-items: stretch;
    width: 100%;
  }

  .page-shell {
    max-width: 100%;
    margin: 0 auto;
    width: 100%;
    padding: 0 var(--space-6) var(--space-6);
  }

  /* Títulos e textos */
  h1,h2,h3 { margin: 0 0 var(--space-4); line-height: 1.2; }
  p { margin: 0 0 var(--space-3); color: var(--muted); }

  /* Utilidades */
  .stack { display: flex; gap: var(--space-3); align-items: center; }
  .stack-between { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); }
  .section { margin: var(--space-6) 0; }
  .center-stack { display:flex; align-items:center; justify-content:center; gap:var(--space-3); flex-wrap:wrap; }
  .center-column { display:flex; flex-direction:column; align-items:center; gap:var(--space-4); }
`;

export default GlobalStyle;
