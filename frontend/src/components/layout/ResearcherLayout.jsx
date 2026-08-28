import React, { useState } from 'react';
import { ResearcherSidebar } from './ResearcherSidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/Toast';

export function ResearcherLayout({ activeTab, setActiveTab, children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="workspace-layout">
      <ResearcherSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="workspace-main">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeTabTitle={title}
        />

        <main className="workspace-content">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
