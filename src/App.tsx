import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NewsFeedPage } from './pages/news/NewsFeedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { WantedDetailPage } from './pages/wanted/WantedDetailPage'
import { WantedListPage } from './pages/wanted/WantedListPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas privadas: RequireAuth decide si pasa o va al login */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="wanted" element={<WantedListPage />} />
              <Route path="wanted/:id" element={<WantedDetailPage />} />
              <Route path="news" element={<NewsFeedPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
