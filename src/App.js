// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";
// Bootstrap icons
import "bootstrap-icons/font/bootstrap-icons.css";

import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Latihan } from "./pages/Latihan";
import { Pengaturan } from "./pages/Pengaturan";
import { DetailSesi } from "./pages/DetailSesi";
import { NotFound } from "./pages/NotFound";
import { LiveScoring } from "./pages/LiveScoring";
import { ProtectedRoute } from "./component/ProtectedRoute";
import { ROLES } from "./services/authService";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik: Halaman Login 3 Role */}
        <Route path="/login" element={<Login />} />

        {/* Rute Terlindungi: Dashboard & Pemantauan (Semua Role Terautentikasi) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Rute Terlindungi: Sesi Latihan, Detail Sesi & Live Scoring */}
        <Route
          path="/latihan"
          element={
            <ProtectedRoute>
              <Latihan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detail-sesi"
          element={
            <ProtectedRoute>
              <DetailSesi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/latihan/detail"
          element={
            <ProtectedRoute>
              <DetailSesi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/latihan/:id"
          element={
            <ProtectedRoute>
              <DetailSesi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detail-sesi/:id"
          element={
            <ProtectedRoute>
              <DetailSesi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live-scoring"
          element={
            <ProtectedRoute>
              <LiveScoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/live-scoring/:id"
          element={
            <ProtectedRoute>
              <LiveScoring />
            </ProtectedRoute>
          }
        />

        {/* Rute Terlindungi: Pengaturan Master Data, Konektivitas & Akun (Khusus Administrator) */}
        <Route
          path="/pengaturan"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRATOR]}>
              <Pengaturan />
            </ProtectedRoute>
          }
        />

        {/* Rute Not Found */}
        <Route path="/notfound" element={<NotFound />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
