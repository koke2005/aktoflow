import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { GuestRoute } from './components/GuestRoute'
import { LanguagePickerModal } from './components/LanguagePickerModal'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LANGUAGE_STORAGE_KEY } from './i18n'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ClientsPage } from './pages/ClientsPage'
import { DashboardPage } from './pages/DashboardPage'
import { DeadlinesPage } from './pages/DeadlinesPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const [languageModalOpen, setLanguageModalOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(LANGUAGE_STORAGE_KEY)) {
        setLanguageModalOpen(true)
      }
    } catch {
      setLanguageModalOpen(true)
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguagePickerModal open={languageModalOpen} onClose={() => setLanguageModalOpen(false)} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailPage />} />
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
