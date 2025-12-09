import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Navbar from "./components/Navbar";
import Loading from "./components/Loading";
import { ClerkProvider } from "@clerk/clerk-react";
import ProtectedRoute from "./components/ProtectedRoute";
import OperatorDroneImagery from "./pages/operator/DroneImagery";

const Home = React.lazy(() => import("./pages/Home"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Miner = React.lazy(() => import("./pages/Miner"));
const Profile = React.lazy(() => import("./pages/Profile"));
// Operator nested pages
const OperatorLayout = React.lazy(() => import("./pages/operator/Layout"));
const OperatorMap = React.lazy(() => import("./pages/operator/Map"));
const OperatorAlerts = React.lazy(() => import("./pages/operator/Alerts"));
const OperatorTasks = React.lazy(() => import("./pages/operator/Tasks"));
const OperatorSensors = React.lazy(() => import("./pages/operator/Sensors"));
const OperatorReports = React.lazy(() => import("./pages/operator/Reports"));
const OperatorIncidents = React.lazy(() =>
  import("./pages/operator/Incidents")
);
const OperatorHubDashboard = React.lazy(() => import("./pages/operator/HubDashboard"));
// Role-specific dashboards
const AdminDashboard = React.lazy(() => import("./pages/dashboard/AdminDashboard"));
const MineControlDashboard = React.lazy(() => import("./pages/dashboard/MineControlDashboard"));
const CaveMinerDashboard = React.lazy(() => import("./pages/dashboard/CaveMinerDashboard"));

import { ThemeProvider } from "./context/ThemeContext";
import { UserProvider } from "./context/UserContext";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <UserProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Navbar />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <OperatorHubDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute roles={["system_admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/control"
                  element={
                    <ProtectedRoute roles={["operator", "system_admin"]}>
                      <MineControlDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/miner"
                  element={
                    <ProtectedRoute roles={["miner"]}>
                      <CaveMinerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["system_admin"]}>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/operator"
                  element={
                    <ProtectedRoute roles={["operator", "system_admin"]}>
                      <OperatorLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<OperatorMap />} />
                  <Route path="map" element={<OperatorMap />} />
                  
                  <Route path="alerts" element={<OperatorAlerts />} />
                  <Route path="tasks" element={<OperatorTasks />} />
                  <Route path="sensors" element={<OperatorSensors />} />
                  <Route path="drone-imagery" element={<OperatorDroneImagery />} />
                  <Route path="reports" element={<OperatorReports />} />
                  <Route path="incidents" element={<OperatorIncidents />} />
                </Route>
                <Route
                  path="/miner"
                  element={
                    <ProtectedRoute
                      roles={["miner", "operator", "system_admin"]}
                    >
                      <Miner />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </UserProvider>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
