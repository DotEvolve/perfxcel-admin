import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import CourseForm from "./components/CourseForm";
import { supabase } from "./lib/supabase";
import auditLogger from "./lib/audit";
import type { Session } from "@supabase/supabase-js";
import { Login } from "./pages/Login";
import Interests from "./pages/Interests";
import Enrollments from "./pages/Enrollments";
import { CoursesList } from "./pages/CoursesList";
import Dashboard from "./pages/Dashboard";
import Taxonomies from "./pages/Taxonomies";
import AuditLogs from "./pages/AuditLogs";
import Enquiries from "./pages/Enquiries";
import TrainingPlanRequests from "./pages/TrainingPlanRequests";
import { ResetPassword } from "./pages/ResetPassword";
import Settings from "./pages/Settings";

/**
 * Returns true if the session's JWT app_metadata grants access to the
 * 'perfxcel' app. The portal's buildAndWrite() populates activeAppAccess
 * with the app slugs assigned to the user for their active tenant.
 * This is the same signal that drives app-card visibility in the portal —
 * no extra HTTP call required.
 */
function hasPerfxcelAccess(session: Session): boolean {
  const meta = session.user.app_metadata as {
    activeAppAccess?: string[];
    role?: string;
  };
  // Super-admins always have access
  if (meta?.role === "super-admin") return true;
  // Regular users must have 'perfxcel' in their active app access list
  return Array.isArray(meta?.activeAppAccess) &&
    meta.activeAppAccess.includes("perfxcel");
}

function AuthGuard({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// ...

function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => {
    const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleLogout = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const u = session.user;
      const tenantId = u.app_metadata?.activeTenantId;
      if (tenantId) {
        auditLogger.track({
          tenantId: tenantId,
          action: "USER_LOGOUT",
          actorId: u.id,
          actorType: "user",
          details: { email: u.email },
          timestamp: new Date().toISOString(),
        });
        if (typeof (auditLogger as any).flush === "function") {
          await (auditLogger as any).flush();
        }
      }
    }
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
        <nav className="flex-1 p-4 space-y-1">
          {navLink("/", "Dashboard")}
          {navLink("/courses", "Courses")}
          {navLink("/taxonomies", "Taxonomies")}
          {navLink("/interests", "Interests")}
          {navLink("/training-plans", "Training Plans")}
          {navLink("/enquiries", "Enquiries")}
          {navLink("/enrollments", "Enrollments")}
          {navLink("/audit-logs", "Audit Logs")}
          {navLink("/settings", "Settings")}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-8 shadow-sm">
          <h2 className="text-lg font-medium">Administration</h2>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check access via the JWT claim that the portal populates via buildAndWrite().
        // activeAppAccess is the authoritative list of app slugs the user can access
        // for their active tenant — the same claim that drives app-card visibility in
        // the portal. No extra HTTP call needed.
        const hasAccess = hasPerfxcelAccess(session);
        if (hasAccess) {
          setSession(session);
        } else {
          await supabase.auth.signOut();
          setSession(null);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-evaluate access on every auth state change (token refresh, sign-in, etc.)
      if (session && !hasPerfxcelAccess(session)) {
        supabase.auth.signOut();
        return;
      }
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
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <AuthGuard session={session}>
            <Layout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses" element={<CoursesList />} />
        <Route path="/courses/new" element={<CourseForm />} />
        <Route path="/courses/:id/edit" element={<CourseForm />} />
        <Route path="/taxonomies" element={<Taxonomies />} />
        <Route path="/interests" element={<Interests />} />
        <Route path="/training-plans" element={<TrainingPlanRequests />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/enrollments" element={<Enrollments />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
