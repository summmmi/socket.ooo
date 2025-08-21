import { useState, useEffect } from 'react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [blockColors, setBlockColors] = useState<[string, string, string]>(['#ffffff', '#ffffff', '#ffffff'])

  // 컬러 변수
  const color1 = 'hsl(53, 100%, 50%)'
  const color2 = 'hsl(134, 100%, 44%)'

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


  // Real-time color picking from WebGL
  useEffect(() => {
    const interval = setInterval(() => {
      const getPixelColor = (window as any).getPixelColor
      if (!getPixelColor) return

      const newColors = [
        getPixelColor(0.5, 0.2),
        getPixelColor(0.5, 0.5),
        getPixelColor(0.5, 0.8)
      ] as [string, string, string]

      setBlockColors(newColors)
    }, 50) // Update every 50ms for real-time effect

    return () => clearInterval(interval)
  }, [offset])



  const convertColorToRgb = (color: string) => {
    // Handle hex colors from pixel reading
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return { r, g, b }
    }
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : { r: 255, g: 255, b: 255 }
  }

  const handleTransmitColors = async () => {
    setIsLoading(true)

    try {
      const rgbColors = blockColors.map(convertColorToRgb)

      if (mqttClient && mqttConnected) {
        const colorData = {
          block1: rgbColors[0],
          block2: rgbColors[1],
          block3: rgbColors[2],
          timestamp: new Date().toISOString()
        }
        mqttClient.publish(MQTT_TOPIC, JSON.stringify(colorData), { qos: 0 })
      }

      if (supabase) {
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
        <NoiseBackground
          color1={color1}
          color2={color2}
          offset={offset}
        />
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