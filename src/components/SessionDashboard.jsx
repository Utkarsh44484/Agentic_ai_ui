import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ResponsivePie } from '@nivo/pie';
import { useReactToPrint } from 'react-to-print';
import { useStore } from '../store/useStore';
import TraceExplorer from './TraceExplorer';
import { 
  Database, FileWarning, AlertTriangle, CheckCircle, Info, Maximize2, 
  ArrowLeft, FileText, Target, AlertOctagon, Activity, ShieldAlert, 
  Search, Download 
} from 'lucide-react';

// ==========================================
// 1. HELPERS: PARSERS FOR KPIs vs TABLES
// ==========================================

// For KPIs: Only returns Medium, High, Critical
const parseAndFilterIssues = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch (e) { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  
  return parsed.map(issue => {
    if (typeof issue === 'string') {
      try { return JSON.parse(issue); } catch(e) { return { rationale: issue }; }
    }
    return issue;
  }).filter(issue => {
    const sev = (issue.severity || issue.Severity || issue.level || 'INFO').toUpperCase();
    return sev.includes('HIGH') || sev.includes('CRITICAL') || sev.includes('MEDIUM');
  });
};

// For Tables: Returns EVERYTHING (including LOW and INFO)
const parseAllIssues = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch (e) { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  
  return parsed.map(issue => {
    if (typeof issue === 'string') {
      try { return JSON.parse(issue); } catch(e) { return { rationale: issue }; }
    }
    return issue;
  });
};

const getDimensionTally = (issues) => {
  const tally = {};
  issues.forEach(issue => {
    const dim = (issue.dimension || 'unknown').toLowerCase();
    tally[dim] = (tally[dim] || 0) + 1;
  });
  return Object.entries(tally).map(([dim, count]) => `${count} ${dim}`).join(', ');
};

