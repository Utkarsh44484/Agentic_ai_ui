import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup // NEW IMPORT
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebaseClient'; // IMPORT PROVIDER
import { Lock, Mail, LogOut, ArrowRight } from 'lucide-react';

export default function Login() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for changes in the user's login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Standard Email/Password Auth
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      const cleanError = err.message.replace('Firebase: ', '').replace(/\(auth.*\)\./, '');
      setError(cleanError);
    }
  };

  // NEW: Google Popup Auth
  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const cleanError = err.message.replace('Firebase: ', '').replace(/\(auth.*\)\./, '');
      setError(cleanError);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#64748b' }}>Checking authentication...</div>;
  }

  // ==========================================
  // VIEW: USER IS LOGGED IN
  // ==========================================
  if (currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ backgroundColor: '#f0fdf4', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Lock size={32} color="#16a34a" />
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.5rem' }}>Authenticated</h2>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>Signed in as: <strong style={{ color: '#0f172a' }}>{currentUser.email}</strong></p>
          
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: USER IS LOGGED OUT
  // ==========================================
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        
        <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.75rem', textAlign: 'center' }}>
          {isLoginView ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px', fontSize: '0.9rem' }}>
          {isLoginView ? 'Enter your credentials to access the dashboard.' : 'Sign up to secure your AI infrastructure.'}
        </p>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '24px', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: '600', marginBottom: '8px' }}>EMAIL ADDRESS</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px' }}>
              <Mail size={18} color="#64748b" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@enterprise.com"
                style={{ flex: 1, border: 'none', backgroundColor: 'transparent', padding: '12px', outline: 'none', color: '#0f172a' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: '600', marginBottom: '8px' }}>PASSWORD</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px' }}>
              <Lock size={18} color="#64748b" />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ flex: 1, border: 'none', backgroundColor: 'transparent', padding: '12px', outline: 'none', color: '#0f172a' }}
              />
            </div>
          </div>

          <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '8px', transition: 'background 0.2s' }}>
            {isLoginView ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
          </button>
        </form>

        {/* OR DIVIDER */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ padding: '0 12px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        {/* GOOGLE LOGIN BUTTON */}
        <button 
          type="button" 
          onClick={handleGoogleLogin}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '12px', backgroundColor: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          {/* Official Google G Logo SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Toggle View */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748b' }}>
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => { setIsLoginView(!isLoginView); setError(''); }} 
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '600', cursor: 'pointer', padding: 0 }}
          >
            {isLoginView ? 'Sign up here.' : 'Log in here.'}
          </button>
        </div>

      </div>
    </div>
  );
}