import React from "react";
import AppHeader from "./AppHeader";

export default function Layout({
  children,
  onHome,
  onLogout,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  navLinks = [],
}) {
  return (
    <>
      <AppHeader
        onHome={onHome}
        onLogout={onLogout}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        navLinks={navLinks}
      />
      <main className="container section">{children}</main>
    </>
  );
}
