import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import { PrefsProvider } from './lib/prefs'
import Home from './pages/public/Home'
import SubmitFeedback from './pages/public/SubmitFeedback'
import TrackFeedback from './pages/public/TrackFeedback'

// Admin is code-split so the public form your users load stays small
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const FeedbackList = lazy(() => import('./pages/admin/FeedbackList'))
const FeedbackDetail = lazy(() => import('./pages/admin/FeedbackDetail'))
const Analytics = lazy(() => import('./pages/admin/Analytics'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const ReviewsBoard = lazy(() => import('./pages/admin/ReviewsBoard'))
const WhatsAppImport = lazy(() => import('./pages/admin/WhatsAppImport'))
const Clients = lazy(() => import('./pages/admin/Clients').then((m) => ({ default: m.Clients })))
const ClientDetail = lazy(() => import('./pages/admin/Clients').then((m) => ({ default: m.ClientDetail })))
const ClientRequests = lazy(() => import('./pages/admin/ClientRequests').then((m) => ({ default: m.ClientRequests })))
const ClientRequestAdmin = lazy(() => import('./pages/admin/ClientRequests').then((m) => ({ default: m.ClientRequestAdmin })))

// Client panel (organisations that bought Ridemap / PrintA4)
const ClientLayout = lazy(() => import('./layouts/ClientLayout'))
const ClientLogin = lazy(() => import('./pages/client/ClientLogin'))
const ClientJoin = lazy(() => import('./pages/client/ClientJoin'))
const ClientEntry = lazy(() => import('./pages/client/ClientEntry'))
const NewRequest = lazy(() => import('./pages/client/NewRequest'))
const MyRequests = lazy(() => import('./pages/client/MyRequests').then((m) => ({ default: m.MyRequests })))
const ClientRequestView = lazy(() => import('./pages/client/MyRequests').then((m) => ({ default: m.ClientRequestView })))

// Remount the form when switching products so half-filled answers don't leak across
function SubmitRoute() {
  const { product } = useParams()
  return <SubmitFeedback key={product} />
}

export default function App() {
  return (
    <PrefsProvider>
      <BrowserRouter>
        <Routes>
          {/* Users: the feedback side, reachable from the client panel */}
          <Route element={<PublicLayout />}>
            <Route path="feedback" element={<Home />} />
            <Route path="feedback/:product" element={<SubmitRoute />} />
            <Route path="track" element={<TrackFeedback />} />
          </Route>
          {/* No auth yet: put this behind your login once the backend exists */}
          <Route
            path="admin"
            element={
              <Suspense fallback={null}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="feedback" element={<FeedbackList />} />
            <Route path="feedback/:id" element={<FeedbackDetail />} />
            <Route path="problems" element={<FeedbackList key="problem" type="problem" />} />
            <Route path="suggestions" element={<FeedbackList key="suggestion" type="suggestion" />} />
            <Route path="questions" element={<FeedbackList key="query" type="query" />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="reviews" element={<ReviewsBoard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="client-requests" element={<ClientRequests />} />
            <Route path="client-requests/:id" element={<ClientRequestAdmin />} />
            <Route path="whatsapp" element={<WhatsAppImport />} />
          </Route>
          {/* Clients: the front door */}
          <Route
            path="/"
            element={
              <Suspense fallback={null}>
                <ClientLayout />
              </Suspense>
            }
          >
            <Route index element={<ClientEntry />} />
            <Route path="client" element={<ClientEntry />} />
            <Route path="client/login" element={<ClientLogin />} />
            <Route path="client/join" element={<ClientJoin />} />
            <Route path="client/new" element={<NewRequest />} />
            <Route path="client/requests" element={<MyRequests />} />
            <Route path="client/requests/:id" element={<ClientRequestView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PrefsProvider>
  )
}
