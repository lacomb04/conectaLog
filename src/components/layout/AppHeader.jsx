import React from "react";
import styled from "styled-components";
import Button from "../ui/Button";
import { FiHome, FiLogOut, FiSearch } from "react-icons/fi";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(135deg, #0f172a 0%, #1b2742 100%);
  border-bottom: none;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
`;
const Row = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
`;
const Input = styled.input`
  border: 0;
  outline: 0;
  background: transparent;
  color: #f4f7ff;
  font-size: 0.95rem;
  ::placeholder {
    color: rgba(244, 247, 255, 0.6);
  }
`;

export default function AppHeader({
  onHome,
  onLogout,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
}) {
  return (
    <Bar>
      <div className="container">
        <Row>
          <div className="stack">
            <Button variant="soft" onClick={onHome}>
              <FiHome /> Início
            </Button>
          </div>
          <SearchWrap aria-label="Busca">
            <FiSearch color="#cbd5f5" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </SearchWrap>
          <Button variant="ghost" onClick={onLogout}>
            <FiLogOut /> Sair
          </Button>
        </Row>
      </div>
    </Bar>
  );
}
