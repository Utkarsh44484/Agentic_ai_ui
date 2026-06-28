import React from 'react';
import { useStore } from '../store/useStore';
import { X, Copy, Terminal, Check } from 'lucide-react';

export default function TraceExplorer() {
  const { selectedStep, closeTraceExplorer } = useStore();
  const [copied, setCopied] = React.useState(false);

  // If no step is clicked, don't render the panel
  if (!selectedStep) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(selectedStep.raw_payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Dark Overlay behind the panel */}
      <div 
        onClick={closeTraceExplorer}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 40 }}
      />

      {/* The Slide-Out Panel */}
      <div style={{ 
        position: 'fixed', top: 0, right: 0, width: '600px', height: '100vh', 
        backgroundColor: '#ffffff', zIndex: 50, boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease-out'
      }}>
        
        {/* Panel Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Trace Payload Explorer</h2>
          </div>
          <button onClick={closeTraceExplorer} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Panel Metadata */}
        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Step ID</span>
              <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedStep.step_id}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Task ID</span>
              <div style={{ fontWeight: '600', color: '#0f172a', wordBreak: 'break-all' }}>{selectedStep.task_id}</div>
            </div>
          </div>
        </div>

        {/* Code Editor Area */}
        <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '20px', overflowY: 'auto', position: 'relative' }}>
          <button 
            onClick={handleCopy}
            style={{ position: 'absolute', top: '20px', right: '20px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          
          <pre style={{ margin: 0, color: '#a7f3d0', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: '1.5' }}>
            {JSON.stringify(selectedStep.raw_payload, null, 2)}
          </pre>
        </div>

      </div>

      {/* Adding the slide-in animation directly to the component */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}