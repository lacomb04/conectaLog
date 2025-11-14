import React from "react";
import styled from "styled-components";

const Base = styled.select`
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  color: var(--text);
  outline: none;
  &:focus {
    border-color: var(--primary-strong);
    box-shadow: 0 0 0 3px rgba(111, 163, 239, 0.2);
  }
`;

export default function Select(props) {
  return <Base {...props} />;
}
