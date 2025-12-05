import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { table_name, column_name, row_id } = await request.json()
    const supabase = createServerSupabaseClient()

    // This is a simple increment function
    // In production, you'd want to use a database function for atomic operations
    const { data, error } = await supabase
      .from(table_name)
      .select(column_name)
      .eq("id", row_id)
      .single()

    if (error) throw error

    const currentValue = Number(data[column_name] || 0)
    const newValue = currentValue + 1

    const { error: updateError } = await supabase
      .from(table_name)
      .update({ [column_name]: newValue })
      .eq("id", row_id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

