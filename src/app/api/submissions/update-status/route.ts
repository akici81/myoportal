import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const body = await request.json()
    const { entity_type, entity_id, new_status } = body

    if (!entity_type || !entity_id || !new_status) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const tableName = entity_type === 'internship' ? 'internship_records' : 'general_requests'

    const { error } = await supabase
      .from(tableName)
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq('id', entity_id)

    if (error) throw error

    // Revalidation işlemi gerekirse burada yapılabilir
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
