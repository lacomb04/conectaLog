import React from "react";
import styled, { css } from "styled-components";

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  ${({ tone }) =>
    tone === "danger" &&
    css`
      background: #ffe5e5;
      color: #8a3a3a;
      border-color: #ffd6d6;
    `}
  ${({ tone }) =>
    tone === "warning" &&
    css`
      background: #fff3e0;
      color: #8a5a2b;
      border-color: #ffe0b2;
    `}
  ${({ tone }) =>
    tone === "info" &&
    css`
      background: #e3f2fd;
      color: #2a4b7c;
      border-color: #bbdefb;
    `}
  ${({ tone }) =>
    tone === "success" &&
    css`
      background: #e8f5e9;
      color: #2f6b36;
      border-color: #c8e6c9;
    `}
  ${({ tone }) =>
    tone === "neutral" &&
    css`
      background: #f3f4f7;
      color: #3b3f47;
    `}
`;

export default function Badge({ children, tone = "neutral", ...props }) {
  return (
    <Tag tone={tone} {...props}>
      {children}
    </Tag>
  );
}
