import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '../api'

function StatusBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#34D399' }}>
      <CheckCircle size={14} /> Connected
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm" style={{ color: '#6b7990' }}>
      <XCircle size={14} /> Not connected
    </span>
  )
}

export function Connect() {
  const qc = useQueryClient()
  const [garminEmail, setGarminEmail] = useState('')
  const [garminPassword, setGarminPassword] = useState('')
  const [garminError, setGarminError] = useState('')

  const { data: whoopStatus } = useQuery({
    queryKey: ['whoop-status'],
    queryFn: api.whoopStatus,
  })

  const { data: garminStatus } = useQuery({
    queryKey: ['garmin-status'],
    queryFn: api.garminStatus,
  })

  const garminLogin = useMutation({
    mutationFn: () => api.garminLogin(garminEmail, garminPassword),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garmin-status'] })
      setGarminPassword('')
      setGarminError('')
    },
    onError: () => setGarminError('Login failed. Check your credentials.'),
  })

  const whoopDisconnect = useMutation({
    mutationFn: api.whoopDisconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whoop-status'] }),
  })

  const garminDisconnect = useMutation({
    mutationFn: api.garminDisconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garmin-status'] }),
  })

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Connections</h1>
      <p className="mb-8" style={{ color: '#6b7990' }}>Connect your devices to start pulling in data.</p>

      <div className="space-y-4">
        {/* WHOOP */}
        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#FF3B5C22', color: '#FF3B5C', border: '1px solid #FF3B5C44' }}>W</div>
              <div>
                <p className="font-semibold">WHOOP</p>
                <p className="text-xs" style={{ color: '#6b7990' }}>OAuth 2.0</p>
              </div>
            </div>
            <StatusBadge connected={whoopStatus?.connected ?? false} />
          </div>

          {whoopStatus?.connected ? (
            <button
              onClick={() => whoopDisconnect.mutate()}
              className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: '#1e2535', color: '#6b7990' }}
            >
              Disconnect
            </button>
          ) : (
            <a
              href={api.whoopLoginUrl()}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all"
              style={{ background: '#FF3B5C', color: 'white' }}
            >
              Connect WHOOP <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Garmin */}
        <div className="rounded-xl border p-5" style={{ background: '#141923', borderColor: '#1e2535' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#4FC3F722', color: '#4FC3F7', border: '1px solid #4FC3F744' }}>G</div>
              <div>
                <p className="font-semibold">Garmin Connect</p>
                <p className="text-xs" style={{ color: '#6b7990' }}>Email & password</p>
              </div>
            </div>
            <StatusBadge connected={garminStatus?.connected ?? false} />
          </div>

          {garminStatus?.connected ? (
            <button
              onClick={() => garminDisconnect.mutate()}
              className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: '#1e2535', color: '#6b7990' }}
            >
              Disconnect
            </button>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); garminLogin.mutate() }}
              className="space-y-3"
            >
              <input
                type="email"
                placeholder="Garmin Connect email"
                value={garminEmail}
                onChange={e => setGarminEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-garmin"
                style={{ background: '#0d1117', borderColor: '#1e2535', color: 'white' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={garminPassword}
                onChange={e => setGarminPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:border-garmin"
                style={{ background: '#0d1117', borderColor: '#1e2535', color: 'white' }}
              />
              {garminError && <p className="text-xs" style={{ color: '#F87171' }}>{garminError}</p>}
              <button
                type="submit"
                disabled={garminLogin.isPending}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-60"
                style={{ background: '#4FC3F7', color: '#060810' }}
              >
                {garminLogin.isPending && <Loader2 size={13} className="animate-spin" />}
                Connect Garmin
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
