'use client'

import { useState } from 'react'

const USERS = [
  { id: '0542db35-de1f-41fc-8228-a3f60bfa5bff', name: 'Doğukan BAYESEN', email: 'dogukan.bayesen@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: '067aa742-d883-4f58-ac92-dfddbbd3bf52', name: 'Enis Edip AKICI', email: 'eedip.akici@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: '06a8ac52-31b2-43ae-8cb1-ba0439e72657', name: 'Sevcan ÖZKAN', email: 'sevcan.battal@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: '12cd4a23-ae46-4020-9af0-8dae0bf2f67e', name: 'Dila EVLİYAOĞLU', email: 'dila.evliyaoglu@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000006', deptName: 'GRA/ICM' },
  { id: '1dba3cae-94e5-4b3d-a21b-1281ab8cd627', name: 'Osman İlker AÇIKGÖZ', email: 'oilker.acikgoz@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000005', deptName: 'UCT' },
  { id: '2efa9634-9d8d-49a7-9ba8-30b4d2f04e29', name: 'Merve ÇEVİK GÜNGÖR', email: 'merve.cevikgungor@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000006', deptName: 'GRA/ICM' },
  { id: '35fd0c97-01cf-4ad8-9f6a-801a5c1fdb15', name: 'Mehmet ATICI', email: 'mehmet.atici@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000003', deptName: 'BLG' },
  { id: '408b74d4-0be6-4239-9f4f-a5fe64f7cc3b', name: 'Selin GÖKMEN', email: 'selin.gokmen@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: '5672a496-e51f-4401-870b-fe451df98dae', name: 'Canmert DEMİR', email: 'canmert.demir@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000003', deptName: 'BLG' },
  { id: '65a5a79b-b367-45db-9a6f-9b7b74de35e2', name: 'Cemil GÜNERİ', email: 'cemil.guneri@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000004', deptName: 'SHU/SHK' },
  { id: '8088fc50-8dd9-4646-89d6-8e16d3979951', name: 'Ergin AKIN', email: 'ergin.akin@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000006', deptName: 'GRA/ICM' },
  { id: '8120057f-f3fc-47e7-b81f-954421cec876', name: 'M. Mine ÇAPUR', email: 'mine.capur@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000004', deptName: 'SHU/SHK' },
  { id: '897f3382-7e9e-463d-91b4-ce16110a6110', name: 'Bülent TATAR', email: 'bulent.tatar@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000001', deptName: 'MBH' },
  { id: '8c4af486-516d-44ca-8723-a9fd6aac44fb', name: 'Gürhan GÜNGÖRDÜ', email: 'gurhan.gungordu@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000005', deptName: 'UCT' },
  { id: '91605231-1944-4883-af7d-f885f4f0c6fc', name: 'Hüseyin Şahin ÖNSOY', email: 'hsahin.onsoy@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000004', deptName: 'SHU/SHK' },
  { id: '9b053413-0da3-40b4-aa91-a58dcd0ac3fb', name: 'Oğulcan USUFLU', email: 'ogulcan.usuflu@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000007', deptName: 'SPY/YON' },
  { id: 'ad60d342-2ef5-415f-8234-d18b743e3777', name: 'Reyhan KESGİN ÜZEN', email: 'reyhan.kesgin@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000006', deptName: 'GRA/ICM' },
  { id: 'b344a59e-883b-4194-b4b7-1f4678ad0d28', name: 'Furkan İŞBİLEN', email: 'furkan.isbilen@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000005', deptName: 'UCT' },
  { id: 'b72c6d69-61c7-4309-8eb9-2aac5f440dc4', name: 'Murat Alper GÜVEN', email: 'malper.guven@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000001', deptName: 'MBH' },
  { id: 'b86ec438-14cb-41d9-873f-b6944e8a1521', name: 'Ataberk ÇELİK', email: 'ataberk.celik@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: 'd0dc8c0f-0f4d-4b82-b4a4-35c32a1057f0', name: 'Abdullah YAVUZ', email: 'abdullah.yavuz@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000003', deptName: 'BLG' },
  { id: 'dcb2b62d-a8ae-4811-ac0b-f655381e931a', name: 'Emrah ÖZDEMİR', email: 'emrah.ozdemir@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000007', deptName: 'SPY/YON' },
  { id: 'dffd4613-89dd-4320-ab18-db81706ad386', name: 'Şeyma Nur ÜZÜM', email: 'seymanur.uzum@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000002', deptName: 'OLH' },
  { id: 'e3b19abb-954e-4f53-ae8c-7250a77bc3a8', name: 'Birsu Ece EKMEKÇİ', email: 'birsu.ekmekci@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000004', deptName: 'SHU/SHK' },
  { id: 'ea0986c8-3078-4c50-b8bf-417d145a5eb1', name: 'Şebnem TAMER', email: 'sebnem.tamer@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000004', deptName: 'SHU/SHK' },
  { id: 'fa7883b2-6616-4158-b308-4bb24828c56a', name: 'Yiğit Er YİĞİT', email: 'yigiter.yigit@rumeli.edu.tr', dept: 'a0000000-0000-0000-0000-000000000006', deptName: 'GRA/ICM' },
]

type Status = 'pending' | 'processing' | 'success' | 'error' | 'exists'

interface UserState {
  status: Status
  message: string
}

export default function BulkAddUsersPage() {
  const [states, setStates] = useState<Record<string, UserState>>(
    Object.fromEntries(USERS.map(u => [u.id, { status: 'pending', message: '' }]))
  )
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const pauseRef = { current: false }

  const updateState = (id: string, status: Status, message = '') =>
    setStates(prev => ({ ...prev, [id]: { status, message } }))

  const addUser = async (user: typeof USERS[0]) => {
    updateState(user.id, 'processing')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: 'Rumeli2025!',
          full_name: user.name,
          role: 'instructor',
          department_id: user.dept,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        updateState(user.id, 'success', data.userId)
      } else {
        const msg = data.error || ''
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
          updateState(user.id, 'exists', 'Zaten kayıtlı')
        } else {
          updateState(user.id, 'error', msg)
        }
      }
    } catch (e: any) {
      updateState(user.id, 'error', e.message)
    }
  }

  const startAll = async () => {
    setRunning(true)
    setPaused(false)
    pauseRef.current = false

    for (const user of USERS) {
      if (pauseRef.current) break
      if (states[user.id].status === 'pending' || states[user.id].status === 'error') {
        await addUser(user)
        await new Promise(r => setTimeout(r, 800))
      }
    }
    setRunning(false)
  }

  const counts = {
    success: Object.values(states).filter(s => s.status === 'success').length,
    exists: Object.values(states).filter(s => s.status === 'exists').length,
    error: Object.values(states).filter(s => s.status === 'error').length,
    pending: Object.values(states).filter(s => s.status === 'pending').length,
    processing: Object.values(states).filter(s => s.status === 'processing').length,
  }

  const done = counts.success + counts.exists + counts.error
  const progress = Math.round((done / USERS.length) * 100)

  const statusStyle: Record<Status, string> = {
    pending:    'bg-gray-100 text-gray-500',
    processing: 'bg-amber-100 text-amber-700',
    success:    'bg-green-100 text-green-700',
    exists:     'bg-blue-100 text-blue-700',
    error:      'bg-red-100 text-red-700',
  }

  const statusLabel: Record<Status, string> = {
    pending:    'Bekliyor',
    processing: 'İşleniyor...',
    success:    '✓ Oluşturuldu',
    exists:     '● Zaten Var',
    error:      '✗ Hata',
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="card p-6 rounded-xl border">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Toplu Öğretim Elemanı Ekleme
        </h1>
        <p className="text-muted text-sm mt-1">
          26 öğretim elemanı için kullanıcı hesabı oluşturulacak. Ortak şifre: <strong>Rumeli2025!</strong>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Toplam', value: USERS.length, color: 'text-gray-600' },
          { label: 'Başarılı', value: counts.success, color: 'text-green-600' },
          { label: 'Zaten Var', value: counts.exists, color: 'text-blue-600' },
          { label: 'Hata', value: counts.error, color: 'text-red-600' },
          { label: 'Bekliyor', value: counts.pending, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="card rounded-xl border p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card rounded-xl border p-4">
        <div className="flex justify-between text-sm text-muted mb-2">
          <span>İlerleme</span>
          <span>{done} / {USERS.length} ({progress}%)</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #B71C1C, #EF4444)' }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={startAll}
          disabled={running || done === USERS.length}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? '⏳ Çalışıyor...' : '▶ Tümünü Başlat'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border card hover:bg-gray-100 transition-colors"
          style={{ color: 'var(--text)' }}
        >
          🔄 Sıfırla
        </button>
      </div>

      {/* User list */}
      <div className="card rounded-xl border overflow-hidden">
        {USERS.map((user, i) => {
          const s = states[user.id]
          return (
            <div
              key={user.id}
              className={`flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 transition-colors ${
                s.status === 'success' ? 'bg-green-50/50' :
                s.status === 'error' ? 'bg-red-50/50' :
                s.status === 'processing' ? 'bg-amber-50/50' : ''
              }`}
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{user.name}</div>
                <div className="text-xs text-muted">{user.email}</div>
                {s.status === 'error' && (
                  <div className="text-xs text-red-500 mt-0.5">{s.message}</div>
                )}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: 'var(--text)' }}>
                {user.deptName}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle[s.status]}`}>
                {statusLabel[s.status]}
              </span>
              <button
                onClick={() => addUser(user)}
                disabled={running || s.status === 'processing' || s.status === 'success' || s.status === 'exists'}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Ekle
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
