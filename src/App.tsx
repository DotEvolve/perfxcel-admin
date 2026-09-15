import { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, Navigate, Outlet } from "react-router-dom";
import CourseForm from "./components/CourseForm";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Login } from "./pages/Login";
import Interests from "./pages/Interests";
import Enrollments from "./pages/Enrollments";
import { CoursesList } from "./pages/CoursesList";
import Dashboard from "./pages/Dashboard";
import Taxonomies from "./pages/Taxonomies";
import AuditLogs from "./pages/AuditLogs";
import Enquiries from "./pages/Enquiries";

function AuthGuard({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Layout() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <img
            src="/logo.png"
            alt="PerfXcel Logo"
            className="h-8 w-8 mr-3 object-contain"
          />
          <h1 className="text-xl font-semibold tracking-tight text-indigo-600">
            PerfXcel Admin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Dashboard
          </Link>
          <Link to="/courses" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Courses
          </Link>
          <Link to="/taxonomies" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Taxonomies
          </Link>
          <Link to="/interests" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Interests
          </Link>
          <Link to="/enquiries" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Enquiries
          </Link>
          <Link to="/enrollments" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Enrollments
          </Link>
          <Link to="/audit-logs" className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100">
            Audit Logs
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm">
          <h2 className="text-lg font-medium">Administration</h2>
          <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<AuthGuard session={session}><Layout /></AuthGuard>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses" element={<CoursesList />} />
        <Route path="/courses/new" element={<CourseForm />} />
        <Route path="/courses/:id/edit" element={<CourseForm />} />
        <Route path="/taxonomies" element={<Taxonomies />} />
        <Route path="/interests" element={<Interests />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/enrollments" element={<Enrollments />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
