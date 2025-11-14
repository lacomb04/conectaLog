import React from "react";
import styled, { css } from "styled-components";

const StyledButton = styled.button`
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.02s ease, background 0.2s ease, border-color 0.2s ease,
    color 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${({ variant }) =>
    variant === "primary" &&
    css`
      background: var(--primary);
      color: #ffffff;
      &:hover {
        background: var(--primary-strong);
      }
    `}
  ${({ variant }) =>
    variant === "soft" &&
    css`
      background: var(--surface-2);
      color: var(--text);
      border-color: var(--border);
      &:hover {
        background: #e4e9f5;
      }
    `}
  ${({ variant }) =>
    variant === "ghost" &&
    css`
      background: transparent;
      color: var(--muted);
      border-color: var(--border);
      &:hover {
        background: rgba(15, 23, 42, 0.06);
        color: var(--text);
      }
    `}
  ${({ size }) =>
    size === "sm" &&
    css`
      padding: 8px 12px;
      font-size: 0.9rem;
    `}
  ${({ size }) =>
    size === "lg" &&
    css`
      padding: 12px 16px;
      font-size: 1.05rem;
    `}
  &:active {
    transform: translateY(1px);
  }
`;

export default function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}) {
  return (
    <StyledButton variant={variant} size={size} {...props}>
      {children}
    </StyledButton>
  );
}
