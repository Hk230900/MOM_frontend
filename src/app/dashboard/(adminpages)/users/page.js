"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX,
  AlertCircle, 
  CheckCircle2, 
  X,
  Shield,
  User as UserIcon,
  Mail,
  KeyRound,
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal Control States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for "Add", user object for "Edit"
  const [userToDelete, setUserToDelete] = useState(null);

  // Form Fields
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmailId, setFormEmailId] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("Standard");
  const [formActive, setFormActive] = useState("Active");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function loadUsers() {
    try {
      const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
      const data = await api.get(usersUrl);
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch users directory from database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      if (!api.isAdmin()) {
        router.push("/dashboard/employee"); // Only Admins can view this page
      } else {
        loadUsers();
      }
    }
  }, [router]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormFirstName("");
    setFormLastName("");
    setFormEmailId("");
    setFormPassword("");
    setFormRole("Standard");
    setFormActive("Active");
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormFirstName(user.first_name || "");
    setFormLastName(user.last_name || "");
    setFormEmailId(user.emailid || "");
    setFormPassword(""); // Leave password blank on edit unless changing
    setFormRole(user.role || "Standard");
    setFormActive(user.active || "Active");
    setShowPassword(false);
    setError("");
    setModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    if (user.emailid === api.getUsername() || user.emailid === "admin@example.com") {
      setError("You cannot disable your own active account.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newActiveStatus = user.active === "Active" ? "Inactive" : "Active";
    try {
      const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
      const updatedUser = await api.put(`${usersUrl}${user.id}/`, {
        first_name: user.first_name,
        last_name: user.last_name,
        emailid: user.emailid,
        role: user.role,
        active: newActiveStatus
      });

      // Update state
      setUsers(users.map(u => u.id === user.id ? { ...u, active: updatedUser.active } : u));
      setSuccess(`Account status for ${user.emailid} changed to ${newActiveStatus}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to change user status.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteUser = (user) => {
    if (user.emailid === api.getUsername() || user.emailid === "admin@example.com") {
      setError("You cannot delete your own logged-in account.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const user = userToDelete;
    setUserToDelete(null);

    try {
      const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
      await api.delete(`${usersUrl}${user.id}/`);
      setUsers(users.filter(u => u.id !== user.id));
      setSuccess(`User "${user.emailid}" deleted successfully.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to delete user account.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim() || !formEmailId.trim()) return;

    setSubmitLoading(true);
    setError("");

    const payload = {
      first_name: formFirstName.trim(),
      last_name: formLastName.trim(),
      emailid: formEmailId.trim(),
      role: formRole,
      active: formActive
    };

    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }

    try {
      if (editingUser) {
        // Edit Action
        const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
        const updated = await api.put(`${usersUrl}${editingUser.id}/`, payload);
        setSuccess(`User "${updated.emailid}" updated successfully!`);
        setModalOpen(false);
        loadUsers();
      } else {
        // Add Action
        if (!formPassword.trim()) {
          setError("Password is required for new accounts.");
          setSubmitLoading(false);
          return;
        }
        const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';
        const created = await api.post(usersUrl, payload);
        setSuccess(`User "${created.emailid}" created successfully!`);
        setModalOpen(false);
        loadUsers();
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      if (err.details) {
        const key = Object.keys(err.details)[0];
        setError(`Validation Error: ${key} - ${err.details[key]}`);
      } else {
        setError("Failed to save user account. Make sure emailid is unique.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Loading users directory...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">User Management</h2>
          <p className="text-slate-400 text-sm mt-1">Add, edit, disable, or delete team members and assign roles.</p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Users directory list table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-x-auto shadow-2xl backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Full Name</th>
              <th className="py-4 px-6">Email (Username)</th>
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Last Login</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-sm text-slate-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-900/35 transition-colors">
                {/* User avatar and name */}
                <td className="py-4 px-6 flex items-center space-x-3.5">
                  <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {user.first_name ? user.first_name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <span className="block font-bold text-white leading-tight">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                </td>

                {/* Email (Username) */}
                <td className="py-4 px-6 text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span>{user.emailid}</span>
                  </div>
                </td>

                {/* Role */}
                <td className="py-4 px-6">
                  {user.role === "Admin" ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">
                      <Shield className="h-3 w-3" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                      <UserIcon className="h-3 w-3" />
                      <span>Standard</span>
                    </span>
                  )}
                </td>

                {/* Status active/inactive */}
                <td className="py-4 px-6">
                  {user.active === "Active" ? (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 border border-slate-750 text-slate-500 rounded">
                      Inactive
                    </span>
                  )}
                </td>

                {/* Last login Date / Time */}
                <td className="py-4 px-6 text-slate-400 text-xs">
                  {user.last_login_date ? (
                    <div>
                      <span className="block font-medium text-slate-300 flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{user.last_login_date}</span>
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1 pl-4.5">{user.last_login_time}</span>
                    </div>
                  ) : (
                    <span className="text-slate-600 italic">Never logged in</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-4 px-6 text-right space-x-1">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(user)}
                    disabled={user.emailid === api.getUsername() || user.emailid === "admin@example.com"}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.active === "Active"
                        ? 'text-amber-400 hover:bg-amber-500/10' 
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    } disabled:opacity-30`}
                    title={user.active === "Active" ? 'Disable Account' : 'Enable Account'}
                  >
                    {user.active === "Active" ? <UserX className="h-4.5 w-4.5" /> : <UserCheck className="h-4.5 w-4.5" />}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    title="Edit Details"
                  >
                    <Edit2 className="h-4.5 w-4.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.emailid === api.getUsername() || user.emailid === "admin@example.com"}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-30"
                    title="Delete Account"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-7 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <Users className="h-5.5 w-5.5 text-indigo-400" />
              <span>{editingUser ? "Edit User Account" : "Add User Account"}</span>
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email/Username Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address (Username)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="email"
                    value={formEmailId}
                    onChange={(e) => setFormEmailId(e.target.value)}
                    disabled={!!editingUser} // Prevent editing username on existing account
                    placeholder="johndoe@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                  <span>Password</span>
                  {editingUser && <span className="text-[10px] text-slate-500 normal-case">Leave blank to keep current password</span>}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? "••••••••" : "Enter password"}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-indigo-400 transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Role selection & Active selection row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    System Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  >
                    <option value="Standard">Standard User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <select
                    value={formActive}
                    onChange={(e) => setFormActive(e.target.value)}
                    disabled={editingUser && (editingUser.emailid === api.getUsername() || editingUser.emailid === "admin@example.com")}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all disabled:opacity-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions submit/cancel */}
              <div className="flex space-x-3.5 pt-4 border-t border-slate-850">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 text-sm"
                >
                  {submitLoading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Save Account</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {userToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative animate-scale-up mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Delete User Account</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Are you sure you want to delete the user account <strong className="text-white">"{userToDelete.emailid}"</strong>? This action is permanent and will cascade-delete all linked credentials.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-rose-500/15"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
