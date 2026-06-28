import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { 
  Building, Database, ShieldAlert, ChevronRight, Filter, 
  Target, Activity, AlertTriangle, Trash2, TrendingUp, 
  CheckCircle, DollarSign 
} from 'lucide-react';
import SessionDashboard from './SessionDashboard';

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div style={{ flex: '1 1 200px', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{ backgroundColor: `${color}15`, padding: '10px', borderRadius: '8px' }}>
        <Icon size={20} color={color} />
      </div>
      <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    {subtitle && <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{subtitle}</div>}
  </div>
);

export default function EnterpriseDashboard() {
  const [loading, setLoading] = useState(true);
  const [allSessions, setAllSessions] = useState([]);
  const [allSteps, setAllSteps] = useState([]);
  const [allPathIssues, setAllPathIssues] = useState([]);
  const [allTraceIssues, setAllTraceIssues] = useState([]);
  
  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    async function fetchOrgData() {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.from('agent_execution_sessions').select('*');
        const { data: stepData } = await supabase.from('agent_execution_steps').select('session_id, org_id, user_id, input_risk, intent_risk, impact_risk');
        const { data: pathData } = await supabase.from('path_issues').select('session_id, org_id, user_id, dimension, severity');
        const { data: traceData } = await supabase.from('trace_issues').select('session_id, org_id, user_id, dimension, severity');

        const isMedOrHigh = (sev) => {
          if (!sev) return false;
          const s = sev.toUpperCase();
          return s.includes('HIGH') || s.includes('MEDIUM') || s.includes('CRITICAL');
        };
        
        if (pathData) setAllPathIssues(pathData.filter(i => isMedOrHigh(i.severity)));
        if (traceData) setAllTraceIssues(traceData.filter(i => isMedOrHigh(i.severity)));

        if (sessionData) {
          setAllSessions(sessionData);
          const orgs = [...new Set(sessionData.map(s => s.org_id).filter(Boolean))];
          setAvailableOrgs(orgs);
          if (orgs.length > 0) setSelectedOrg(orgs[0]);
        }
        if (stepData) setAllSteps(stepData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }
    fetchOrgData();
  }, []);

  const handleDeleteSession = async (sessionId) => {
    const isConfirmed = window.confirm("Are you sure you want to permanently delete this session from the database? This action cannot be undone.");
    if (!isConfirmed) return;

    try {
      await supabase.from('path_issues').delete().eq('session_id', sessionId);
      await supabase.from('trace_issues').delete().eq('session_id', sessionId);
      await supabase.from('agent_execution_steps').delete().eq('session_id', sessionId);
      const { error } = await supabase.from('agent_execution_sessions').delete().eq('session_id', sessionId);
      
      if (error) throw error;

      setAllSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setAllSteps(prev => prev.filter(s => s.session_id !== sessionId));
      setAllPathIssues(prev => prev.filter(s => s.session_id !== sessionId));
      setAllTraceIssues(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while deleting.");
    }
  };

  if (loading) return <div style={{ padding: '40px', color: '#64748b', fontWeight: '500' }}>Loading Enterprise Analytics...</div>;

  if (selectedSessionId) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
          <button onClick={() => { setSelectedSessionId(null); setSelectedUser(""); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontWeight: '600' }}>{selectedOrg}</button>
          <ChevronRight size={14} />
          <button onClick={() => setSelectedSessionId(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontWeight: '600' }}>User: {selectedUser || "All"}</button>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: '600' }}>Session: {selectedSessionId.substring(0,8)}...</span>
        </div>
        <SessionDashboard sessionId={selectedSessionId} />
      </div>
    );
  }

  const orgSessions = allSessions.filter(s => s.org_id === selectedOrg);
  const orgSteps = allSteps.filter(s => s.org_id === selectedOrg);
  const orgPathIssues = allPathIssues.filter(s => s.org_id === selectedOrg);
  const orgTraceIssues = allTraceIssues.filter(s => s.org_id === selectedOrg);

  const availableUsers = [...new Set(orgSessions.map(s => s.user_id).filter(Boolean))];
  
  const displaySessions = selectedUser ? orgSessions.filter(s => s.user_id === selectedUser) : orgSessions;
  const displaySteps = selectedUser ? orgSteps.filter(s => s.user_id === selectedUser) : orgSteps;
  const displayPathIssues = selectedUser ? orgPathIssues.filter(s => s.user_id === selectedUser) : orgPathIssues;
  const displayTraceIssues = selectedUser ? orgTraceIssues.filter(s => s.user_id === selectedUser) : orgTraceIssues;

  // ==========================================
  // METRICS & ACCURATE CLAUDE 3.5 COSTING
  // ==========================================
  const totalInputTokens = displaySessions.reduce((sum, s) => sum + (Number(s.input_tokens) || 0), 0);
  const totalOutputTokens = displaySessions.reduce((sum, s) => sum + (Number(s.output_tokens) || 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;

  // Claude 3.5 Sonnet Exact Pricing
  const inputCost = (totalInputTokens / 1000000) * 3.00;
  const outputCost = (totalOutputTokens / 1000000) * 15.00;
  const accurateTotalCost = inputCost + outputCost;

  const avgTokens = displaySessions.length > 0 ? Math.round(totalTokens / displaySessions.length) : 0;
  
  const highRiskSteps = displaySteps.filter(s => s.intent_risk === 'HIGH' || s.impact_risk === 'HIGH').length;
  const medRiskSteps = displaySteps.filter(s => (s.intent_risk === 'MEDIUM' || s.impact_risk === 'MEDIUM') && s.intent_risk !== 'HIGH' && s.impact_risk !== 'HIGH').length;
  const lowRiskSteps = displaySteps.filter(s => (s.intent_risk === 'LOW' || !s.intent_risk) && (s.impact_risk === 'LOW' || !s.impact_risk)).length;

  // ==========================================
  // RISK TREND TIMESCALE DATA
  // ==========================================
  const trendMap = {};
  displaySessions.forEach(s => {
    let dateObj = new Date();
    if (s.started_at_utc) dateObj = new Date(s.started_at_utc);
    else if (s.created_at) dateObj = new Date(s.created_at);
    if (isNaN(dateObj.getTime())) dateObj = new Date(); 

    const dateStr = dateObj.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
    if (!trendMap[dateStr]) trendMap[dateStr] = { path: 0, trace: 0 };
    
    const sessionPathCount = displayPathIssues.filter(i => i.session_id === s.session_id).length;
    const sessionTraceCount = displayTraceIssues.filter(i => i.session_id === s.session_id).length;

    trendMap[dateStr].path += sessionPathCount;
    trendMap[dateStr].trace += sessionTraceCount;
  });

  const sortedDates = Object.keys(trendMap).sort((a, b) => new Date(a) - new Date(b));
  const trendLineData = [
    { id: 'Path Deviations', color: '#f59e0b', data: sortedDates.map(d => ({ x: d, y: trendMap[d].path || 0 })) },
    { id: 'Trace Errors', color: '#ef4444', data: sortedDates.map(d => ({ x: d, y: trendMap[d].trace || 0 })) }
  ];

  // ==========================================
  // DIMENSION MAPPING
  // ==========================================
  const BASE_PATH_DIMS = ['PLANNING', 'ACTION', 'THINKING', 'HANDOFFS', 'STATE MANAGEMENT'];
  const BASE_TRACE_DIMS = ['TRANSLATION', 'RESPONSIBILITY', 'AMPLIFICATION', 'CONTROL', 'EVALUATION', 'SPREAD'];

  const pathDimMap = {}; BASE_PATH_DIMS.forEach(d => pathDimMap[d] = 0);
  const traceDimMap = {}; BASE_TRACE_DIMS.forEach(d => traceDimMap[d] = 0);

  displayPathIssues.forEach(i => {
    let d = (i.dimension || 'UNKNOWN').toUpperCase().trim();
    if (d.includes('ACTION')) d = 'ACTION';
    else if (d.includes('THINK') || d.includes('THOUGHT')) d = 'THINKING';
    else if (d.includes('PLAN')) d = 'PLANNING';
    else if (d.includes('HANDOFF')) d = 'HANDOFFS';
    else if (d.includes('STATE')) d = 'STATE MANAGEMENT';
    if (pathDimMap[d] !== undefined) pathDimMap[d] += 1;
  });

  displayTraceIssues.forEach(i => {
    let d = (i.dimension || 'UNKNOWN').toUpperCase().trim();
    if (d.includes('TRANSLAT')) d = 'TRANSLATION';
    else if (d.includes('RESPONSIBIL')) d = 'RESPONSIBILITY';
    else if (d.includes('AMPLIF')) d = 'AMPLIFICATION';
    else if (d.includes('CONTROL')) d = 'CONTROL';
    else if (d.includes('EVALUAT')) d = 'EVALUATION';
    else if (d.includes('SPREAD')) d = 'SPREAD';
    if (traceDimMap[d] !== undefined) traceDimMap[d] += 1;
  });

  const pathDimData = Object.entries(pathDimMap).map(([dim, count]) => ({ dimension: dim, Issues: count }));
  const traceDimData = Object.entries(traceDimMap).map(([dim, count]) => ({ dimension: dim, Errors: count }));

  // ==========================================
  // 3 I's RISK MATRIX
  // ==========================================
  const riskTally = { input: { HIGH: 0, MEDIUM: 0, LOW: 0 }, intent: { HIGH: 0, MEDIUM: 0, LOW: 0 }, impact: { HIGH: 0, MEDIUM: 0, LOW: 0 } };
  displaySteps.forEach(step => {
    if (step.input_risk) riskTally.input[step.input_risk.toUpperCase()] = (riskTally.input[step.input_risk.toUpperCase()] || 0) + 1;
    if (step.intent_risk) riskTally.intent[step.intent_risk.toUpperCase()] = (riskTally.intent[step.intent_risk.toUpperCase()] || 0) + 1;
    if (step.impact_risk) riskTally.impact[step.impact_risk.toUpperCase()] = (riskTally.impact[step.impact_risk.toUpperCase()] || 0) + 1;
  });
  
  const threeIsData = [
    { vector: 'Input Risk', High: riskTally.input.HIGH || 0, Medium: riskTally.input.MEDIUM || 0, Low: riskTally.input.LOW || 0 },
    { vector: 'Intent Risk', High: riskTally.intent.HIGH || 0, Medium: riskTally.intent.MEDIUM || 0, Low: riskTally.intent.LOW || 0 },
    { vector: 'Impact Risk', High: riskTally.impact.HIGH || 0, Medium: riskTally.impact.MEDIUM || 0, Low: riskTally.impact.LOW || 0 }
  ];

  // ==========================================
  // MULTI-FACTOR COMPLEXITY SCORING
  // ==========================================
  const userComplexityMap = {};
  orgSessions.forEach(s => {
    const user = s.user_id || "Unknown";
    if (!userComplexityMap[user]) {
      userComplexityMap[user] = { user, "Low Complexity": 0, "Medium Complexity": 0, "High Complexity": 0 };
    }
    
    const tokens = Number(s.total_tokens) || 0;
    const duration = Number(s.duration_ms) || 0;
    const tools = Number(s.tool_calls_count) || 0;

    const tokenScore = Math.min(tokens / 50000, 1) * 30;
    const durationScore = Math.min(duration / 120000, 1) * 30;
    const toolScore = Math.min(tools / 20, 1) * 40;
    const complexityScore = tokenScore + durationScore + toolScore;

    if (complexityScore < 33) userComplexityMap[user]["Low Complexity"] += 1;
    else if (complexityScore < 66) userComplexityMap[user]["Medium Complexity"] += 1;
    else userComplexityMap[user]["High Complexity"] += 1;
  });

  const devComplexityData = Object.values(userComplexityMap);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
      
      {/* CONTROL BAR */}
      <div style={{ backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Filter size={18} color="#64748b" /><span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>Scope:</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>ORGANIZATION</label>
          <select value={selectedOrg} onChange={(e) => { setSelectedOrg(e.target.value); setSelectedUser(""); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '500', outline: 'none', color: '#0f172a', cursor: 'pointer' }}>
            {availableOrgs.map(org => <option key={org} value={org}>{org}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>USER</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: '500', outline: 'none', color: '#0f172a', cursor: 'pointer' }}>
            <option value="">-- All Users in Org --</option>
            {availableUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Building size={28} color="#0f172a" />
        <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>{selectedUser ? `Analytics for User: ${selectedUser}` : `Organization Analytics: ${selectedOrg || 'N/A'}`}</h2>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <MetricCard title="Compute Tokens" value={totalTokens} icon={Database} color="#8b5cf6" subtitle={`In: ${totalInputTokens.toLocaleString()} | Out: ${totalOutputTokens.toLocaleString()}`} />
        <MetricCard title="Estimated Cost" value={`$${accurateTotalCost.toFixed(3)}`} icon={DollarSign} color="#10b981" subtitle={`In: $${inputCost.toFixed(3)} | Out: $${outputCost.toFixed(3)}`} />
        <MetricCard title="Avg Tokens / Run" value={avgTokens} icon={Activity} color="#3b82f6" subtitle={`Across ${displaySessions.length} total sessions`} />
        
        <MetricCard title="High-Risk Actions" value={highRiskSteps} icon={Target} color="#ef4444" subtitle="Critical threat thresholds met" />
        <MetricCard title="Medium-Risk Actions" value={medRiskSteps} icon={AlertTriangle} color="#f59e0b" subtitle="Warning thresholds met" />
        <MetricCard title="Low-Risk Actions" value={lowRiskSteps} icon={CheckCircle} color="#64748b" subtitle="Benign & routine tool usage" />
      </div>

      {/* RISK TREND TIMESCALE CHART */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '380px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <TrendingUp size={20} color="#2563eb" />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Risk Assessment Trend Line (Timescale)</h3>
        </div>
        <div style={{ height: '300px' }}>
          {sortedDates.length > 0 ? (
            <ResponsiveLine
              data={trendLineData}
              margin={{ top: 20, right: 140, bottom: 50, left: 60 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto' }}
              curve="monotoneX"
              colors={['#f59e0b', '#ef4444']}
              axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Timeline (Date)', legendOffset: 40, legendPosition: 'middle' }}
              axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Total Vulnerabilities', legendOffset: -40, legendPosition: 'middle', tickValues: 5 }}
              pointSize={10} pointColor="white" pointBorderWidth={2} pointBorderColor={{ from: 'serieColor' }}
              useMesh={true} enableArea={true} areaOpacity={0.05}
              legends={[{ anchor: 'top-right', direction: 'column', justify: false, translateX: 120, translateY: 0, itemsSpacing: 4, itemWidth: 100, itemHeight: 20, symbolSize: 14, symbolShape: 'circle' }]}
            />
          ) : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No timescale data found. Populate the database to view trends.</div>}
        </div>
      </div>

      {/* THE 4 CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* CHART 1: Path Issues */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '350px' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>Path Deviations by Dimension</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveBar data={pathDimData} keys={['Issues']} indexBy="dimension" margin={{ top: 20, right: 20, bottom: 80, left: 60 }} padding={0.4} colors="#f59e0b" borderRadius={4} axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -35, legend: 'Cognitive Dimension', legendPosition: 'middle', legendOffset: 65 }} axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Alert Count', legendPosition: 'middle', legendOffset: -40, tickValues: 5 }} theme={{ labels: { text: { fontWeight: 600 } } }} />
          </div>
        </div>

        {/* CHART 2: Trace Issues */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '350px' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>Trace Errors by Dimension</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveBar data={traceDimData} keys={['Errors']} indexBy="dimension" margin={{ top: 20, right: 20, bottom: 80, left: 60 }} padding={0.4} colors="#ef4444" borderRadius={4} axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -35, legend: 'Cognitive Dimension', legendPosition: 'middle', legendOffset: 65 }} axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Error Count', legendPosition: 'middle', legendOffset: -40, tickValues: 5 }} theme={{ labels: { text: { fontWeight: 600 } } }} />
          </div>
        </div>

        {/* CHART 3: 3 I's Risk Matrix */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '350px' }}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>{selectedUser ? "User Risk Profile (The 3 I's)" : "Global Risk Matrix (The 3 I's)"}</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveBar
              data={threeIsData} keys={['High', 'Medium', 'Low']} indexBy="vector"
              margin={{ top: 20, right: 130, bottom: selectedUser ? 40 : 50, left: 60 }} padding={0.3} colors={['#ef4444', '#f59e0b', '#10b981']}
              layout={selectedUser ? "vertical" : "horizontal"} groupMode={selectedUser ? "grouped" : "stacked"}  
              axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: selectedUser ? '' : 'Number of Steps', legendPosition: 'middle', legendOffset: 36 }}
              axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: selectedUser ? 'Number of Steps' : '', legendPosition: 'middle', legendOffset: -40 }}
              legends={[{ dataFrom: 'keys', anchor: 'bottom-right', direction: 'column', justify: false, translateX: 120, translateY: 0, itemsSpacing: 2, itemWidth: 100, itemHeight: 20, symbolSize: 20 }]}
            />
          </div>
        </div>

        {/* CHART 4: Task Complexity Segmented Bar Chart */}
        {!selectedUser && (
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '350px' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.1rem' }}>Agent Usage &  Complexity by Developer</h3>
            <div style={{ height: '280px' }}>
              <ResponsiveBar 
                data={devComplexityData} 
                keys={['High Complexity', 'Medium Complexity', 'Low Complexity']} 
                indexBy="user" 
                margin={{ top: 20, right: 150, bottom: 80, left: 60 }} 
                padding={0.3} 
                colors={['#ef4444', '#f59e0b', '#10b981']} 
                borderRadius={4} 
                axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -35, legend: 'User ID', legendPosition: 'middle', legendOffset: 65 }} 
                axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Total Tasks/Sessions', legendPosition: 'middle', legendOffset: -40 }}
                legends={[
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 140,
                    translateY: 0,
                    itemsSpacing: 4,
                    itemWidth: 100,
                    itemHeight: 20,
                    symbolSize: 14,
                  }
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* SESSION DATA TABLE */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>{selectedUser ? "User Session History" : "Recent Organization Sessions"}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>SESSION ID</th>
                {!selectedUser && <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>USER</th>}
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>TOKENS</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>IGNORED RISKS</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem' }}>DISCARDED ACTIONS</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontSize: '0.85rem', width: '250px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.map(session => (
                <tr key={session.session_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#0f172a' }}>{session.session_id ? session.session_id.substring(0,8) : 'Unknown'}...</td>
                  {!selectedUser && <td style={{ padding: '16px', color: '#3b82f6', fontWeight: '600' }}>{session.user_id}</td>}
                  <td style={{ padding: '16px', color: '#64748b', fontWeight: '500' }}>{(session.total_tokens || 0).toLocaleString()}</td>
                  <td style={{ padding: '16px', color: '#dc2626', fontWeight: '700' }}>{session.total_ignored_risks || 0}</td>
                  <td style={{ padding: '16px', color: '#64748b', fontWeight: '700' }}>{session.total_discarded_actions || 0}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelectedSessionId(session.session_id)} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>Inspect Trace &rarr;</button>
                      <button onClick={() => handleDeleteSession(session.session_id)} style={{ padding: '8px 10px', backgroundColor: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'} title="Delete Session"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}