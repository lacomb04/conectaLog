import React, { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { NavLink, useLocation } from "react-router-dom";
import Button from "../ui/Button";
import {
  FiHome,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiX,
} from "react-icons/fi";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  background: linear-gradient(135deg, #0f172a 0%, #1b2742 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
`;

const Row = styled.div`
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: #ffffff;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
`;

const Brand = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  color: inherit;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 999px;
  transition: background 0.2s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const navItemStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 500;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  &:hover {
    color: #ffffff;
  }
  &.active {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;

  a.nav-link {
    ${navItemStyles}
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

const MobileToggle = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  @media (max-width: 900px) {
    display: inline-flex;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.28);
  }
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  flex: 1 1 320px;
  max-width: 520px;
  min-width: 200px;

  @media (max-width: 900px) {
    order: 3;
    flex-basis: 100%;
    max-width: 100%;
  }
`;

const Input = styled.input`
  border: 0;
  outline: 0;
  background: transparent;
  color: #f4f7ff;
  font-size: 0.95rem;
  width: 100%;
  ::placeholder {
    color: rgba(244, 247, 255, 0.6);
  }
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  @media (max-width: 900px) {
    order: 2;
  }
`;

const MobileMenu = styled.div`
  display: none;
  @media (max-width: 900px) {
    display: ${({ $open }) => ($open ? "block" : "none")};
  }
  background: rgba(15, 23, 42, 0.98);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.28);
`;

const MobileNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 0 22px;

  a.nav-link {
    ${navItemStyles}
    width: 100%;
    justify-content: flex-start;
    background: rgba(255, 255, 255, 0.06);
    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    &.active {
      background: rgba(99, 102, 241, 0.35);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
    }
  }
`;

export default function AppHeader({
  onHome,
  onLogout,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  navLinks = [],
}) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const hasSearch = typeof onSearchChange === "function";

  const handleBrandClick = () => {
    setMenuOpen(false);
    onHome?.();
  };

  const makeNavClass = (isActive) =>
    "nav-link" + (isActive ? " active" : "");

  const handleLinkClick = (link) => {
    if (link?.onClick) link.onClick();
    setMenuOpen(false);
  };

  return (
    <Bar>
      <div className="container">
        <Row>
          <Left>
            <Brand type="button" onClick={handleBrandClick} aria-label="Início">
              <FiHome />
              <span>ConectaLog</span>
            </Brand>
            {navLinks.length > 0 && (
              <>
                <DesktopNav>
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to ?? link.label}
                      to={link.to || "#"}
                      end={link.exact ?? link.to === "/"}
                      onClick={() => handleLinkClick(link)}
                      className={({ isActive }) => makeNavClass(isActive)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </DesktopNav>
                <MobileToggle
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <FiX /> : <FiMenu />}
                </MobileToggle>
              </>
            )}
          </Left>
          {hasSearch && (
            <SearchWrap aria-label="Busca">
              <FiSearch color="#cbd5f5" />
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </SearchWrap>
          )}
          <Right>
            <Button variant="ghost" onClick={onLogout}>
              <FiLogOut /> Sair
            </Button>
          </Right>
        </Row>
      </div>
      {navLinks.length > 0 && (
        <MobileMenu $open={menuOpen}>
          <div className="container">
            <MobileNav>
              {navLinks.map((link) => (
                <NavLink
                  key={`mobile-${link.to ?? link.label}`}
                  to={link.to || "#"}
                  end={link.exact ?? link.to === "/"}
                  onClick={() => handleLinkClick(link)}
                  className={({ isActive }) => makeNavClass(isActive)}
                >
                  {link.label}
                </NavLink>
              ))}
            </MobileNav>
          </div>
        </MobileMenu>
      )}
    </Bar>
  );
}
