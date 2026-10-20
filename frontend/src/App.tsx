import ChatPlayground from './components/ChatPlayground'
import ConnectionPanel from './components/ConnectionPanel'
import LocalDeployment from './components/LocalDeployment'
import Logo from './components/Logo'
import PolicyViewer from './components/PolicyViewer'
import SamplePromptRunner from './components/SamplePromptRunner'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Logo />
        <div className="app-title">
          <span className="eyebrow">DroneX / Guardrails</span>
          <h1>Topic control</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-main">
        <section className="card">
          <h2>NemoGuard topic control</h2>
          <p className="muted">
            Test how the Llama 3.1 NemoGuard 8B TopicControl rail keeps a conversation on topic.
          </p>
        </section>

        <ConnectionPanel />
        <ChatPlayground />
        <SamplePromptRunner />
        <PolicyViewer />
        <LocalDeployment />
      </main>
    </div>
  )
}
