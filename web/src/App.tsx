import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { EmployeePage } from "@/pages/EmployeePage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DirectoryPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees/:employeeId" element={<EmployeePage />} />
      </Routes>
    </Layout>
  );
}
