import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Canvas } from '@react-three/fiber'
import mqtt from 'mqtt'
import { NoiseBackground } from './components/NoiseBackground'
import { UIOverlay } from './components/UIOverlay'
import { LoadingOverlay } from './components/LoadingOverlay'

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
  const [showMainApp, setShowMainApp] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [blockColors, setBlockColors] = useState<[string, string, string]>(['#ffffff', '#ffffff', '#ffffff'])

  // 컬러 변수 - RGB 색상으로 변경
  const color1 = 'rgb(255, 0, 0)'    // 빨간색
  const color2 = 'rgb(0, 0, 255)'    // 파란색

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

  // WS2812 NeoPixel 색상 보정 함수 - 극단적 색상 분리
  const correctColorForWS2812 = (rgb: { r: number; g: number; b: number }) => {
    let { r, g, b } = rgb
    
    // 0-1 범위로 정규화
    r = r / 255
    g = g / 255
    b = b / 255
    
    // 1. 극단적 채도 강화 - 가장 강한 색상만 남기고 나머지는 최소화
    const maxChannel = Math.max(r, g, b)
    const threshold = 0.3  // 임계값
    
    if (maxChannel > threshold) {
      // 가장 강한 색상 채널 찾기
      const isRed = r >= g && r >= b
      const isGreen = g >= r && g >= b
      const isBlue = b >= r && b >= g
      
      // 주색상은 강화, 나머지는 대폭 감소
      if (isRed) {
        r = Math.min(r * 2.5, 1)  // 빨강 대폭 강화
        g = g * 0.1               // 초록 거의 제거
        b = b * 0.1               // 파랑 거의 제거
      } else if (isGreen) {
        r = r * 0.1               // 빨강 거의 제거
        g = Math.min(g * 2.5, 1)  // 초록 대폭 강화
        b = b * 0.1               // 파랑 거의 제거
      } else if (isBlue) {
        r = r * 0.1               // 빨강 거의 제거
        g = g * 0.1               // 초록 거의 제거
        b = Math.min(b * 2.5, 1)  // 파랑 대폭 강화
      }
    }
    
    // 2. 색상 혼합 영역을 위한 2차 보정
    const colorSum = r + g + b
    if (colorSum > 0.6 && colorSum < 1.5) {
      // 두 색상이 섞인 영역은 더 뚜렷한 중간색으로
      if (r > 0.2 && g > 0.2 && b < 0.2) {
        // 빨강+초록 = 노랑
        r = Math.min(r * 1.8, 1)
        g = Math.min(g * 1.8, 1)
        b = b * 0.05
      } else if (r > 0.2 && b > 0.2 && g < 0.2) {
        // 빨강+파랑 = 마젠타
        r = Math.min(r * 1.8, 1)
        g = g * 0.05
        b = Math.min(b * 1.8, 1)
      } else if (g > 0.2 && b > 0.2 && r < 0.2) {
        // 초록+파랑 = 시안
        r = r * 0.05
        g = Math.min(g * 1.8, 1)
        b = Math.min(b * 1.8, 1)
      }
    }
    
    // 3. 감마 보정
    const gamma = 1.8  // 더 강한 대비
    r = Math.pow(r, 1 / gamma)
    g = Math.pow(g, 1 / gamma)
    b = Math.pow(b, 1 / gamma)
    
    // 4. 최종 밝기 조정
    const maxBrightness = 0.9
    r = Math.min(r * maxBrightness, 1)
    g = Math.min(g * maxBrightness, 1)
    b = Math.min(b * maxBrightness, 1)
    
    // 255 범위로 복원
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    }
  }

  const handleTransmitColors = async () => {
    setIsLoading(true)

    try {
      // 원본 RGB 색상 추출
      const originalRgbColors = blockColors.map(convertColorToRgb)
      
      // WS2812에 최적화된 색상으로 보정
      const correctedRgbColors = originalRgbColors.map(correctColorForWS2812)

      console.log('Original colors:', originalRgbColors)
      console.log('Corrected colors for WS2812:', correctedRgbColors)

      if (mqttClient && mqttConnected) {
        const colorData = {
          block1: correctedRgbColors[0],
          block2: correctedRgbColors[1],
          block3: correctedRgbColors[2],
          timestamp: new Date().toISOString()
        }
        mqttClient.publish(MQTT_TOPIC, JSON.stringify(colorData), { qos: 0 })
      }

      if (supabase) {
        try {
          const { error } = await supabase.from('led_colors').insert([{
            color: JSON.stringify(correctedRgbColors),  // 보정된 색상만 저장
            timestamp: new Date().toISOString()
          }])
          
          if (error) {
            console.error('Supabase error:', JSON.stringify(error, null, 2))
            console.error('Error details:', error.message, error.code, error.details)
          } else {
            console.log('Colors saved to Supabase successfully')
          }
        } catch (err) {
          console.error('Supabase insert failed:', err)
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

      <div className={`transition-all duration-500 ease-in-out ${
        showMainApp ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <UIOverlay
          blockColors={blockColors}
          mqttConnected={mqttConnected}
          isLoading={isLoading}
          onTransmitColors={handleTransmitColors}
        />
      </div>

      {/* 로딩 오버레이 */}
      {!showMainApp && (
        <LoadingOverlay
          isConnected={mqttConnected}
          onComplete={() => setShowMainApp(true)}
        />
      )}
    </div>
  )
}

export default App