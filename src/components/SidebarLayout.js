"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FolderKanban,
  FileText,
  PlusCircle,
  LogOut,
  Menu,
  X,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Handshake,
} from "lucide-react";
import { api } from "@/lib/api";

export default function SidebarLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("Standard");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mom_sidebar_collapsed");
    if (saved !== null) setCollapsed(JSON.parse(saved));

    if (!api.isAuthenticated()) {
      router.push("/login");
    } else {
      setUsername(api.getUsername());
      setUserRole(api.getUserRole());
      setLoading(false);
    }
  }, [router]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("mom_sidebar_collapsed", JSON.stringify(!prev));
      return !prev;
    });
  };

  const handleLogout = () => {
    api.logout();
  };

  const navItems = [];
  if (userRole === "Admin") {
    navItems.push(
      { name: "Dashboard", href: "/dashboard/admin", icon: Home },
      { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { name: "Clients", href: "/dashboard/clients", icon: Handshake },
      { name: "Meetings", href: "/dashboard/meetings", icon: FileText },
      { name: "New Meeting", href: "/dashboard/meetings/new", icon: PlusCircle },
      { name: "Users", href: "/dashboard/users", icon: Users }
    );
  } else {
    navItems.push(
      { name: "Dashboard", href: "/dashboard/employee", icon: Home },
      { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { name: "Meetings", href: "/dashboard/meetings", icon: FileText },
      { name: "New Meeting", href: "/dashboard/meetings/new", icon: PlusCircle }
    );
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-400 animate-pulse font-medium">Loading Minutes of Meeting...</p>
        </div>
      </div>
    );
  }

  /* ── Shared nav list ─────────────────────────────────────────────── */
  const NavList = ({ onLinkClick }) =>
    navItems.map((item) => {
      const isActive = pathname === item.href;
      const Icon = item.icon;
      return (
        <Link
          key={item.name}
          href={item.href}
          onClick={onLinkClick}
          title={collapsed ? item.name : undefined}
          className={`flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative
            ${collapsed ? "justify-center px-0 py-3 mx-2" : "space-x-3 px-4 py-3"}
            ${isActive
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {/* Label — hidden when collapsed */}
          {!collapsed && <span>{item.name}</span>}
          {/* Tooltip when collapsed */}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-white text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl">
              {item.name}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{ transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)" }}
        className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 flex-shrink-0 relative
          ${collapsed ? "w-16" : "w-64"}`}
      >
        {/* Logo / Brand */}
        <div className="relative flex items-center h-20 border-b border-slate-800 px-4">
          <div
            className={`flex items-center transition-all duration-300 ${collapsed ? "justify-center w-full" : "space-x-3"
              }`}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-cover"
              />
            </div>

            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-lg leading-tight text-white whitespace-nowrap">
                  MOM Manager
                </h1>
                <span className="text-xs text-indigo-400 font-medium tracking-wide">
                  Internal Workspace
                </span>
              </div>
            )}
          </div>

          {/* Floating Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-2 top-[90%] z-50 text-slate-400 hover:text-white transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* User profile */}
        <div className={`flex items-center border-b border-slate-850 bg-slate-900/50
          ${collapsed ? "justify-center px-0 py-4" : "space-x-3 px-6 py-4"}`}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
            <User className="h-5 w-5 text-indigo-400" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{username || "User"}</p>
              <p className="text-xs text-slate-400 truncate">
                {userRole === "Admin" ? "Administrator" : "Standard User"}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? "px-0" : "px-4"}`}>
          <NavList />
        </nav>

        {/* Logout */}
        <div className={`border-t border-slate-800 ${collapsed ? "p-2" : "p-4"}`}>
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200
              ${collapsed ? "justify-center px-0 py-3" : "space-x-3 px-4 py-3"}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

      </aside>

      {/* ── Mobile Drawer overlay ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 transform md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-6 h-20 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border border-slate-800">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-bold text-lg text-white">MOM Manager</h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <User className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{username}</p>
            <p className="text-xs text-slate-400 font-medium">
              {userRole === "Admin" ? "Administrator" : "Standard User"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <NavList onLinkClick={() => setMobileOpen(false)} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-30">
          <div className="flex items-center space-x-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {navItems.find((i) => i.href === pathname)?.name || "MOM Workspace"}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-slate-400 font-medium">Logged in as</span>
              <span className="text-sm font-semibold text-indigo-400">{username}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <User className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
