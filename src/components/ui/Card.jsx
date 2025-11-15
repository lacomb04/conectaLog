import React from "react";
import styled from "styled-components";

const Wrap = styled.div`
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: var(--space-5);
`;
export default function Card({ children, style = undefined }) {
  return <Wrap style={style}>{children}</Wrap>;
}
