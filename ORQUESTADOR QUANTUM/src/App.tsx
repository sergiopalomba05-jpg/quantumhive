import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TourProvider } from './components/onboarding/TourProvider';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { HelpCenter } from './components/help/HelpCenter';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CommunicationChannels } from './pages/CommunicationChannels';
import { StartHere } from './pages/StartHere';
import { SkillAdvisor } from './pages/SkillAdvisor';
import { Ideas } from './pages/Ideas';
import { Projects } from './pages/Projects';
import { ChatCentral } from './pages/ChatCentral';
import { VideoInbox } from './pages/VideoInbox';
import { LiveCommand } from './pages/LiveCommand';
import { LiveAssistant } from './pages/LiveAssistant';
import { DevEnvironment } from './pages/DevEnvironment';
import { WorkspaceIntegrations } from './pages/WorkspaceIntegrations';
import { ConnectionsRegistry } from './pages/ConnectionsRegistry';
import { ApprovalQueue } from './pages/ApprovalQueue';
import { AuditLogView } from './pages/AuditLog';
import { ContextPacks } from './pages/ContextPacks';
import { DailyBrief } from './pages/DailyBrief';
import { KnowledgeGraph } from './pages/KnowledgeGraph';
import { VisualPlanner } from './pages/VisualPlanner';
import { PromptStudio } from './pages/PromptStudio';
import { RepoConnector } from './pages/RepoConnector';
import { AgentBuilder } from './pages/AgentBuilder';
import { WorkerRegistry } from './pages/WorkerRegistry';
import { BrainRegistry } from './pages/BrainRegistry';
import { McpHub } from './pages/McpHub';
import { Databases } from './pages/Databases';
import { 
  MemoryView, TasksView, EventsView, 
  ModelsView, CloudView, DecisionsView, AgentsView
} from './pages/GenericViews';

export default function App() {
  return (
    <BrowserRouter>
      <TourProvider>
        <OnboardingModal />
        <Layout>
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/start" element={<StartHere />} />
          <Route path="/skill-advisor" element={<SkillAdvisor />} />
          <Route path="/chat" element={<ChatCentral />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/agents" element={<AgentsView />} />
          <Route path="/memory" element={<MemoryView />} />
          <Route path="/channels" element={<CommunicationChannels />} />
          <Route path="/tasks" element={<TasksView />} />
          <Route path="/events" element={<EventsView />} />
          <Route path="/models" element={<ModelsView />} />
          <Route path="/cloud" element={<CloudView />} />
          <Route path="/decisions" element={<DecisionsView />} />
          <Route path="/video-inbox" element={<VideoInbox />} />
          <Route path="/voice" element={<LiveCommand />} />
          <Route path="/live-assistant" element={<LiveAssistant />} />
          <Route path="/workspace" element={<WorkspaceIntegrations />} />
          <Route path="/dev-env" element={<DevEnvironment />} />
          <Route path="/connections" element={<ConnectionsRegistry />} />
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/audit" element={<AuditLogView />} />
          <Route path="/packs" element={<ContextPacks />} />
          <Route path="/brief" element={<DailyBrief />} />
                    <Route path="/graph" element={<KnowledgeGraph />} />
                <Route path="/planner" element={<VisualPlanner />} />
                <Route path="/prompt-studio" element={<PromptStudio />} />
          <Route path="/repo-connector" element={<RepoConnector />} />
          <Route path="/agent-builder" element={<AgentBuilder />} />
          <Route path="/worker-registry" element={<WorkerRegistry />} />
          <Route path="/brain-registry" element={<BrainRegistry />} />
          <Route path="/mcp-hub" element={<McpHub />} />
          <Route path="/databases" element={<Databases />} />
          <Route path="/help" element={<HelpCenter />} />
        </Routes>
        </Layout>
      </TourProvider>
    </BrowserRouter>
  );
}
