import React from "react";
import AppHeader from "./AppHeader";

export default function Layout({
  children,
  onHome,
  onLogout,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}) {
  return (
    <>
      <AppHeader
        onHome={onHome}
        onLogout={onLogout}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
      />
      <main className="container section">{children}</main>
    </>
  );
}
