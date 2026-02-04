import React, { useState, useEffect, useMemo } from 'react';
import { WoundReport, AppTab, UserRole, User } from './types';
import { storageService } from './services/storageService';
import ReportForm from './components/ReportForm';
import ChatAssistant from './components/ChatAssistant';
import HealingChart from './components/HealingChart';
import StageDistributionChart from './components/StageDistributionChart';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { exportToPDF, exportToExcel, exportSinglePDF } from './services/exportService';

const DEFAULT_USER: User = {
  id: 'admin-default',
  name: 'Clinical Administrator',
  username: 'admin',
  role: UserRole.ADMIN
};

const App: React.FC = () => {
  const [currentUser] = useState<User | null>(DEFAULT_USER);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [reports, setReports] = useState<WoundReport[]>([]);
  const [editingReport, setEditingReport] = useState<WoundReport | null>(null);
  const [chartPatientId, setChartPatientId] = useState<string | 'all'>('all');
  const [reportToDelete, setReportToDelete] = useState<WoundReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => {
    setReports(storageService.getAllReports());
  }, []);

  const handleSaveReport = (report: WoundReport) => {
    const existing = reports.find(r => r.id === report.id);
    if (existing) {
      storageService.updateReport(report);
    } else {
      storageService.saveReport(report);
    }
    setReports(storageService.getAllReports());
    setEditingReport(null);
    setActiveTab(AppTab.HISTORY);
  };

  const handleDeleteClick = (report: WoundReport) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    setReportToDelete(report);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      storageService.deleteReport(reportToDelete.id);
      setReports(storageService.getAllReports());
      setReportToDelete(null);
    }
  };

  const handleEdit = (report: WoundReport) => {
    if (currentUser?.role === UserRole.VIEWER) return;
    setEditingReport(report);
    setActiveTab(AppTab.NEW_REPORT);
  };

  const isMatchingStage = (r: WoundReport, stage: string) => {
    const s = r.typeStage.toLowerCase();
    if (stage === 'all') return true;
    
    const isAnyStage = s.includes('stage 1') || s.includes('stage i') || 
                       s.includes('stage 2') || s.includes('stage ii') || 
                       s.includes('stage 3') || s.includes('stage iii') || 
                       s.includes('stage 4') || s.includes('stage iv') || 
                       s.includes('unstageable');

    if (stage === 'staged') return isAnyStage && !r.isNoStage;
    if (stage === 'none') return r.isNoStage || !isAnyStage;
    
    if (stage === '1') return s.includes('stage 1') || (s.includes('stage i') && !s.includes('ii'));
    if (stage === '2') return s.includes('stage 2') || s.includes('stage ii');
    if (stage === '3') return s.includes('stage 3') || s.includes('stage iii');
    if (stage === '4') return s.includes('stage 4') || s.includes('stage iv');
    if (stage === 'unstageable') return s.includes('unstageable');
    
    return false;
  };

  // Logic to deduplicate and filter reports
  // Unique identification of a "wound" is Patient Name + Room No + Anatomical Site
  // We only show the latest version of that wound in the history.
  const processedReports = useMemo(() => {
    const woundMap = new Map<string, WoundReport>();
    
    // Sort all reports by creation date descending so we pick the newest first
    const sortedAll = [...reports].sort((a, b) => b.createdAt - a.createdAt);
    
    sortedAll.forEach(r => {
      const key = `${r.patientName.toLowerCase().trim()}|${r.roomNo.toLowerCase().trim()}|${r.site.toLowerCase().trim()}`;
      if (!woundMap.has(key)) {
        woundMap.set(key, r);
      }
    });

    const uniqueWounds = Array.from(woundMap.values());

    return uniqueWounds.filter(r => {
      const queryMatch = r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.facHosp.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.site.toLowerCase().includes(searchQuery.toLowerCase());
      
      const stageMatch = isMatchingStage(r, stageFilter);
      
      return queryMatch && stageMatch;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [reports, searchQuery, stageFilter]);

  const getStageReports = (stage: string) => {
    return processedReports.filter(r => isMatchingStage(r, stage));
  };

  const handleExportByStage = (stage: string, label: string) => {
    const filtered = getStageReports(stage);
    if (filtered.length === 0) {
      alert(`No clinical records found for ${label}.`);
      return;
    }
    exportToPDF(filtered, `AUDIT: ${label.toUpperCase()}`, `Stage_Report_${label.replace(/\s+/g, '_')}`);
  };

  const handleExportFiltered = () => {
    if (processedReports.length === 0) {
        alert("No records match your current search/filter. Nothing to export.");
        return;
    }
    const filterLabel = stageFilter === 'all' ? 'All Records' : stageFilter === 'staged' ? 'Pressure Ulcers' : 'Non-Staged';
    const title = searchQuery ? `FILTERED AUDIT: ${searchQuery} (${filterLabel})` : `FILTERED AUDIT: ${filterLabel}`;
    exportToPDF(processedReports, title, 'Filtered_Wound_Audit');
  };

  const canModify = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.NURSE;
  const canDelete = currentUser?.role === UserRole.ADMIN;
  const canAccessAI = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.NURSE;

  const availableTabs = useMemo(() => {
    const tabs = [
      { id: AppTab.DASHBOARD, label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    ];
    if (canModify) tabs.push({ id: AppTab.NEW_REPORT, label: editingReport ? 'Update Record' : 'New Entry', icon: 'M12 4v16m8-8H4' });
    tabs.push({ id: AppTab.HISTORY, label: 'Records History', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 0 002-2M9 5a2 2 0 002-2h2a2 0 002-2M9 5a2 2 0 012-2h2a2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' });
    if (canAccessAI) tabs.push({ id: AppTab.AI_ASSISTANT, label: 'AI Analyst', icon: 'M13 10V3L4 14h7v7l9-11h-7z' });
    return tabs;
  }, [canModify, canAccessAI, editingReport]);

  if (!currentUser) return <div className="p-20 text-center font-bold text-slate-400">Loading Clinical Session...</div>;

  return (
    <div className="min-h-screen flex flex-col relative animate-in fade-in duration-500">
      <DeleteConfirmationModal 
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={confirmDelete}
        patientName={reportToDelete?.patientName || ''}
      />

      <div className="fixed bottom-4 left-4 z-50 pointer-events-none select-none">
        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] opacity-40 rotate-[-5deg] border border-red-500 px-2 py-1 rounded">
          PROPERTY OF JEN R.N
        </p>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-none text-blue-600 uppercase">WEEKLY WOUND REPORT</h1>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Master Clinical Database v3.5</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-2">
              <button onClick={() => exportToPDF(processedReports)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-all active:scale-95 shadow-sm">EXPORT ALL PDF</button>
              <button onClick={() => exportToExcel(processedReports)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all active:scale-95 shadow-sm">EXPORT EXCEL</button>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{currentUser.name}</p>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== AppTab.NEW_REPORT) setEditingReport(null); }}
              className={`flex items-center gap-2 py-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === AppTab.DASHBOARD && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Wound Records</p>
              <p className="text-4xl font-black text-slate-800 mt-1">{processedReports.length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Facilities</p>
              <p className="text-4xl font-black text-slate-800 mt-1">{[...new Set(processedReports.map(r => r.facHosp))].filter(Boolean).length}</p>
            </div>
            <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-between overflow-hidden relative">
              <div className="z-10">
                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Clinical AI Status</p>
                <p className="text-xl font-bold text-white mt-1">Ready to analyze {processedReports.length} records.</p>
                <button onClick={() => setActiveTab(AppTab.AI_ASSISTANT)} className="mt-4 px-5 py-2.5 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-lg transition-all active:scale-95">Open AI Portal</button>
              </div>
              <svg className="absolute -right-4 -bottom-4 w-40 h-40 text-blue-500 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>

            <div className="md:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Clinical Export Center</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Advanced multi-patient audit reporting system</p>
                </div>
                <button 
                  onClick={() => exportToPDF(processedReports, 'MASTER CLINICAL AUDIT', 'Master_Database_Audit')}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Master Database Audit
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pressure Ulcer Classification</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: '1', label: 'Stage 1' },
                      { id: '2', label: 'Stage 2' },
                      { id: '3', label: 'Stage 3' },
                      { id: '4', label: 'Stage 4' },
                      { id: 'unstageable', label: 'Unstageable' },
                    ].map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => handleExportByStage(cat.id, cat.label)}
                        className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 group"
                      >
                        <span className="text-[18px] font-black text-slate-800 group-hover:text-blue-700">{getStageReports(cat.id).length}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Specialized Clinical Reports</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleExportByStage('none', 'Non-Staged Wounds')}
                      className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xl font-black">{getStageReports('none').length}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 group-hover:text-emerald-50">Non-Staged</span>
                      </div>
                      <svg className="w-5 h-5 ml-auto text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </button>

                    <button 
                      onClick={() => exportToExcel(processedReports)}
                      className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xl font-black">{processedReports.length}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-200">Full Dataset</span>
                      </div>
                      <svg className="w-5 h-5 ml-auto text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Healing Trend</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Volume Reduction (cm³)</p>
                </div>
                <select value={chartPatientId} onChange={(e) => setChartPatientId(e.target.value)} className="text-[10px] font-black border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 outline-none max-w-[150px]">
                  <option value="all">Global Avg</option>
                  {processedReports.map(r => <option key={r.id} value={r.id}>{r.patientName}</option>)}
                </select>
              </div>
              <HealingChart reports={processedReports} selectedPatientId={chartPatientId} />
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pressure Ulcer</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Current Stage Distribution</p>
              </div>
              <StageDistributionChart reports={processedReports} />
            </div>
          </div>
        )}

        {activeTab === AppTab.NEW_REPORT && canModify && <ReportForm onSubmit={handleSaveReport} initialData={editingReport} />}

        {activeTab === AppTab.HISTORY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-slate-800">Records History</h2>
                {processedReports.length > 0 && (
                  <button 
                    onClick={handleExportFiltered}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                    title="Export currently filtered list to PDF"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export Filtered PDF ({processedReports.length})
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <select 
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700 px-4 py-3 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 shadow-sm min-w-[200px]"
                  >
                    <option value="all">All Records</option>
                    <option value="staged">Pressure Ulcers (1-4 & Unstageable)</option>
                    <option value="none">Non-Staged Wounds</option>
                  </select>
                  <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>

                <div className="relative w-full sm:w-80">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Patient, Room, Site..." 
                    className="w-full text-sm font-bold px-4 py-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 shadow-sm transition-all" 
                  />
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Patient Info</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Anatomical Site</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Discovery</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Measurements (cm)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedReports.length > 0 ? processedReports.map(r => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="font-black text-slate-800">{r.patientName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ROOM {r.roomNo}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-tighter">{r.site}</span>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 italic">
                          {r.isNoStage ? 'NON-STAGED WOUND' : r.typeStage}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-slate-700">{r.dateOfDiscovery}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          {[r.week1, r.week2, r.week3, r.week4].map((w, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase">W{idx+1}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${w ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>{w || '-'}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]" title={r.currentTreatment}>Tx: {r.currentTreatment}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => exportSinglePDF(r)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                            title="Download Patient PDF Record"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Download
                          </button>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canModify && (
                              <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all" title="Modify This Specific Record">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDeleteClick(r)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-all" title="Delete Record">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-300">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="text-sm font-bold uppercase tracking-widest">No matching records found</p>
                          <button onClick={() => { setSearchQuery(''); setStageFilter('all'); }} className="text-xs font-black text-blue-600 hover:underline">Reset All Filters</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === AppTab.AI_ASSISTANT && canAccessAI && (
          <div className="max-w-4xl mx-auto">
            <ChatAssistant reports={processedReports} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;