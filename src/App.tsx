import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import mqtt from 'mqtt'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('Environment check:')
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Missing')

const supabase = (supabaseUrl && supabaseKey && supabaseUrl.trim() && supabaseKey.trim())
  ? createClient(supabaseUrl.trim(), supabaseKey.trim())
  : null

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt'
const MQTT_TOPIC = 'arduino/led/color'

const isBrowser = typeof window !== 'undefined'

const hslToRgb = (hslString: string) => {
  const hslMatch = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!hslMatch) return { r: 0, g: 0, b: 0 }

  const h = parseInt(hslMatch[1]) / 360
  const s = parseInt(hslMatch[2]) / 100
  const l = parseInt(hslMatch[3]) / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function App() {
  const [blockColors, setBlockColors] = useState<[string, string, string]>(['#ffffff', '#ffffff', '#ffffff'])
  const [isLoading, setIsLoading] = useState(false)
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const gradientRef = useRef<HTMLDivElement>(null)
  const block1Ref = useRef<HTMLDivElement>(null)
  const block2Ref = useRef<HTMLDivElement>(null)
  const block3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isBrowser) return

    console.log('Initializing MQTT connection...')
    console.log('MQTT Broker:', MQTT_BROKER)

    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `web_client_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      protocolVersion: 4,
      keepalive: 60
    })

    client.on('connect', () => {
      console.log('MQTT Connected successfully!')
      setMqttConnected(true)
    })

    client.on('error', (error) => {
      console.error('MQTT Connection Error:', error)
      setMqttConnected(false)
    })

    client.on('disconnect', () => {
      console.log('MQTT Disconnected')
      setMqttConnected(false)
    })

    client.on('offline', () => {
      console.log('MQTT Offline')
      setMqttConnected(false)
    })

    setMqttClient(client)

    return () => {
      if (client) {
        client.end()
      }
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - lastPosition.x
        const deltaY = e.clientY - lastPosition.y
        setOffset(prev => ({
          x: prev.x - deltaX,
          y: prev.y - deltaY
        }))
        setLastPosition({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, lastPosition])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastPosition({ x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setLastPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault()
      const deltaX = e.touches[0].clientX - lastPosition.x
      const deltaY = e.touches[0].clientY - lastPosition.y
      setOffset(prev => ({
        x: prev.x - deltaX,
        y: prev.y - deltaY
      }))
      setLastPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const getColorAtPosition = (x: number, y: number): string => {
    const worldX = x + (offset.x * 0.001)
    const worldY = y + (offset.y * 0.001)
    
    const noise = Math.sin(worldX * 3.14) * Math.cos(worldY * 2.71) * 0.5 + 0.5
    const noise2 = Math.sin(worldX * 2.71) * Math.cos(worldY * 3.14) * 0.5 + 0.5
    
    const baseHue = 290
    const hueShift = noise * 120
    const finalHue = (baseHue + hueShift) % 360
    
    const sat = 70 + (noise2 * 30)
    const light = 45 + (noise * 25)

    return `hsl(${Math.round(finalHue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`
  }

  const updateBlockColors = () => {
    const color1 = getColorAtPosition(0.5, 0.2)
    const color2 = getColorAtPosition(0.5, 0.5)
    const color3 = getColorAtPosition(0.5, 0.8)

    setBlockColors([color1, color2, color3])
  }

  useEffect(() => {
    updateBlockColors()
  }, [offset])

  const handleTransmitColors = async () => {
    setIsLoading(true)

    try {
      if (mqttClient && mqttConnected) {
        const rgbColors = blockColors.map(color => hslToRgb(color))

        const colorData = {
          block1: rgbColors[0],
          block2: rgbColors[1],
          block3: rgbColors[2],
          timestamp: new Date().toISOString()
        }

        mqttClient.publish(MQTT_TOPIC, JSON.stringify(colorData), { qos: 0 }, (error) => {
          if (error) {
            console.error('MQTT publish error:', error)
          } else {
            console.log('MQTT: 3 colors sent to Arduino!', colorData)
          }
        })
      } else {
        console.warn('MQTT not connected')
      }

      if (supabase) {
        try {
          const rgbColors = blockColors.map(color => hslToRgb(color))
          const { error } = await supabase
            .from('led_colors')
            .insert([{
              color: JSON.stringify(rgbColors),
              timestamp: new Date().toISOString()
            }])

          if (error) {
            console.error('Supabase error:', error)
          } else {
            console.log('Supabase: 3 colors saved successfully')
          }
        } catch (supabaseError) {
          console.error('Supabase connection error:', supabaseError)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={gradientRef}
      style={{
        background: `
          radial-gradient(ellipse ${150 + Math.sin(offset.x * 0.003) * 25}% ${80 + Math.cos(offset.y * 0.002) * 20}% at ${25 + offset.x * 0.05 + Math.sin(offset.x * 0.004 + 1.2) * 15}% ${35 + offset.y * 0.04 + Math.cos(offset.y * 0.003 + 2.1) * 18}%, hsl(290, 87%, 47%) 0%, transparent 65%),
          radial-gradient(ellipse ${120 + Math.cos(offset.x * 0.0025) * 30}% ${160 + Math.sin(offset.y * 0.002) * 25}% at ${75 + offset.x * 0.03 + Math.cos(offset.x * 0.003 + 3.4) * 20}% ${65 + offset.y * 0.06 + Math.sin(offset.y * 0.004 + 1.8) * 22}%, hsl(167, 72%, 60%) 0%, transparent 70%),
          radial-gradient(ellipse ${180 + Math.sin(offset.x * 0.002) * 35}% ${100 + Math.cos(offset.y * 0.003) * 28}% at ${50 + offset.x * 0.04 + Math.sin(offset.x * 0.005 + 4.7) * 25}% ${25 + offset.y * 0.05 + Math.cos(offset.y * 0.0025 + 0.9) * 30}%, hsl(320, 75%, 45%) 0%, transparent 75%),
          radial-gradient(ellipse ${140 + Math.cos(offset.x * 0.004) * 40}% ${130 + Math.sin(offset.y * 0.0015) * 30}% at ${15 + offset.x * 0.02 + Math.cos(offset.x * 0.002 + 2.3) * 18}% ${80 + offset.y * 0.03 + Math.sin(offset.y * 0.003 + 5.2) * 15}%, hsl(177, 65%, 55%) 0%, transparent 80%),
          radial-gradient(ellipse ${170 + Math.sin(offset.x * 0.0018) * 20}% ${110 + Math.cos(offset.y * 0.003) * 35}% at ${85 + offset.x * 0.06 + Math.sin(offset.x * 0.004 + 1.7) * 12}% ${55 + offset.y * 0.04 + Math.cos(offset.y * 0.005 + 3.8) * 20}%, hsl(280, 80%, 50%) 0%, transparent 85%),
          radial-gradient(ellipse ${160 + Math.cos(offset.x * 0.0012) * 32}% ${90 + Math.sin(offset.y * 0.0045) * 28}% at ${45 + offset.x * 0.07 + Math.cos(offset.x * 0.006 + 6.1) * 28}% ${70 + offset.y * 0.08 + Math.sin(offset.y * 0.002 + 4.5) * 25}%, hsl(220, 70%, 55%) 0%, transparent 90%),
          linear-gradient(135deg, hsl(290, 87%, 47%) 0%, hsl(167, 72%, 60%) 100%)
        `,
        filter: 'contrast(1.1) saturate(1.2)'
      }}
    >
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-white text-2xl font-light mb-2">
          socket@web
        </h1>

        <div className="text-white/80 text-sm">
          {mqttConnected ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>pocket@device is active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
              <span>Searching for pocket@device</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col gap-2">
          <div
            ref={block1Ref}
            className="w-48 h-32 border-2 border-white/30 rounded-lg backdrop-blur-sm"
            style={{ backgroundColor: blockColors[0] + '80' }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/80 text-xs">
              Block 1
            </div>
          </div>

          <div
            ref={block2Ref}
            className="w-48 h-32 border-2 border-white/30 rounded-lg backdrop-blur-sm"
            style={{ backgroundColor: blockColors[1] + '80' }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/80 text-xs">
              Block 2
            </div>
          </div>

          <div
            ref={block3Ref}
            className="w-48 h-32 border-2 border-white/30 rounded-lg backdrop-blur-sm"
            style={{ backgroundColor: blockColors[2] + '80' }}
          >
            <div className="w-full h-full flex items-center justify-center text-white/80 text-xs">
              Block 3
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <button
          onClick={handleTransmitColors}
          disabled={isLoading || !mqttConnected}
          className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full hover:bg-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
        >
          {isLoading ? 'Transmitting...' : 'transmit color'}
        </button>
      </div>

      <div className="absolute bottom-6 left-6 z-10 text-white/60 text-sm">
        <p>Drag to explore endless patterns</p>
        <p className="text-xs mt-1">Colors update in real-time</p>
      </div>
    </div>
  )
}

export default App