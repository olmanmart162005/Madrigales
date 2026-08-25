import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/ui/Skeleton'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'

// Feature pages — lazy loaded
const DashboardPage   = React.lazy(() => import('@/features/dashboard/DashboardPage'))
const OrdersPage      = React.lazy(() => import('@/features/orders/OrdersPage'))
const NewOrderPage    = React.lazy(() => import('@/features/orders/NewOrderPage'))
const OrderDetailPage = React.lazy(() => import('@/features/orders/OrderDetailPage'))
const CalendarPage    = React.lazy(() => import('@/features/calendar/CalendarPage'))
const ProductsPage    = React.lazy(() => import('@/features/products/ProductsPage'))
const InventoryPage   = React.lazy(() => import('@/features/inventory/InventoryPage'))
const ReportsPage     = React.lazy(() => import('@/features/reports/ReportsPage'))
const UsersPage       = React.lazy(() => import('@/features/users/UsersPage'))
const ProfilePage     = React.lazy(() => import('@/features/profile/ProfilePage'))
const SettingsPage    = React.lazy(() => import('@/features/settings/SettingsPage'))

function ProtectedRoute({ children, adminOnly = false, ownerOnly = false }) {
  const { user, profile, loading, isAdmin, isOwner, isActive } = useAuthStore()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  
  const active = typeof isActive === 'function' ? isActive() : profile?.is_active !== false
  if (!active) return <Navigate to="/login" replace />

  // Verificación de solo Owner
  if (ownerOnly && !isOwner()) {
    return <Navigate to="/" replace />
  }

  // Verificación de Administradores (incluye al Owner)
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, profile, loading, isActive } = useAuthStore()
  if (loading) return <PageLoader />
  
  const active = typeof isActive === 'function' ? isActive() : profile?.is_active !== false
  if (user && active) return <Navigate to="/" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="pedidos/nuevo" element={<NewOrderPage />} />
            <Route path="pedidos/:id" element={<OrderDetailPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="almacen" element={<InventoryPage />} />
            <Route path="reportes" element={<ReportsPage />} />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute adminOnly>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="perfil" element={<ProfilePage />} />
            <Route
              path="configuracion"
              element={
                <ProtectedRoute adminOnly>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  )
}