// ==========================================
// 2. EXECUTIVE SUMMARY RENDERER
// ==========================================
const ExecutiveSummaryRenderer = ({ rawData }) => {
  let data = rawData;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } 
    catch (e) { return <p style={{ fontSize: '1rem', lineHeight: '1.7', color: '#334155', margin: 0 }}>{data}</p>; }
  }

  const rating = data.overall_risk_rating || "UNKNOWN";
  const isSafe = rating.toUpperCase() === "LOW";

  const badgeStyle = isSafe 
    ? { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } 
    : { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Audit Overview</div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>
            Comprehensive automated governance assessment compiled by the LLM auditor. All analyzed interaction payloads are mapped below across primary vectors, systemic anomalies, and structural findings.
          </p>
        </div>
        
        <div style={{ ...badgeStyle, padding: '12px 24px', borderRadius: '8px', textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', minWidth: '160px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Security Tier</span>
          <span style={{ fontSize: '1.75rem', fontWeight: '800', lineHeight: 1.2 }}>{rating.toUpperCase()}</span>
        </div>
      </div>

      {data.primary_signals && (
        <div>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Risk Vectors</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {['input', 'intent', 'impact'].map(key => {
              const signal = data.primary_signals[key];
              if (!signal) return null;
              const signalHigh = signal.rating?.toUpperCase() === 'HIGH';
              return (
                <div key={key} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>{key} Assessment</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', backgroundColor: signalHigh ? '#fee2e2' : '#f1f5f9', color: signalHigh ? '#991b1b' : '#475569' }}>{signal.rating || 'UNKNOWN'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>{signal.justification}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnostic Callouts</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Governance Exception', val: data.most_significant_governance_issue },
            { label: 'Execution Exception', val: data.most_significant_execution_issue },
            { label: 'Identified Threat Vector', val: data.most_significant_risk }
          ].map((item, idx) => {
            if (!item.val) return null;
            return (
              <div key={idx} style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #cbd5e1', padding: '16px 20px', borderRadius: '0 8px 8px 0', display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'start', gap: '16px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>{item.label}</span>
                <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>{item.val}</span>
              </div>
            );
          })}
        </div>
      </div>

      {data.key_findings && data.key_findings.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Granular Audit Findings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.key_findings.map((finding, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'start', fontSize: '0.92rem', color: '#334155', lineHeight: '1.6' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 'bold', selectPlayer: 'none' }}>•</span>
                <span>{finding}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. ENTERPRISE TABLE (For Path/Trace)
// ==========================================
const IssueTable = ({ issues, title, icon: Icon, color }) => {
  if (!issues || issues.length === 0) {
    return (
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Icon size={20} color={color} />
          <h3 style={{ margin: 0, color: '#0f172a' }}>{title}</h3>
        </div>
        <p style={{ color: '#10b981', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>✓ No {title.toLowerCase()} detected in this session.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Icon size={20} color={color} />
        <h3 style={{ margin: 0, color: '#0f172a' }}>{title} ({issues.length} Total)</h3>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', width: '15%' }}>Dimension</th>
            <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', width: '10%' }}>Severity</th>
            <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', width: '35%' }}>Evidence</th>
            <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', width: '40%' }}>Rationale</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((data, idx) => {
            const severity = (data.severity || data.Severity || data.level || 'INFO').toUpperCase();
            const isHigh = severity.includes('HIGH') || severity.includes('CRITICAL');
            
            let badgeBg = '#f1f5f9'; let badgeText = '#475569'; // Default for LOW/INFO
            if (severity.includes('MEDIUM')) { badgeBg = '#fef3c7'; badgeText = '#b45309'; }
            if (isHigh) { badgeBg = '#fee2e2'; badgeText = '#991b1b'; }

            return (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isHigh ? '#fef2f2' : 'transparent' }}>
                <td style={{ padding: '16px', fontWeight: '600', color: '#0f172a', verticalAlign: 'top', textTransform: 'capitalize' }}>{data.dimension || '-'}</td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', backgroundColor: badgeBg, color: badgeText, letterSpacing: '0.05em' }}>{severity}</span>
                </td>
                <td style={{ padding: '16px', color: '#334155', verticalAlign: 'top', fontSize: '0.95rem', lineHeight: '1.5' }}>{data.evidence || '-'}</td>
                <td style={{ padding: '16px', color: '#334155', verticalAlign: 'top', fontSize: '0.95rem', lineHeight: '1.5' }}>{data.rationale || data.description || JSON.stringify(data)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// 4. MAIN DASHBOARD COMPONENT
// ==========================================
export default function SessionDashboard({ sessionId }) {
  const { selectedTask, setSelectedTask, setSelectedStep } = useStore();
  const selectedSession = sessionId;
  
  const [sessionMeta, setSessionMeta] = useState(null);
  const [allSteps, setAllSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  // SEARCH AND FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // PDF EXPORT HOOK
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Security_Audit_${selectedSession}`,
  });

  useEffect(() => {
    async function fetchData() {
      if (!selectedSession) return;
      setLoading(true);
      const parentReq = supabase.from('agent_execution_sessions').select('*').eq('session_id', selectedSession).single();
      const childReq = supabase.from('agent_execution_steps').select('*').eq('session_id', selectedSession).order('step_id', { ascending: true });
      const [parentRes, childRes] = await Promise.all([parentReq, childReq]);

      if (parentRes.data) setSessionMeta(parentRes.data);
      if (childRes.data) setAllSteps(childRes.data);
      setLoading(false);
    }
    fetchData();
  }, [selectedSession]);

  if (loading) return <div style={{ color: '#64748b' }}>Loading comprehensive session audit...</div>;
  if (!sessionMeta) return <div style={{ color: '#ef4444' }}>Error: Session metadata not found.</div>;

  // ==========================================
  // METRICS & FILTERED DATA
  // ==========================================
  const uniqueTasksMap = new Map();
  allSteps.forEach(step => {
    if (!uniqueTasksMap.has(step.task_id)) uniqueTasksMap.set(step.task_id, step.task_name || step.task_id);
  });
  const uniqueTasks = Array.from(uniqueTasksMap.entries()).map(([id, name]) => ({ id, name }));

  let high = 0, medium = 0, low = 0;
  allSteps.forEach(step => {
    const risks = [step.input_risk, step.intent_risk, step.impact_risk];
    if (risks.includes('HIGH')) high++; else if (risks.includes('MEDIUM')) medium++; else low++;
  });
  const pieData = [
    { id: 'High Risk', label: 'High Risk', value: high, color: '#ef4444' },
    { id: 'Medium Risk', label: 'Medium', value: medium, color: '#f59e0b' },
    { id: 'Low Risk', label: 'Low Risk', value: low, color: '#10b981' }
  ];

  const riskyStepsCount = high; 
  
  // FILTER ISSUES FOR KPI (Only Med/High)
  const filteredPathIssues = parseAndFilterIssues(sessionMeta.path_issues);
  const filteredTraceIssues = parseAndFilterIssues(sessionMeta.trace_issues);

  // ALL ISSUES FOR TABLES (Includes Low/Info)
  const allParsedPathIssues = parseAllIssues(sessionMeta.path_issues);
  const allParsedTraceIssues = parseAllIssues(sessionMeta.trace_issues);

  // ==========================================
  // THE TIMELINE RENDERER
  // ==========================================
  const renderTimeline = (stepsToRender) => {
    const filteredSteps = stepsToRender.filter(step => {
      const hasHighRisk = [step.input_risk, step.intent_risk, step.impact_risk].includes('HIGH');
      const hasMedRisk = [step.input_risk, step.intent_risk, step.impact_risk].includes('MEDIUM');
      
      let matchesRisk = true;
      if (riskFilter === 'HIGH') matchesRisk = hasHighRisk;
      if (riskFilter === 'MEDIUM') matchesRisk = hasMedRisk || hasHighRisk;

      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const payloadStr = JSON.stringify(step.raw_payload).toLowerCase();
        const taskStr = (step.task_name || '').toLowerCase();
        matchesSearch = payloadStr.includes(query) || taskStr.includes(query);
      }
      return matchesRisk && matchesSearch;
    });

    return (
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="#3b82f6" /> Execution Trace ({filteredSteps.length} Steps)
          </h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
              <Search size={16} color="#64748b" style={{ marginRight: '8px' }} />
              <input type="text" placeholder="Search payloads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '200px', color: '#334155' }} />
            </div>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
              {['ALL', 'MEDIUM', 'HIGH'].map(tier => (
                <button key={tier} onClick={() => setRiskFilter(tier)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s', backgroundColor: riskFilter === tier ? (tier === 'HIGH' ? '#ef4444' : tier === 'MEDIUM' ? '#f59e0b' : '#ffffff') : 'transparent', color: riskFilter === tier ? (tier === 'ALL' ? '#0f172a' : '#ffffff') : '#64748b', boxShadow: riskFilter === tier && tier === 'ALL' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>{tier}</button>
              ))}
            </div>
          </div>
        </div>

        {filteredSteps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No steps match your search criteria.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredSteps.map((step, index) => {
              const hasHighRisk = [step.input_risk, step.intent_risk, step.impact_risk].includes('HIGH');
              const hasMediumRisk = [step.input_risk, step.intent_risk, step.impact_risk].includes('MEDIUM');
              let statusColor = '#10b981'; let StatusIcon = CheckCircle;
              if (hasHighRisk) { statusColor = '#ef4444'; StatusIcon = AlertTriangle; }
              else if (hasMediumRisk) { statusColor = '#f59e0b'; StatusIcon = Info; }

              return (
                <div key={step.id} style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ backgroundColor: statusColor, padding: '10px', borderRadius: '50%', color: 'white', zIndex: 1, boxShadow: `0 0 0 4px ${statusColor}33` }}><StatusIcon size={18} /></div>
                    {index !== filteredSteps.length - 1 && <div style={{ width: '2px', flex: 1, backgroundColor: '#e2e8f0', margin: '8px 0' }}></div>}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '32px' }}>
                    <div onClick={() => setSelectedStep(step)} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', backgroundColor: hasHighRisk ? '#fef2f2' : '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.1rem' }}>Step {step.step_id} </span>
                          <span style={{ color: '#64748b', fontSize: '0.85rem', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', marginLeft: '8px' }}>{step.step_type}</span>
                        </div>
                        <div className="hide-on-print" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '500' }}>Inspect JSON <Maximize2 size={14} /></div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>Task: <strong>{step.task_name || step.task_id}</strong></div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 10px', borderRadius: '6px', backgroundColor: step.input_risk === 'HIGH' ? '#fee2e2' : '#f1f5f9', color: step.input_risk === 'HIGH' ? '#991b1b' : '#475569', border: `1px solid ${step.input_risk === 'HIGH' ? '#fca5a5' : '#e2e8f0'}` }}>INPUT: {step.input_risk}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 10px', borderRadius: '6px', backgroundColor: step.intent_risk === 'HIGH' ? '#fee2e2' : '#f1f5f9', color: step.intent_risk === 'HIGH' ? '#991b1b' : '#475569', border: `1px solid ${step.intent_risk === 'HIGH' ? '#fca5a5' : '#e2e8f0'}` }}>INTENT: {step.intent_risk}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '6px 10px', borderRadius: '6px', backgroundColor: step.impact_risk === 'HIGH' ? '#fee2e2' : '#f1f5f9', color: step.impact_risk === 'HIGH' ? '#991b1b' : '#475569', border: `1px solid ${step.impact_risk === 'HIGH' ? '#fca5a5' : '#e2e8f0'}` }}>IMPACT: {step.impact_risk}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // VIEW RENDERER
  // ==========================================
  if (selectedTask) {
    const taskSteps = allSteps.filter(step => step.task_id === selectedTask);
    const taskName = uniqueTasks.find(t => t.id === selectedTask)?.name || selectedTask;
    return (
      <>
        <TraceExplorer />
        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <button onClick={() => setSelectedTask(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', cursor: 'pointer', fontWeight: '500' }}><ArrowLeft size={16} /> Back to Full Session</button>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>{taskName}</h2>
          </div>
          {renderTimeline(taskSteps)}
        </div>
      </>
    );
  }

  // DEFAULT VIEW: Full Session Overview (Exportable)
 return (
    <>
      <TraceExplorer />
      
      <style>{`
        @media print {
          body, html, #root { height: auto !important; overflow: visible !important; background-color: white !important; }
          .hide-on-print { display: none !important; }
          .print-wrapper { display: block !important; height: auto !important; overflow: visible !important; }
          .page-break-safe { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; margin-bottom: 24px !important; }
        }
      `}</style>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button className="hide-on-print" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}><Download size={18} /> Export Report</button>
        </div>

        {/* PRINTABLE AREA */}
        <div ref={componentRef} className="print-wrapper" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          
          {/* SECTION 1: TOP KPI & AI SUMMARY */}
          <div className="page-break-safe" style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <FileText size={28} color="#2563eb" />
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.75rem' }}> Session Analytics</h2>
            </div>
            
            {/* 6 KPI CARDS (Restored Originals + New Causality Metrics) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>SESSION COST</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>${Number(sessionMeta.compute_cost || 0).toFixed(2)}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{(sessionMeta.total_tokens || 0).toLocaleString()} Tokens</div>
              </div>

              <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                <div style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '700' }}>PATH DEVIATIONS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#b45309' }}>{filteredPathIssues.length}</div>
              </div>

              <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>TRACE ERRORS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#991b1b' }}>{filteredTraceIssues.length}</div>
              </div>

              <div style={{ backgroundColor: '#fdf4ff', padding: '20px', borderRadius: '10px', border: '1px solid #fae8ff' }}>
                <div style={{ fontSize: '0.85rem', color: '#c026d3', fontWeight: '700' }}>HIGH-RISK STEPS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#86198f' }}>{riskyStepsCount}</div>
              </div>

              <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>IGNORED RISKS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#991b1b' }}>{sessionMeta.total_ignored_risks || 0}</div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '700' }}>DISCARDED ACTIONS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#14532d' }}>{sessionMeta.total_discarded_actions || 0}</div>
              </div>
            </div>

            {/* NEW: THE ACTUAL TEXT FOR IGNORED RISKS AND DISCARDED ACTIONS */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
              
              {/* Render if there are ignored risks */}
              {sessionMeta.ignored_risks_list && sessionMeta.ignored_risks_list.length > 0 && (
                <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#fef2f2', padding: '24px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  <h3 style={{ marginTop: 0, color: '#991b1b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     Specific Risks Ignored by Agent
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#7f1d1d', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionMeta.ignored_risks_list.map((risk, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Render if there are discarded actions */}
              {sessionMeta.discarded_actions_list && sessionMeta.discarded_actions_list.length > 0 && (
                <div style={{ flex: 1, minWidth: '300px', backgroundColor: '#f0fdf4', padding: '24px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <h3 style={{ marginTop: 0, color: '#16a34a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     Specific Actions Discarded by Agent
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#14532d', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionMeta.discarded_actions_list.map((action, idx) => (
                      <li key={idx} style={{ lineHeight: '1.4' }}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* EXECUTIVE SUMMARY */}
            <div style={{ backgroundColor: '#f8fafc', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <ExecutiveSummaryRenderer rawData={sessionMeta.executive_summary} />
            </div>
          </div>

          {/* SECTION 2: CHARTS AND TASKS */}
          <div className="page-break-safe" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <div style={{ flex: '1 1 300px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '350px' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>Global Risk Distribution</h3>
              <div style={{ height: '260px' }}>
                <ResponsivePie data={pieData.filter(d => d.value > 0)} margin={{ top: 20, right: 80, bottom: 20, left: 80 }} innerRadius={0.5} padAngle={2} cornerRadius={4} colors={{ datum: 'data.color' }} borderWidth={1} borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }} arcLinkLabelsTextColor="#333333" arcLabelsTextColor="#ffffff" />
              </div>
            </div>

            <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', maxHeight: '350px', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem', marginBottom: '20px' }}>Drill-Down by Task</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {uniqueTasks.map(task => {
                  const tSteps = allSteps.filter(s => s.task_id === task.id);
                  const hasHighRisk = tSteps.some(s => [s.input_risk, s.intent_risk, s.impact_risk].includes('HIGH'));
                  return (
                    <div key={task.id} onClick={() => setSelectedTask(task.id)} style={{ padding: '16px', borderRadius: '8px', border: `1px solid ${hasHighRisk ? '#fca5a5' : '#e2e8f0'}`, backgroundColor: hasHighRisk ? '#fef2f2' : '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Target size={18} color={hasHighRisk ? '#ef4444' : '#3b82f6'} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{task.name}</span>
                      </div>
                      <span className="hide-on-print" style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '16px' }}>{tSteps.length} Steps &rarr;</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: TIMELINE */}
          <div className="page-break-safe">
            {renderTimeline(allSteps)}
          </div>

          {/* SECTION 4: FILTERED ISSUE TABLES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '32px' }}>
            <div className="page-break-safe">
              <IssueTable issues={allParsedPathIssues} title="Path Deviations" icon={AlertOctagon} color="#f59e0b" />
            </div>
            <div className="page-break-safe">
              <IssueTable issues={allParsedTraceIssues} title="System / Trace Errors" icon={AlertTriangle} color="#ef4444" />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}