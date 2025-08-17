import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import mqtt from 'mqtt'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// MQTT 브로커 설정 (HiveMQ Cloud 무료 브로커)
const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt'
const MQTT_TOPIC = 'arduino/led/color'

type Color = 'red' | 'green' | 'blue'

function App() {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null)
  const [mqttConnected, setMqttConnected] = useState(false)

  // MQTT 연결 설정
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `web_client_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    })

    client.on('connect', () => {
      console.log('MQTT Connected')
      setMqttConnected(true)
    })

    client.on('error', (error) => {
      console.error('MQTT Error:', error)
      setMqttConnected(false)
    })

    client.on('disconnect', () => {
      console.log('MQTT Disconnected')
      setMqttConnected(false)
    })

    setMqttClient(client)

    return () => {
      client.end()
    }
  }, [])

  const handleColorSelect = async (color: Color) => {
    setIsLoading(true)
    setSelectedColor(color)
    
    try {
      // 1. MQTT로 즉시 Arduino에 전송 (초고속)
      if (mqttClient && mqttConnected) {
        mqttClient.publish(MQTT_TOPIC, color, { qos: 0 }, (error) => {
          if (error) {
            console.error('MQTT publish error:', error)
          } else {
            console.log(`MQTT: Color ${color} sent to Arduino!`)
          }
        })
      } else {
        console.warn('MQTT not connected')
      }

      // 2. Supabase에 백업 저장 (선택사항)
      if (supabase) {
        const { error } = await supabase
          .from('led_colors')
          .insert([{ color, timestamp: new Date().toISOString() }])
        
        if (error) {
          console.error('Supabase error:', error)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonClass = (color: Color) => {
    const baseClass = "px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
    const colorClass = {
      red: "bg-red-500 hover:bg-red-600",
      green: "bg-green-500 hover:bg-green-600", 
      blue: "bg-blue-500 hover:bg-blue-600"
    }
    return `${baseClass} ${colorClass[color]}`
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Arduino LED Controller
        </h1>
        
        {/* MQTT 연결 상태 */}
        <div className="mb-6 text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            mqttConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              mqttConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}
          </div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => handleColorSelect('red')}
            disabled={isLoading || !mqttConnected}
            className={getButtonClass('red')}
          >
            {isLoading && selectedColor === 'red' ? 'Sending...' : 'Red'}
          </button>
          
          <button
            onClick={() => handleColorSelect('green')}
            disabled={isLoading || !mqttConnected}
            className={getButtonClass('green')}
          >
            {isLoading && selectedColor === 'green' ? 'Sending...' : 'Green'}
          </button>
          
          <button
            onClick={() => handleColorSelect('blue')}
            disabled={isLoading || !mqttConnected}
            className={getButtonClass('blue')}
          >
            {isLoading && selectedColor === 'blue' ? 'Sending...' : 'Blue'}
          </button>
        </div>
        
        {selectedColor && !isLoading && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Current color: <span className="font-semibold capitalize">{selectedColor}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ⚡ Sent via MQTT (Ultra Fast!)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App