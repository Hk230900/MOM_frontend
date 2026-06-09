"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SidebarLayout from "@/components/SidebarLayout";
import { api } from "@/lib/api";
import { 
  Cable, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  Globe,
  Settings,
  HelpCircle,
  Copy,
  Check,
  Play,
  RotateCw,
  RefreshCw,
  FolderKanban,
  Activity
} from "lucide-react";

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI State Control
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null); // null for new, integration object for edit
  const [integrationToDelete, setIntegrationToDelete] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState("webhook"); // webhook vs service_account for guide
  const [actionLoading, setActionLoading] = useState({}); // tracking per-integration sync/test loaders

  // Form Fields
  const [formProject, setFormProject] = useState("");
  const [formType, setFormType] = useState("webhook");
  const [formWebhookUrl, setFormWebhookUrl] = useState("");
  const [formSpreadsheetId, setFormSpreadsheetId] = useState("");
  const [formSheetName, setFormSheetName] = useState("Meetings");
  const [formCredentialsJson, setFormCredentialsJson] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Google Apps Script source code snippet
  const appsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Define exact headers requested
    var headers = ["Date", "Day", "Meeting Title", "Mom details", "Assigned Task", "Per task status", "Meeting ID", "Task Index"];
    
    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      if (firstRow[0] !== "Date") {
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
    
    var meetingId = data.meeting_id;
    
    // 1. Unmerge columns A-D (1 to 4) before clearing/sorting to prevent Sheets errors
    var lastRowBefore = sheet.getLastRow();
    if (lastRowBefore > 1) {
      sheet.getRange(2, 1, lastRowBefore - 1, 4).breakApart();
    }
    
    // 2. Clear out previous rows for this meeting ID (G is Column 7)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var meetingIds = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
      for (var i = meetingIds.length - 1; i >= 0; i--) {
        if (meetingIds[i][0] == meetingId) {
          sheet.deleteRow(i + 2); // +2 because of 0-indexed array + header row
        }
      }
    }
    
    // 3. Format and write new rows
    var rowsToAdd = [];
    var actionItems = data.action_items || [];
    
    if (actionItems.length === 0) {
      // If no tasks, add one row with task fields empty
      rowsToAdd.push([
        data.date,
        data.day,
        data.title,
        data.mom_details,
        "", // Assigned Task
        "Pending", // Default status is Pending
        meetingId,
        -1  // Task Index helper
      ]);
    } else {
      for (var j = 0; j < actionItems.length; j++) {
        var item = actionItems[j];
        var taskDesc = item.task || "";
        if (item.assignee) {
          taskDesc += " (" + item.assignee + ")";
        }
        var taskStatus = item.completed ? "Completed" : "Pending";
        
        rowsToAdd.push([
          data.date,
          data.day,
          data.title,
          data.mom_details,
          taskDesc,
          taskStatus,
          meetingId,
          j
        ]);
      }
    }
    
    // Append the computed rows
    for (var k = 0; k < rowsToAdd.length; k++) {
      sheet.appendRow(rowsToAdd[k]);
    }
    
    // 4. Sort chronologically by Date (Column A) and Merge matching rows
    var lastRowAfter = sheet.getLastRow();
    if (lastRowAfter > 1) {
      // Sort range: rows 2 to lastRow, columns 1 to 8, sorted by Column A (Date) ascending
      sheet.getRange(2, 1, lastRowAfter - 1, 8).sort({column: 1, ascending: true});
      
      // Re-merge vertically for duplicate meeting details (Columns A-D)
      var values = sheet.getRange(2, 7, lastRowAfter - 1, 1).getValues();
      var startRow = 2;
      var currentMeetingId = values[0][0];
      var runLength = 1;
      
      for (var r = 1; r < values.length; r++) {
        var rowMeetingId = values[r][0];
        if (rowMeetingId === currentMeetingId && rowMeetingId !== "") {
          runLength++;
        } else {
          if (runLength > 1) {
            sheet.getRange(startRow, 1, runLength, 1).mergeVertically();
            sheet.getRange(startRow, 2, runLength, 1).mergeVertically();
            sheet.getRange(startRow, 3, runLength, 1).mergeVertically();
            sheet.getRange(startRow, 4, runLength, 1).mergeVertically();
          }
          startRow = r + 2; // +2 for 0-index offset + header row
          currentMeetingId = rowMeetingId;
          runLength = 1;
        }
      }
      // Merge the final group
      if (runLength > 1) {
        sheet.getRange(startRow, 1, runLength, 1).mergeVertically();
        sheet.getRange(startRow, 2, runLength, 1).mergeVertically();
        sheet.getRange(startRow, 3, runLength, 1).mergeVertically();
        sheet.getRange(startRow, 4, runLength, 1).mergeVertically();
      }
      
      // Center-align vertically all cells in columns A-D
      sheet.getRange(2, 1, lastRowAfter - 1, 4).setVerticalAlignment("middle");
      
      // 5. Configure dropdown validation to Column F (Per task status)
      var validationRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Completed", "Pending"], true)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(2, 6, lastRowAfter - 1, 1).setDataValidation(validationRule);
      
      // 6. Apply conditional formatting rules (Green for Completed, Yellow for Pending)
      sheet.clearConditionalFormatRules();
      
      var completedRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("Completed")
        .setBackground("#D1FAE5") // Light Green
        .setFontColor("#065F46")  // Dark Green Text
        .setRanges([sheet.getRange("F2:F")])
        .build();
        
      var pendingRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("Pending")
        .setBackground("#FEF3C7") // Light Yellow
        .setFontColor("#92400E")  // Dark Yellow Text
        .setRanges([sheet.getRange("F2:F")])
        .build();
        
      var rules = sheet.getConditionalFormatRules();
      rules.push(completedRule);
      rules.push(pendingRule);
      sheet.setConditionalFormatRules(rules);
    }
    
    // 7. Auto-hide helper columns G (7) and H (8) from user view
    sheet.hideColumns(7, 2);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "MOM Sync Successful" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  async function loadData() {
    try {
      const integrationsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_INTEGRATIONS || "http://localhost:8000/api/google-sheet-integrations/";
      const projectsUrl = process.env.NEXT_PUBLIC_PROJECTS || "http://localhost:8000/api/projects/";
      const usersUrl = process.env.NEXT_PUBLIC_USERS || 'http://localhost:8000/api/users/';

      const [integrationsData, projectsData, usersData] = await Promise.all([
        api.get(integrationsUrl),
        api.get(projectsUrl),
        api.get(usersUrl)
      ]);

      setIntegrations(integrationsData);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
      setError("Failed to load integrations settings. Please check your backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api.isAuthenticated()) {
      if (!api.isAdmin()) {
        router.push("/dashboard/employee");
      } else {
        loadData();
      }
    }
  }, [router]);

  const copyAppsScript = () => {
    navigator.clipboard.writeText(appsScriptCode).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    });
  };

  const openAddModal = () => {
    setEditingIntegration(null);
    setFormProject("");
    setFormType("webhook");
    setFormWebhookUrl("");
    setFormSpreadsheetId("");
    setFormSheetName("Meetings");
    setFormCredentialsJson("");
    setFormIsActive(true);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (integration) => {
    setEditingIntegration(integration);
    setFormProject(integration.project);
    setFormType(integration.integration_type);
    setFormWebhookUrl(integration.webhook_url || "");
    setFormSpreadsheetId(integration.spreadsheet_id || "");
    setFormSheetName(integration.sheet_name || "Meetings");
    setFormCredentialsJson(""); // Kept write-only and hidden
    setFormIsActive(integration.is_active);
    setError("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formProject) {
      setError("Please select a project.");
      return;
    }
    if (formType === "webhook" && !formWebhookUrl) {
      setError("Webhook URL is required.");
      return;
    }
    if (formType === "service_account") {
      if (!formSpreadsheetId) {
        setError("Spreadsheet ID is required.");
        return;
      }
      if (!editingIntegration && !formCredentialsJson) {
        setError("Service Account credentials JSON is required for new integrations.");
        return;
      }
    }

    setSubmitLoading(true);
    setError("");

    const payload = {
      project: parseInt(formProject),
      integration_type: formType,
      is_active: formIsActive
    };

    if (formType === "webhook") {
      payload.webhook_url = formWebhookUrl.trim();
      payload.spreadsheet_id = null;
      payload.sheet_name = null;
      payload.credentials_json = null;
    } else {
      payload.webhook_url = null;
      payload.spreadsheet_id = formSpreadsheetId.trim();
      payload.sheet_name = formSheetName.trim() || "Meetings";
      if (formCredentialsJson.trim()) {
        payload.credentials_json = formCredentialsJson.trim();
      }
    }

    try {
      const integrationsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_INTEGRATIONS || "http://localhost:8000/api/google-sheet-integrations/";
      if (editingIntegration) {
        const res = await api.put(`${integrationsUrl}${editingIntegration.id}/`, payload);
        setSuccess(`Integration for "${res.project_name}" updated successfully!`);
      } else {
        const res = await api.post(integrationsUrl, payload);
        setSuccess(`Google Sheets integration created for project "${res.project_name}"!`);
      }
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      if (err.details) {
        const key = Object.keys(err.details)[0];
        setError(`Error: ${key} - ${err.details[key]}`);
      } else {
        setError("Failed to save integration. A project can only have one Google Sheets sync.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTestIntegration = async (id, name) => {
    setActionLoading(prev => ({ ...prev, [`test-${id}`]: true }));
    setError("");
    setSuccess("");
    try {
      const integrationsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_INTEGRATIONS || "http://localhost:8000/api/google-sheet-integrations/";
      const res = await api.post(`${integrationsUrl}${id}/test_integration/`);
      setSuccess(`Test Row successfully pushed for project "${name}"! Check your Google Sheet.`);
      loadData();
    } catch (err) {
      console.error(err);
      setError(`Test sync failed for "${name}": ${err.message || "Request timed out"}`);
      loadData();
    } finally {
      setActionLoading(prev => ({ ...prev, [`test-${id}`]: false }));
    }
  };

  const handleSyncMeetings = async (id, name) => {
    setActionLoading(prev => ({ ...prev, [`sync-${id}`]: true }));
    setError("");
    setSuccess("");
    try {
      const integrationsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_INTEGRATIONS || "http://localhost:8000/api/google-sheet-integrations/";
      const res = await api.post(`${integrationsUrl}${id}/sync_meetings/`);
      setSuccess(res.message || `Historical sync kicked off for "${name}"!`);
      loadData();
    } catch (err) {
      console.error(err);
      setError(`Historical sync failed: ${err.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`sync-${id}`]: false }));
    }
  };

  const handleDeleteIntegration = (integration) => {
    setIntegrationToDelete(integration);
  };

  const confirmDeleteIntegration = async () => {
    if (!integrationToDelete) return;
    const item = integrationToDelete;
    setIntegrationToDelete(null);
    try {
      const integrationsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_INTEGRATIONS || "http://localhost:8000/api/google-sheet-integrations/";
      await api.delete(`${integrationsUrl}${item.id}/`);
      setSuccess(`Integration deleted successfully.`);
      loadData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to delete integration.");
    }
  };

  const getSyncStatusBadge = (status) => {
    if (!status) return <span className="text-slate-500 italic text-xs">Never Synced</span>;
    if (status === "Success") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Success</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-md" title="Hover/Edit for error details">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
        <span>Failed</span>
      </span>
    );
  };

  // Filter project dropdown options (only projects that don't have integrations yet, unless editing)
  const loggedInUsername = api.getUsername();
  const isMasterAdmin = loggedInUsername === 'harshadabk2309@gmail.com';
  const currentUser = users.find(u => u.emailid === loggedInUsername);
  const userOrg = currentUser?.organization || 'iSyra';
  
  const selectableProjects = projects
    .filter(p => isMasterAdmin || p.organization === userOrg)
    .filter(p => {
      if (editingIntegration && p.id === editingIntegration.project) return true;
      return !integrations.some(i => i.project === p.id);
    });

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-slate-400 font-medium">Loading Google Drive integrations...</p>
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
          <h2 className="text-2xl font-bold text-white tracking-wide">Sheets Integration</h2>
          <p className="text-slate-400 text-sm mt-1">Connect your meeting categories to Google Sheets on Google Drive to sync minutes automatically.</p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-500/25 active:transform active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Connect Sheet</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-2.5 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Connected Channels List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.length === 0 ? (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-14 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
            <FileSpreadsheet className="h-12 w-12 text-slate-700 mb-4" />
            <h4 className="text-base font-bold text-white">No Sheets Connected</h4>
            <p className="text-slate-400 text-xs text-center mt-1.5 max-w-sm">
              Connect your meeting logs to a Google Sheet so your transcripts, agendas, and action item tasks automatically export in real-time.
            </p>
            <button
              onClick={openAddModal}
              className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs mt-4 hover:underline cursor-pointer"
            >
              Add your first sheet connection
            </button>
          </div>
        ) : (
          integrations.map((item) => (
            <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden flex flex-col justify-between group hover:border-slate-700/80 transition-all duration-250">
              
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {item.project_name}
                    </span>
                    <h4 className="text-lg font-bold text-white flex items-center space-x-2 mt-2">
                      <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                      <span className="truncate max-w-[200px]">{item.project_name} Logs</span>
                    </h4>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex flex-col items-end space-y-1.5">
                    {item.is_active ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-800 border border-slate-750 px-2 py-0.5 rounded">Paused</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.integration_type === 'webhook' ? 'Apps Script Webhook' : 'Service Account'}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="mt-5 space-y-2 border-t border-slate-850 pt-4 text-xs text-slate-350">
                  {item.integration_type === 'webhook' ? (
                    <div className="flex items-start space-x-2 min-w-0">
                      <Globe className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="truncate break-all block" title={item.webhook_url}>
                        <strong className="text-slate-400">Webhook URL:</strong> {item.webhook_url}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-slate-500" />
                        <span className="truncate">
                          <strong className="text-slate-400">Spreadsheet ID:</strong> {item.spreadsheet_id?.slice(0, 10)}...
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                        <span>
                          <strong className="text-slate-400">Sheet Tab Name:</strong> "{item.sheet_name}"
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between border-t border-slate-850/50 pt-2.5 mt-2">
                    <span className="text-slate-400">Last Status:</span>
                    <span>{getSyncStatusBadge(item.last_sync_status)}</span>
                  </div>

                  {item.last_sync_at && (
                    <div className="flex items-center justify-between text-[11px] text-slate-450">
                      <span>Last Synced:</span>
                      <span>{new Date(item.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}

                  {item.last_sync_status === "Failed" && item.last_sync_error && (
                    <div className="bg-rose-500/10 border border-rose-500/15 p-2 rounded-lg text-rose-300 text-[10px] mt-2 leading-relaxed max-h-16 overflow-y-auto font-mono">
                      <strong>Error:</strong> {item.last_sync_error}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-6 border-t border-slate-850 pt-4 flex flex-wrap gap-2.5 justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestIntegration(item.id, item.project_name)}
                    disabled={actionLoading[`test-${item.id}`] || actionLoading[`sync-${item.id}`] || !item.is_active}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    title="Sends a dummy row to test spreadsheet connection"
                  >
                    {actionLoading[`test-${item.id}`] ? (
                      <RotateCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span>Test Sync</span>
                  </button>

                  <button
                    onClick={() => handleSyncMeetings(item.id, item.project_name)}
                    disabled={actionLoading[`test-${item.id}`] || actionLoading[`sync-${item.id}`] || !item.is_active}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-purple-600 disabled:opacity-40 disabled:hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                    title="Synchronizes all historical meetings of this project to the spreadsheet"
                  >
                    {actionLoading[`sync-${item.id}`] ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                    <span>Sync History</span>
                  </button>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    title="Edit Connection Settings"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteIntegration(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Disconnect Integration"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Guide Instruction Area */}
      <div className="bg-slate-900/35 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-5">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-850">
          <HelpCircle className="h-5.5 w-5.5 text-indigo-400" />
          <h3 className="font-bold text-white text-base">Setup Guides & Script</h3>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("webhook")}
            className={`py-2 px-4 border-b-2 font-bold text-xs transition-all ${
              activeTab === "webhook" 
                ? "border-indigo-500 text-white bg-indigo-500/5" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            } cursor-pointer`}
          >
            Google Apps Script Webhook (Recommended)
          </button>
          <button
            onClick={() => setActiveTab("service_account")}
            className={`py-2 px-4 border-b-2 font-bold text-xs transition-all ${
              activeTab === "service_account" 
                ? "border-indigo-500 text-white bg-indigo-500/5" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            } cursor-pointer`}
          >
            Service Account API
          </button>
        </div>

        {activeTab === "webhook" ? (
          <div className="space-y-4 text-xs text-slate-350 leading-relaxed animate-fade-in">
            <p>
              The <strong>Google Apps Script Webhook</strong> method is extremely easy to set up. It uses a small, secure, custom script inside your Google Sheet that receives HTTP requests from the MOM dashboard and writes/updates meeting details.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2.5">
                <h4 className="font-bold text-white text-xs">Steps to deploy:</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open your target Google Sheet: <a href="https://docs.google.com/spreadsheets/d/1BAVs8A_LuarUuyiR-yxfMKMfCLG94Z70ub1VgfDtVfM/edit" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">SuccessSkill Sheet Link</a></li>
                  <li>Click <strong>Extensions</strong> in the top menu bar, then click <strong>Apps Script</strong>.</li>
                  <li>Clear any default code inside the editor, and paste the code snippet shown on the right.</li>
                  <li>Click the <strong>Save</strong> disk icon, then click the <strong>Deploy</strong> button on the top right, and choose <strong>New deployment</strong>.</li>
                  <li>Click the gear icon next to "Select type" and select <strong>Web app</strong>.</li>
                  <li>Set:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5">
                      <li><strong>Description:</strong> <code>MOM Spreadsheet Webhook</code></li>
                      <li><strong>Execute as:</strong> <code>Me (your-google-email)</code></li>
                      <li><strong>Who has access:</strong> <code>Anyone</code></li>
                    </ul>
                  </li>
                  <li>Click <strong>Deploy</strong>. In the prompt, click <strong>Authorize access</strong> and approve permissions for the script to manage this sheet (it might show an "Unverified App" warning; click <em>Advanced</em> and <em>Go to MOM Spreadsheet Webhook (unsafe)</em> to proceed).</li>
                  <li>Copy the generated <strong>Web App URL</strong> (e.g. <code>https://script.google.com/macros/s/.../exec</code>).</li>
                  <li>Create a new Sheet connection here, select your project category (e.g., <strong>Success Skill</strong>), and paste the URL.</li>
                </ol>
              </div>

              {/* Code Panel */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex flex-col justify-between">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-850 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-400">Google Apps Script Snippet</span>
                  <button
                    onClick={copyAppsScript}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-auto max-h-72 font-mono text-[10px] text-slate-350 leading-relaxed bg-slate-950 select-all scrollbar-thin">
                  {appsScriptCode}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-slate-350 leading-relaxed animate-fade-in">
            <p>
              The <strong>Service Account API</strong> method is a direct, secure integration using Google's cloud services. It does not require any scripts inside your Google Sheet, but it requires setting up Google Cloud Platform credentials.
            </p>
            <div className="space-y-2.5 pt-2">
              <h4 className="font-bold text-white text-xs">Steps to set up Service Account:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to the <strong>Google Cloud Console</strong>, create a project, and enable the <strong>Google Sheets API</strong>.</li>
                <li>Navigate to <strong>IAM &amp; Admin</strong> &gt; <strong>Service Accounts</strong> and click <strong>Create Service Account</strong>.</li>
                <li>Enter service account details, then select it and go to the <strong>Keys</strong> tab.</li>
                <li>Click <strong>Add Key</strong> &gt; <strong>Create new key</strong> and select <strong>JSON</strong> format. A <code>.json</code> file will automatically download to your computer.</li>
                <li>Open your Google Sheet, click <strong>Share</strong> on the top right, and add the Service Account's email address (e.g. <code>service-name@project.iam.gserviceaccount.com</code>) as an <strong>Editor</strong>.</li>
                <li>Create a new sheet connection here, select <strong>Service Account</strong>, paste the entire contents of the downloaded <code>.json</code> credential file in the text area, and enter your sheet's Spreadsheet ID.
                  <span className="block text-slate-500 pl-4 mt-1">
                    *Tip: The spreadsheet ID is the long string in your sheet URL: <code>https://docs.google.com/spreadsheets/d/</code><strong>SPREADSHEET_ID</strong><code>/edit</code>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* modal dialog Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 p-7 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <Cable className="h-5.5 w-5.5 text-indigo-400" />
              <span>{editingIntegration ? "Modify Sheets Sync" : "New Sheets Integration"}</span>
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Project Category
                </label>
                <select
                  value={formProject}
                  onChange={(e) => setFormProject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  required
                  disabled={!!editingIntegration}
                >
                  <option value="">Choose a project...</option>
                  {selectableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectableProjects.length === 0 && !editingIntegration && (
                  <span className="text-[10px] text-amber-400 mt-1.5 block">
                    All available projects are already linked to Sheets. Edit existing connections to change settings.
                  </span>
                )}
              </div>

              {/* Integration Type Switch */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Connection Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormType("webhook")}
                    className={`py-2 px-3 border rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition-all duration-200 ${
                      formType === "webhook"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-450"
                        : "bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    } cursor-pointer`}
                  >
                    <Globe className="h-4 w-4" />
                    <span>Apps Script Webhook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("service_account")}
                    className={`py-2 px-3 border rounded-xl flex items-center justify-center space-x-2 font-bold text-xs transition-all duration-200 ${
                      formType === "service_account"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-455"
                        : "bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    } cursor-pointer`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Service Account API</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {formType === "webhook" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Apps Script Web Web URL
                  </label>
                  <input
                    type="url"
                    value={formWebhookUrl}
                    onChange={(e) => setFormWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Spreadsheet ID
                    </label>
                    <input
                      type="text"
                      value={formSpreadsheetId}
                      onChange={(e) => setFormSpreadsheetId(e.target.value)}
                      placeholder="e.g. 1BAVs8A_LuarUuyiR-yxfMKMfCLG94Z70ub1VgfDtVfM"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Worksheet Name (Sheet Tab Name)
                    </label>
                    <input
                      type="text"
                      value={formSheetName}
                      onChange={(e) => setFormSheetName(e.target.value)}
                      placeholder="Meetings"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Service Account Credentials JSON
                    </label>
                    <textarea
                      value={formCredentialsJson}
                      onChange={(e) => setFormCredentialsJson(e.target.value)}
                      placeholder='{"type": "service_account", "project_id": "...", ...}'
                      rows="4"
                      className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono transition-all resize-none"
                      required={!editingIntegration}
                    />
                  </div>
                </div>
              )}

              {/* Status active/inactive switch */}
              <div className="flex items-center space-x-3 bg-slate-950/30 p-3 border border-slate-850 rounded-xl">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-650 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                  Enable Synchronization Active
                </label>
              </div>

              {/* Actions submit/cancel */}
              <div className="flex space-x-3.5 pt-4 border-t border-slate-850 mt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
                >
                  {submitLoading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Save Connection</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2.5 px-5 bg-slate-850 hover:bg-slate-805 text-slate-300 rounded-lg text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {integrationToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative animate-scale-up mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Disconnect Google Sheets Sync</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Are you sure you want to delete the Google Sheets integration for project <strong className="text-white">"{integrationToDelete.project_name}"</strong>? Transcripts will no longer export to this sheet automatically.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIntegrationToDelete(null)}
                className="px-4 py-2 bg-slate-950/80 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-lg text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteIntegration}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-rose-500/15 cursor-pointer"
              >
                Disconnect Sync
              </button>
            </div>
          </div>
        </div>
      )}

    </SidebarLayout>
  );
}
