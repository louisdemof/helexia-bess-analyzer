// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useProjectStore } from './store/projectStore.ts';
import Sidebar from './components/layout/Sidebar.tsx';
import TopBar from './components/layout/TopBar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import NewProject from './pages/NewProject.tsx';
import ProjectEditor from './pages/ProjectEditor.tsx';
import Results from './pages/Results.tsx';
import ScenarioManager from './pages/ScenarioManager.tsx';

export default function App() {
  const hydrate = useProjectStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter basename="/bess-analyzer">
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<NewProject />} />
              <Route path="/project/:id" element={<ProjectEditor />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/scenarios/:id" element={<ScenarioManager />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
