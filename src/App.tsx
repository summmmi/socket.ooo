import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Canvas } from '@react-three/fiber'
import mqtt from 'mqtt'
import { NoiseBackground } from './components/NoiseBackground'
import { UIOverlay } from './components/UIOverlay'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = (supabaseUrl && supabaseKey && supabaseUrl.trim() && supabaseKey.trim())
  ? createClient(supabaseUrl.trim(), supabaseKey.trim())
  : null

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt'
const MQTT_TOPIC = 'arduino/led/color'

const isBrowser = typeof window !== 'undefined'


function App() {
  const [blockColors, setBlockColors] = useState<[string, string, string]>(['#ffffff', '#ffffff', '#ffffff'])
  const [isLoading, setIsLoading] = useState(false)
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })

  // 컬러 변수
  const color1 = 'hsl(152, 42%, 79%)'
  const color2 = 'hsl(227, 100%, 23%)'

  useEffect(() => {
    if (!isBrowser) return

    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `web_client_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      protocolVersion: 4,
      keepalive: 60
    })

    client.on('connect', () => {
      setMqttConnected(true)
    })

    client.on('error', () => {
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
    let currentLastPosition = lastPosition
    let currentIsDragging = isDragging

    const handleMouseDown = (e: MouseEvent) => {
      currentIsDragging = true
      currentLastPosition = { x: e.clientX, y: e.clientY }
      setIsDragging(true)
      setLastPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (currentIsDragging) {
        const deltaX = e.clientX - currentLastPosition.x
        const deltaY = e.clientY - currentLastPosition.y
        setOffset(prev => ({
          x: prev.x + deltaX * 0.5,
          y: prev.y + deltaY * 0.5
        }))
        currentLastPosition = { x: e.clientX, y: e.clientY }
        setLastPosition({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      currentIsDragging = false
      setIsDragging(false)
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        currentIsDragging = true
        currentLastPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setIsDragging(true)
        setLastPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (currentIsDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - currentLastPosition.x
        const deltaY = e.touches[0].clientY - currentLastPosition.y
        setOffset(prev => ({
          x: prev.x + deltaX * 0.5,
          y: prev.y + deltaY * 0.5
        }))
        currentLastPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        setLastPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
    }

    const handleTouchEnd = () => {
      currentIsDragging = false
      setIsDragging(false)
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const getColorAtPosition = (x: number, y: number): string => {
    // 3D 환경에서 색상 샘플링은 shader에서 계산된 값으로 근사치 사용
    const t = Math.sin((x + offset.x * 0.001) * 3 + (y + offset.y * 0.001) * 2) * 0.5 + 0.5
    
    // HSL을 RGB로 변환
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
    
    const rgb1 = hslToRgb(color1)
    const rgb2 = hslToRgb(color2)
    
    const r = Math.floor(rgb1.r * (1 - t) + rgb2.r * t)
    const g = Math.floor(rgb1.g * (1 - t) + rgb2.g * t)
    const b = Math.floor(rgb1.b * (1 - t) + rgb2.b * t)
    
    return `rgb(${r}, ${g}, ${b})`
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
        const rgbColors = blockColors.map(color => {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : { r: 255, g: 255, b: 255 }
        })

        const colorData = {
          block1: rgbColors[0],
          block2: rgbColors[1],
          block3: rgbColors[2],
          timestamp: new Date().toISOString()
        }

        mqttClient.publish(MQTT_TOPIC, JSON.stringify(colorData), { qos: 0 })
      }

      if (supabase) {
        const rgbColors = blockColors.map(color => {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : { r: 255, g: 255, b: 255 }
        })
        await supabase.from('led_colors').insert([{
          color: JSON.stringify(rgbColors),
          timestamp: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 w-full h-full"
      style={{ 
        touchAction: 'none', 
        cursor: isDragging ? 'grabbing' : 'grab', 
        zIndex: 0
      }}
    >
      <Canvas 
        className="w-full h-full" 
        camera={{ position: [0, 0, 5], fov: 75 }}
      >
        <NoiseBackground color1={color1} color2={color2} offset={offset} />
      </Canvas>
      
      <UIOverlay 
        blockColors={blockColors}
        mqttConnected={mqttConnected}
        isLoading={isLoading}
        onTransmitColors={handleTransmitColors}
      />
    </div>
  )
}

export default App