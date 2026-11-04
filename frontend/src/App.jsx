import React from 'react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';

// Common Components
import ToastContainer from './components/common/ToastContainer';
import ChartTip from './components/common/ChartTip';

// Layout Components
import SessionBar from './components/layout/SessionBar';

// Views
import LandingView from './views/LandingView';
import ClientView from './views/ClientView';
import WorkerView from './views/WorkerView';
import AdminView from './views/AdminView';

// Modals and Drawers
import AuthModal from './components/modals/AuthModal';
import PostJobModal from './components/modals/PostJobModal';
import QuoteModal from './components/modals/QuoteModal';
import OffersModal from './components/modals/OffersModal';
import JobDetailDrawer from './components/modals/JobDetailDrawer';
import WorkerProfileDrawer from './components/modals/WorkerProfileDrawer';
import ChatModal from './components/modals/ChatModal';
import RateModal from './components/modals/RateModal';
import DisputeModal from './components/modals/DisputeModal';
import VideoModal from './components/modals/VideoModal';
import ConfirmModal from './components/modals/ConfirmModal';
import PromptModal from './components/modals/PromptModal';

function AppContent() {
  const { view, toasts, dismissToast, chartTip } = useApp();

  return (
    <>
      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* SVG Chart Tooltip */}
      <ChartTip tip={chartTip} />

      {/* Top Demo Session Bar */}
      <SessionBar />

      {/* Main App Container */}
      <div id="app">
        {view === 'landing' && <LandingView />}
        {view === 'client' && <ClientView />}
        {view === 'worker' && <WorkerView />}
        {view === 'admin' && <AdminView />}
      </div>

      {/* Global Modals and Drawers */}
      <AuthModal />
      <PostJobModal />
      <QuoteModal />
      <OffersModal />
      <JobDetailDrawer />
      <WorkerProfileDrawer />
      <ChatModal />
      <RateModal />
      <DisputeModal />
      <VideoModal />
      <ConfirmModal />
      <PromptModal />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
