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

  // WS2812B에서 잘 표현되는 색상들
  const LED_COLORS = {
    magenta: 'rgb(255, 0, 255)',
    hotPink: 'rgb(255, 0, 128)', 
    purple: 'rgb(128, 0, 255)',
    blue: 'rgb(0, 0, 255)',
    cyan: 'rgb(0, 255, 255)',
    white: 'rgb(255, 255, 255)'
  }

  // 컬러 변수 - WS2812B 친화적 색상으로 변경
  const color1 = LED_COLORS.magenta
  const color2 = LED_COLORS.cyan

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

  // RGB to HSV 변환 함수
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, v = max

    const d = max - min
    s = max === 0 ? 0 : d / max

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }

    return {
      h: Math.round(h * 360), // 0-360
      s: Math.round(s * 255), // 0-255
      v: Math.round(v * 255)  // 0-255
    }
  }


  const handleTransmitColors = async () => {
    setIsLoading(true)

    // 1초 딜레이 추가
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      // RGB 색상 추출 후 HSV로 변환
      const rgbColors = blockColors.map(convertColorToRgb)
      const hsvColors = rgbColors.map(rgb => rgbToHsv(rgb.r, rgb.g, rgb.b))

      console.log('Sending HSV colors:', hsvColors)

      // 먼저 현재 총 개수 확인
      if (supabase) {
        const { count: beforeCount } = await supabase
          .from('led_colors')
          .select('*', { count: 'exact', head: true })
        console.log('🔢 Row count before insert:', beforeCount)
      }

      if (mqttClient && mqttConnected) {
        const colorData = {
          mode: "hsv",
          block1: { h: hsvColors[2].h, s: hsvColors[2].s, v: hsvColors[2].v },  // 맨 아래
          block2: { h: hsvColors[1].h, s: hsvColors[1].s, v: hsvColors[1].v },  // 중간
          block3: { h: hsvColors[0].h, s: hsvColors[0].s, v: hsvColors[0].v },  // 맨 위
          timestamp: new Date().toISOString()
        }
        console.log('MQTT connected:', mqttConnected)
        console.log('Sending to Arduino:', JSON.stringify(colorData))
        mqttClient.publish(MQTT_TOPIC, JSON.stringify(colorData), { qos: 0 })
        console.log('MQTT message sent successfully')
      } else {
        console.log('MQTT not connected! Client:', !!mqttClient, 'Connected:', mqttConnected)
      }

      if (supabase) {
        try {
          console.log('🔍 Attempting Supabase insertion...')
          console.log('📊 Data to insert:', {
            color: JSON.stringify(hsvColors),
            timestamp: new Date().toISOString()
          })

          const { data, error, status, statusText } = await supabase.from('led_colors').insert([{
            color: JSON.stringify(hsvColors),
            timestamp: new Date().toISOString()
          }]).select()

          console.log('🔍 Full Supabase response:', { data, error, status, statusText })

          if (error) {
            console.error('❌ Supabase error:', JSON.stringify(error, null, 2))
            console.error('❌ Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            })
          }

          if (data && data.length > 0) {
            console.log('✅ Colors saved to Supabase successfully')
            console.log('📋 Inserted data:', data)

            // 삽입 후 총 개수 다시 확인
            const { count: afterCount } = await supabase
              .from('led_colors')
              .select('*', { count: 'exact', head: true })
            console.log('🔢 Row count after insert:', afterCount)

            // 최신 5개 행 확인 (컬럼명 수정)
            const { data: latestRows, error: latestError } = await supabase
              .from('led_colors')
              .select('id, timestamp, color')
              .order('timestamp', { ascending: false })
              .limit(5)
            console.log('📋 Latest 5 rows:', latestRows)
            if (latestError) console.log('📋 Latest rows error:', latestError)

          } else if (!error) {
            console.log('⚠️ No error but no data returned - possible RLS issue')

            // RLS 정책 확인을 위한 테스트
            const { data: testSelect, error: selectError } = await supabase
              .from('led_colors')
              .select('*')
              .order('id', { ascending: false })
              .limit(5)

            console.log('🔍 Recent rows check:', { testSelect, selectError })
          }
        } catch (err) {
          console.error('💥 Supabase insert failed with exception:', err)
          console.error('💥 Error stack:', (err as Error).stack)
        }
      } else {
        console.log('⚠️ Supabase client is null - not configured properly')
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

      <div className={`transition-all duration-500 ease-in-out ${showMainApp ? 'opacity-100' : 'opacity-0 pointer-events-none'
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