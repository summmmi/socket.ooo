import { ColorBlock } from './ColorBlock'

interface UIOverlayProps {
  blockColors: [string, string, string]
  mqttConnected: boolean
  isLoading: boolean
  onTransmitColors: () => void
}

export function UIOverlay({ blockColors, mqttConnected, isLoading, onTransmitColors }: UIOverlayProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 10, pointerEvents: 'none' }}>
      <div className="absolute top-6 left-6">
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

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col gap-2">
          <ColorBlock blockNumber={1} color={blockColors[0]} />
          <ColorBlock blockNumber={2} color={blockColors[1]} />
          <ColorBlock blockNumber={3} color={blockColors[2]} />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={onTransmitColors}
          disabled={isLoading || !mqttConnected}
          className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full hover:bg-white/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
        >
          {isLoading ? 'Transmitting...' : 'transmit color'}
        </button>
      </div>

    </div>
  )
}