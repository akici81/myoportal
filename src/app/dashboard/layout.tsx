import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { UserRole } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Profil bilgisini çek (Sadece kendi tablosu, departman JOIN'i iptal)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Eğer departmanı varsa ismini ayrı çek (Hata verirse yoksay)
  let departmentName = null
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', profile.department_id)
      .single()
    if (dept) departmentName = dept.name
  }

  // V1 Mantığı: Eğer email varsa username kısımlarını çıkart (@ öncesi)
  // Eğer tam isim varsa ek olarak bunu da profil ekranı için basabiliriz.
  const emailUsername = user.email ? user.email.split('@')[0] : profile.full_name
  const finalUsername = emailUsername || 'Kullanıcı'

  return (
    <div className="min-h-screen">
      <Sidebar
        role={profile.role as UserRole}
        userName={finalUsername}
        departmentName={departmentName}
      />
      <main className="layout-main">
        {children}
      </main>
    </div>
  )
}
