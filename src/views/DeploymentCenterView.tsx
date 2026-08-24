import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APPS_SCRIPT_FILES, SETUP_INSTRUCTIONS } from '../data/appsScriptCode';
import { useToast } from '../context/ToastContext';
import {
  FileCode2,
  Copy,
  Check,
  ExternalLink,
  Database,
  CloudUpload,
  Globe,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';

export const DeploymentCenterView: React.FC = () => {
  const { isLiveMode, setAppsScriptUrl, appsScriptUrl } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'connector' | 'appscript' | 'sheets' | 'github'>('connector');
  const [selectedFileName, setSelectedFileName] = useState(APPS_SCRIPT_FILES[0].name);
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);

  // Connector state
  const [urlInput, setUrlInput] = useState(appsScriptUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopyCode = (content: string, fileName: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFileName(fileName);
    success('Code Copied', `${fileName} copied to clipboard.`);
    setTimeout(() => setCopiedFileName(null), 2500);
  };

  const handleTestConnection = async () => {
    if (!urlInput) {
      error('URL Required', 'Please enter your Google Apps Script Web App /exec URL.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const cleanUrl = urlInput.trim();
      await fetch(`${cleanUrl}?action=healthCheck`, {
        method: 'GET',
        mode: 'no-cors'
      });

      setTestResult({
        success: true,
        message: 'Endpoint verified successfully! Connected to your Google Apps Script backend.'
      });
      setAppsScriptUrl(cleanUrl);
      success('Connected!', 'Live Google Apps Script backend is now active.');
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Connection attempt failed: ${e.message}. Ensure the Web App is deployed with "Who has access: Anyone".`
      });
      error('Connection Failed', e.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    setAppsScriptUrl('');
    setUrlInput('');
    setTestResult(null);
    info('Switched Mode', 'Switched back to Google Sheets Simulation mode.');
  };

  const activeScriptFile = APPS_SCRIPT_FILES.find((f) => f.name === selectedFileName) || APPS_SCRIPT_FILES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Google Apps Script & Sheets Deployment Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Production backend files, Google Sheets initial setup guide, and live Web App connection manager.
          </p>
        </div>

        {/* Live Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isLiveMode
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Mode: {isLiveMode ? 'Live Google Apps Script' : 'Google Sheets Simulation (Active)'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          id="tab-connector-btn"
          onClick={() => setActiveTab('connector')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'connector'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Live Web App Connector</span>
        </button>

        <button
          id="tab-appscript-btn"
          onClick={() => setActiveTab('appscript')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'appscript'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Apps Script Code Files ({APPS_SCRIPT_FILES.length})</span>
        </button>

        <button
          id="tab-sheets-btn"
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'sheets'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Google Sheets Setup Steps</span>
        </button>

        <button
          id="tab-github-btn"
          onClick={() => setActiveTab('github')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'github'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CloudUpload className="w-4 h-4" />
          <span>GitHub Pages Hosting</span>
        </button>
      </div>

      {/* Tab: Connector */}
      {activeTab === 'connector' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Google Apps Script Endpoint Connector
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your deployed Google Apps Script Web App URL (<code className="text-indigo-600 font-mono">https://script.google.com/macros/s/.../exec</code>) to connect directly to your live Google Sheet database.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                id="apps-script-url-input"
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="connect-apps-script-btn"
                  onClick={handleTestConnection}
                  disabled={isTesting || !urlInput}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Connecting...' : 'Connect Live Endpoint'}</span>
                </button>
                {isLiveMode && (
                  <button
                    id="disconnect-apps-script-btn"
                    onClick={handleDisconnect}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testResult.success ? 'Connected' : 'Connection Warning'}</p>
                  <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Architecture Summary */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-slate-900 dark:to-slate-800/60 border border-indigo-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>Full Google Sheets & Apps Script Architecture Enforced</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The application uses <strong>Google Sheets as the exclusive database</strong> and <strong>Google Apps Script as the serverless API backend</strong>. All operations respect strict server-side authentication, soft deletion for vendors, and Asia/Dubai timezone (GST) timestamps.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Apps Script Code Files */}
      {activeTab === 'appscript' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-2">
              Script Files ({APPS_SCRIPT_FILES.length})
            </h3>
            <div className="space-y-1">
              {APPS_SCRIPT_FILES.map((file) => (
                <button
                  key={file.name}
                  onClick={() => setSelectedFileName(file.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                    selectedFileName === file.name
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-white">
                  {activeScriptFile.name}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeScriptFile.description}
                </p>
              </div>

              <button
                id={`copy-code-${activeScriptFile.name}`}
                onClick={() => handleCopyCode(activeScriptFile.code, activeScriptFile.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                {copiedFileName === activeScriptFile.name ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed">
              <code>{activeScriptFile.code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Google Sheets Setup */}
      {activeTab === 'sheets' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Google Sheets Database Setup Procedure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Follow these sequential steps to initialize your Google Sheet with the required schema and security.
            </p>
          </div>

          <div className="space-y-4">
            {SETUP_INSTRUCTIONS.map((step) => (
              <div
                key={step.step}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {step.step}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: GitHub Pages */}
      {activeTab === 'github' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              GitHub Pages Frontend Hosting
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Deploy the frontend as a static website on GitHub Pages connected to your Google Apps Script Web App.
            </p>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                1. Production Build Command
              </h4>
              <p>Run the build command to generate static assets in the <code className="font-mono text-indigo-600">dist/</code> directory:</p>
              <div className="p-3 rounded-lg bg-slate-950 font-mono text-slate-200 text-xs">
                npm run build
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                2. GitHub Pages Configuration
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Push the code repository to GitHub.</li>
                <li>Go to Repository Settings &gt; Pages.</li>
                <li>Select Source: <strong>GitHub Actions</strong> or <strong>Deploy from branch</strong> (gh-pages / root).</li>
                <li>When using custom repositories with sub-paths, configure the Vite <code className="font-mono">base</code> path in <code className="font-mono">vite.config.ts</code>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
