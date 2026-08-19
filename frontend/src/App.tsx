import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import AddUser from "./pages/AddUser";
import ListOfUsers from "./pages/ListOfUsers";
import UserProfile from "./pages/UserProfile";
import VoteOfProblems from "./pages/VoteOfProblems";
import ProblemDetails from "./pages/ProblemDetails";
import Schemes from "./pages/Schemes";
import SchemeDetail from "./pages/SchemeDetail";
import OfficialProfile from "./pages/OfficialProfile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { official } = useAuth();
  if (!official) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/add-user" element={<ProtectedRoute><AddUser /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><ListOfUsers /></ProtectedRoute>} />
      <Route path="/users/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/problems" element={<ProtectedRoute><VoteOfProblems /></ProtectedRoute>} />
      <Route path="/problems/:problemId" element={<ProtectedRoute><ProblemDetails /></ProtectedRoute>} />
      <Route path="/schemes" element={<ProtectedRoute><Schemes /></ProtectedRoute>} />
      <Route path="/schemes/:schemeId" element={<ProtectedRoute><SchemeDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><OfficialProfile /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
