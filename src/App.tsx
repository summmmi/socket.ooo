import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

type Color = 'red' | 'green' | 'blue'

function App() {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleColorSelect = async (color: Color) => {
    setIsLoading(true)
    setSelectedColor(color)
    
    try {
      const { error } = await supabase
        .from('led_colors')
        .insert([{ color, timestamp: new Date().toISOString() }])
      
      if (error) {
        console.error('Error saving color:', error)
      } else {
        console.log('Color saved successfully:', color)
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
        <h1 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          Arduino LED Controller
        </h1>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => handleColorSelect('red')}
            disabled={isLoading}
            className={getButtonClass('red')}
          >
            {isLoading && selectedColor === 'red' ? 'Setting...' : 'Red'}
          </button>
          
          <button
            onClick={() => handleColorSelect('green')}
            disabled={isLoading}
            className={getButtonClass('green')}
          >
            {isLoading && selectedColor === 'green' ? 'Setting...' : 'Green'}
          </button>
          
          <button
            onClick={() => handleColorSelect('blue')}
            disabled={isLoading}
            className={getButtonClass('blue')}
          >
            {isLoading && selectedColor === 'blue' ? 'Setting...' : 'Blue'}
          </button>
        </div>
        
        {selectedColor && !isLoading && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Current color: <span className="font-semibold capitalize">{selectedColor}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App