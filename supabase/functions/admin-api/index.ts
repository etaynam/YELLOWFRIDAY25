// Supabase Edge Function - Admin API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const resource = pathParts[pathParts.length - 1] // messages, blocked-ips, etc.
    const body = await req.json().catch(() => ({}))
    const { action, ...data } = body

    // Authentication - בדיקת JWT token מ-Supabase Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'לא מאומת' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // בדיקת JWT token ווידוא שהמשתמש הוא אדמין
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'לא מאומת' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // בדיקה אם המשתמש הוא אדמין
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', user.id)
      .single()

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ error: 'אין לך הרשאות אדמין' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // נניח שהטוקן הוא base64 של username:password

    // Messages
    if (resource === 'messages') {
      if (action === 'list') {
        const { limit = 50, offset = 0 } = data
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error
        return new Response(JSON.stringify({ messages }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'delete') {
        const { messageId } = data
        const { error } = await supabase
          .from('chat_messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', messageId)

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Blocked IPs
    if (resource === 'blocked-ips') {
      if (action === 'list') {
        const { data: blocked, error } = await supabase
          .from('blocked_ips')
          .select('*')
          .order('blocked_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify({ blocked }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'add') {
        const { ip_address, reason } = data
        const { error } = await supabase
          .from('blocked_ips')
          .insert({ ip_address, reason })

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'remove') {
        const { id } = data
        const { error } = await supabase
          .from('blocked_ips')
          .delete()
          .eq('id', id)

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Forbidden Words
    if (resource === 'forbidden-words') {
      if (action === 'list') {
        const { data: words, error } = await supabase
          .from('forbidden_words')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify({ words }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'add') {
        const { word } = data
        const { error } = await supabase
          .from('forbidden_words')
          .insert({ word })

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'remove') {
        const { id } = data
        const { error } = await supabase
          .from('forbidden_words')
          .delete()
          .eq('id', id)

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Announcements
    if (resource === 'announcements') {
      if (action === 'list') {
        const { data: announcements, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify({ announcements }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'create') {
        const { title, text, image_url, link_url, link_text, expires_at } = data
        const { data: announcement, error } = await supabase
          .from('announcements')
          .insert({ title, text, image_url, link_url, link_text, expires_at, is_active: true })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify({ announcement }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'update') {
        const { id, ...updates } = data
        const { error } = await supabase
          .from('announcements')
          .update(updates)
          .eq('id', id)

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (action === 'delete') {
        const { id } = data
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id)

        if (error) throw error
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-api:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

