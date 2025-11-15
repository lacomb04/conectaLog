import React from "react";
import SupportDashboard from "./SupportDashboard";

interface AdminTicketsProps {
  user: any;
  searchTerm?: string;
}

const AdminTickets: React.FC<AdminTicketsProps> = ({ user, searchTerm = "" }) => {
  return <SupportDashboard user={user} searchTerm={searchTerm} />;
};

export default AdminTickets;
