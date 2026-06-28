import React, { useState, useEffect } from 'react';
import EnterpriseDashboard from './components/EnterpriseDashboard';
import Login from './components/Login';
import { ShieldCheck, LogOut } from 'lucide-react';

// Firebase Imports
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebaseClient';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // 1. Show a loading screen while checking auth status
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b' }}>
        Authenticating...
      </div>
    );
  }

  // 2. If NO user is logged in, show the Login Screen
  if (!currentUser) {
    return (
      <>
        <style>{`
          html, body, #root {
            min-height: 100vh !important;
            height: auto !important;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
        `}</style>
        {/* We wrap the Login component in the background color so it looks seamless */}
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
          <Login />
        </div>
      </>
    );
  }

  // 3. If a user IS logged in, show the Main Enterprise App
  return (
    <>
      {/* CRITICAL SCROLL FIX */}
      <style>{`
        html, body, #root {
          min-height: 100vh !important;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }
      `}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* GLOBAL HEADER */}
        <header style={{ backgroundColor: '#0f172a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
          
          {/* Logo / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#3b82f6', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <ShieldCheck size={24} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.05em' }}>AI GOVERNANCE  </h1>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Enterprise Audit Platform</div>
            </div>
          </div>
          
          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Display the user's email */}
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '500' }}>
              {currentUser.email}
            </div>
            
            {/* Dynamic Avatar (First letter of email) */}
            <div style={{ height: '32px', width: '32px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {currentUser.email ? currentUser.email.charAt(0) : 'U'}
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        {/* MAIN DASHBOARD INJECTION */}
        <main style={{ padding: '32px 40px', maxWidth: '1600px', margin: '0 auto', paddingBottom: '100px' }}>
          <EnterpriseDashboard />
        </main>

      </div>
    </>
  );
}