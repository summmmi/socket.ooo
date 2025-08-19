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
  const [currentTime, setCurrentTime] = useState(0)
  const [smoothBlockColors, setSmoothBlockColors] = useState<[string, string, string]>(['#ffffff', '#ffffff', '#ffffff'])
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  // Update time for real-time color updates
  useEffect(() => {
    const animationFrame = () => {
      setCurrentTime(Date.now() * 0.001)
      requestAnimationFrame(animationFrame)
    }
    requestAnimationFrame(animationFrame)
  }, [])

  // Smooth color interpolation
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    const rgb1 = color1.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    const rgb2 = color2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    
    if (!rgb1 || !rgb2) return color2
    
    const r = Math.round(parseInt(rgb1[1]) + (parseInt(rgb2[1]) - parseInt(rgb1[1])) * factor)
    const g = Math.round(parseInt(rgb1[2]) + (parseInt(rgb2[2]) - parseInt(rgb1[2])) * factor)
    const b = Math.round(parseInt(rgb1[3]) + (parseInt(rgb2[3]) - parseInt(rgb1[3])) * factor)
    
    return `rgb(${r}, ${g}, ${b})`
  }

  const getColorAtPosition = (x: number, y: number): string => {
    const uv = { x: x + offset.x * 0.0002, y: y + offset.y * 0.0002 }
    
    const scale1 = 0.8 + Math.sin(offset.x * 0.003) * 0.2
    const scale2 = 0.8 + Math.cos(offset.y * 0.003) * 0.2
    
    const timeOffset1 = currentTime * 0.1
    const timeOffset2 = currentTime * 0.08
    
    const noise1 = (Math.sin(uv.x * scale1 * 6 + uv.y * scale1 * 6 + timeOffset1) + 
                   Math.sin(uv.x * scale1 * 3 + timeOffset1 * 0.7)) * 0.25 + 0.5
    const noise2 = (Math.sin(uv.x * scale2 * 5 + uv.y * scale2 * 5 + timeOffset2) + 
                   Math.sin(uv.y * scale2 * 4 + timeOffset2 * 0.8)) * 0.25 + 0.5
    
    const mixStrength1 = Math.abs(noise1) * 0.6
    const mixStrength2 = Math.abs(noise2) * 0.6
    
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
    
    const bg = { r: 179, g: 179, b: 191 }
    const rgb1 = hslToRgb(color1)
    const rgb2 = hslToRgb(color2)
    
    let r = bg.r
    let g = bg.g  
    let b = bg.b
    
    r = r * (1 - mixStrength1) + rgb1.r * mixStrength1
    g = g * (1 - mixStrength1) + rgb1.g * mixStrength1
    b = b * (1 - mixStrength1) + rgb1.b * mixStrength1
    
    r = r * (1 - mixStrength2) + rgb2.r * mixStrength2
    g = g * (1 - mixStrength2) + rgb2.g * mixStrength2
    b = b * (1 - mixStrength2) + rgb2.b * mixStrength2
    
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

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
      setSmoothBlockColors(newColors)
    }, 50) // Update every 50ms for real-time effect
    
    return () => clearInterval(interval)
  }, [offset])



  const handleTransmitColors = async () => {
    setIsLoading(true)

    try {
      if (mqttClient && mqttConnected) {
        const rgbColors = smoothBlockColors.map(color => {
          // Handle hex colors from pixel reading
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)
            return { r, g, b }
          }
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
        const rgbColors = smoothBlockColors.map(color => {
          // Handle hex colors from pixel reading
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)
            return { r, g, b }
          }
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
        <NoiseBackground 
          color1={color1} 
          color2={color2} 
          offset={offset}
        />
      </Canvas>
      
      <UIOverlay 
        blockColors={smoothBlockColors}
        mqttConnected={mqttConnected}
        isLoading={isLoading}
        onTransmitColors={handleTransmitColors}
      />
    </div>
  )
}

export default App