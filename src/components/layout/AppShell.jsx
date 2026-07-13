import Sidebar from './Sidebar'

const AppShell = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-bg-gray">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8 fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppShell
