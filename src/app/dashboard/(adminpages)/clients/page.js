"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { 
  Handshake, 
  Plus, 
  Building, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Pencil, 
  Trash2, 
  X,
  User
} from "lucide-react";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states (handles both create and edit)
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [editingClient, setEditingClient] = useState(null);

  const clientsUrl = process.env.NEXT_PUBLIC_CLIENTS || 'http://localhost:8000/api/clients/';

  async function loadClients() {
    try {
      const data = await api.get(clientsUrl);
      setClients(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch clients from backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      if (!api.isAdmin()) {
        router.push("/dashboard/employee"); // Only Admins can view this page
      } else {
        loadClients();
      }
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };

    try {
      if (editingClient) {
        // Edit mode
        const updatedClient = await api.put(`${clientsUrl}${editingClient.id}/`, payload);
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c));
        setSuccess(`Client "${updatedClient.name}" updated successfully!`);
        handleCancelEdit();
      } else {
        // Create mode
        const newClient = await api.post(clientsUrl, payload);
        setClients([newClient, ...clients]);
        setSuccess(`Client "${newClient.name}" created successfully!`);
        setName("");
        setCompanyName("");
        setEmail("");
        setPhone("");
      }
      
      // Auto clear success message
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error(err);
      if (err.details && err.details.name) {
        setError("Error: A client with this name already exists.");
      } else {
        setError("Failed to save client. Please try again.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStartEdit = (client) => {
    setEditingClient(client);
    setName(client.name);
    setCompanyName(client.company_name || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setError("");
    setSuccess("");
  };

  const handleDelete = async (client) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the client "${client.name}"?\n\nWARNING: Deleting this client will automatically delete ALL meetings associated with them.`
    );
    if (!confirmDelete) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`${clientsUrl}${client.id}/`);
      setClients(clients.filter(c => c.id !== client.id));
      setSuccess(`Client "${client.name}" deleted successfully!`);
      
      if (editingClient && editingClient.id === client.id) {
        handleCancelEdit();
      }

      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      console.error(err);
      setError("Failed to delete client. Make sure you are authorized.");
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-wide">Client Directory</h2>
        <p className="text-slate-400 text-sm">Manage external organizations, customers, and partners for external meeting logging.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Form */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-sm">
          <h3 className="font-bold text-lg text-white mb-5 flex items-center space-x-2">
            {editingClient ? (
              <Pencil className="h-5 w-5 text-indigo-400" />
            ) : (
              <Plus className="h-5 w-5 text-indigo-400" />
            )}
            <span>{editingClient ? "Edit Client" : "Add New Client"}</span>
          </h3>

          {error && (
            <div className="mb-4 flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-300 text-xs">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start space-x-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-300 text-xs">
              <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Client Name / Contact Person
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Company / Organization
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@acmecorp.com"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2834"
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all duration-200"
              />
            </div>

            <div className="flex gap-3">
              {editingClient && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg active:transform active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-[2] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
              >
                {submitLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>{editingClient ? "Updating..." : "Saving..."}</span>
                  </>
                ) : (
                  <span>{editingClient ? "Update Client" : "Save Client"}</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Clients List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Active Clients ({clients.length})</h3>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center border border-slate-800 rounded-xl bg-slate-900/10">
              <div className="flex flex-col items-center space-y-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-slate-400 text-xs font-medium">Loading client directory...</p>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-center px-4">
              <Handshake className="h-10 w-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-white">No clients registered</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Add external partners, clients, or customers using the form on the left to start planning external meetings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`bg-slate-900/40 border p-5 rounded-xl transition-all duration-200 flex flex-col justify-between ${
                    editingClient && editingClient.id === client.id 
                      ? "border-indigo-500 shadow-md shadow-indigo-500/10" 
                      : "border-slate-800 hover:border-indigo-500/30"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-base truncate" title={client.name}>
                          {client.name}
                        </h4>
                        {client.company_name && (
                          <p className="text-xs text-indigo-400 flex items-center mt-0.5">
                            <Building className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{client.company_name}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleStartEdit(client)}
                          title="Edit client"
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-850 rounded-lg transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          title="Delete client"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 border-t border-slate-850/60 pt-3 text-xs text-slate-300">
                      {client.email ? (
                        <p className="flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-2 text-slate-500 flex-shrink-0" />
                          <span className="truncate" title={client.email}>{client.email}</span>
                        </p>
                      ) : (
                        <p className="flex items-center text-slate-500 italic">
                          <Mail className="h-3.5 w-3.5 mr-2 text-slate-600 flex-shrink-0" />
                          <span>No email registered</span>
                        </p>
                      )}
                      {client.phone ? (
                        <p className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-2 text-slate-500 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </p>
                      ) : (
                        <p className="flex items-center text-slate-500 italic">
                          <Phone className="h-3.5 w-3.5 mr-2 text-slate-600 flex-shrink-0" />
                          <span>No phone registered</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
