import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('led_colors')
        .select('color, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (!data || data.length === 0) {
        return res.json({ color: 'red', timestamp: new Date().toISOString() })
      }

      return res.json(data[0])
    } catch (error) {
      console.error('Error fetching color:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}