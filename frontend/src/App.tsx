import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { HeartRate } from './pages/HeartRate'
import { Sleep } from './pages/Sleep'
import { Recovery } from './pages/Recovery'
import { Workouts } from './pages/Workouts'
import { Connect } from './pages/Connect'

function OAuthHandler() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    if (params.get('whoop_connected') === 'true') {
      qc.invalidateQueries({ queryKey: ['whoop-status'] })
      navigate('/', { replace: true })
    }
  }, [params, navigate, qc])

  return null
}

export default function App() {
  return (
    <>
      <OAuthHandler />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/heartrate" element={<HeartRate />} />
          <Route path="/sleep" element={<Sleep />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </Layout>
    </>
  )
}
