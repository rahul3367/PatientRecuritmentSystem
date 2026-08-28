import React from 'react';
import { PatientNavbar } from './PatientNavbar';
import { ToastContainer } from '../common/Toast';

export function PatientLayout({ activeTab, setActiveTab, children }) {
  return (
    <div className="app-root" style={{ background: '#f8fafc' }}>
      <PatientNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        {children}
      </main>

      <ToastContainer />
    </div>
  );
}
