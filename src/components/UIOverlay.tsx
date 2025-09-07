
interface UIOverlayProps {
  blockColors: [string, string, string]
  mqttConnected: boolean
  isLoading: boolean
  onTransmitColors: () => void
}

export function UIOverlay({ blockColors, mqttConnected, isLoading, onTransmitColors }: UIOverlayProps) {
  return (
    <div className="absolute inset-0 w-full" style={{ zIndex: 10, pointerEvents: 'none' }}>
      <div className="absolute top-6 left-1/2 transform w-full -translate-x-1/2" style={{ isolation: 'isolate' }}>
        <h1 className="text-white leading-loose text-2xl font-light mb-2 flex items-center justify-center gap-3" style={{ mixBlendMode: 'difference' }}>
          socket {"{"}
          {mqttConnected ? (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ marginTop: '2px' }}></div>
          ) : (
            <span>-</span>
          )}
          {" }"} pocket
        </h1>


      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <svg width="240" height="230" viewBox="0 0 260 252"
            className={`drop-shadow-lg ${isLoading ? 'animate-pulse' : ''
              }`}
            style={{
              opacity: isLoading ? 0.5 : 1,
              animation: isLoading ? 'pulse 1s ease-in-out infinite' : 'none'
            }}
          >
            <defs>
              <linearGradient id="lampGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={blockColors[0]} stopOpacity="0.7" />
                <stop offset="15%" stopColor={blockColors[0]} stopOpacity="0.7" />
                <stop offset="35%" stopColor={blockColors[1]} stopOpacity="0.7" />
                <stop offset="45%" stopColor={blockColors[1]} stopOpacity="0.7" />
                <stop offset="95%" stopColor={blockColors[2]} stopOpacity="0.7" />
                <stop offset="100%" stopColor={blockColors[2]} stopOpacity="0.7" />
              </linearGradient>
              <mask id="lampMask">
                <path d="M192.717 8L192.855 8.27539L247.571 117.089C248.964 119.665 250.902 124.373 251.727 126.434C252.011 127.144 252.169 128.313 252.049 129.484C251.929 130.654 251.52 131.937 250.559 132.778C249.709 133.522 248.875 134.137 247.625 134.554C246.39 134.965 244.779 135.173 242.382 135.173H204.664C203.898 135.392 202.652 135.846 201.357 136.515C200.023 137.204 198.675 138.103 197.742 139.174C195.31 141.969 193.923 144.564 193.524 147.947C193.487 148.265 193.454 149.503 193.428 151.539C193.402 153.556 193.382 156.32 193.369 159.653C193.343 166.321 193.34 175.267 193.353 185.08C193.377 204.707 193.459 227.804 193.528 243.085L193.53 243.587H66.5586L66.5605 243.085C66.6294 227.804 66.7122 204.707 66.7363 185.08C66.7484 175.267 66.746 166.321 66.7197 159.653C66.7066 156.32 66.6872 153.556 66.6611 151.539C66.6348 149.503 66.6018 148.265 66.5645 147.947C66.1662 144.564 64.7788 141.969 62.3467 139.174C61.4143 138.103 60.0658 137.204 58.7314 136.515C57.4373 135.846 56.1905 135.392 55.4248 135.173H17.707C15.31 135.173 13.6992 134.965 12.4639 134.554C11.2136 134.137 10.3802 133.522 9.53027 132.778C8.56926 131.937 8.15979 130.654 8.04004 129.484C7.92023 128.313 8.07826 127.144 8.3623 126.434C9.18655 124.373 11.1249 119.665 12.5176 117.089L67.2334 8.27539L67.3721 8H192.717Z" fill="white" />
              </mask>
            </defs>

            {/* 흰색 테두리 */}
            <path d="M192.717 8L192.855 8.27539L247.571 117.089C248.964 119.665 250.902 124.373 251.727 126.434C252.011 127.144 252.169 128.313 252.049 129.484C251.929 130.654 251.52 131.937 250.559 132.778C249.709 133.522 248.875 134.137 247.625 134.554C246.39 134.965 244.779 135.173 242.382 135.173H204.664C203.898 135.392 202.652 135.846 201.357 136.515C200.023 137.204 198.675 138.103 197.742 139.174C195.31 141.969 193.923 144.564 193.524 147.947C193.487 148.265 193.454 149.503 193.428 151.539C193.402 153.556 193.382 156.32 193.369 159.653C193.343 166.321 193.34 175.267 193.353 185.08C193.377 204.707 193.459 227.804 193.528 243.085L193.53 243.587H66.5586L66.5605 243.085C66.6294 227.804 66.7122 204.707 66.7363 185.80C66.7484 175.267 66.746 166.321 66.7197 159.653C66.7066 156.32 66.6872 153.556 66.6611 151.539C66.6348 149.503 66.6018 148.265 66.5645 147.947C66.1662 144.564 64.7788 141.969 62.3467 139.174C61.4143 138.103 60.0658 137.204 58.7314 136.515C57.4373 135.846 56.1905 135.392 55.4248 135.173H17.707C15.31 135.173 13.6992 134.965 12.4639 134.554C11.2136 134.137 10.3802 133.522 9.53027 132.778C8.56926 131.937 8.15979 130.654 8.04004 129.484C7.92023 128.313 8.07826 127.144 8.3623 126.434C9.18655 124.373 11.1249 119.665 12.5176 117.089L67.2334 8.27539L67.3721 8H192.717Z"
              fill="rgba(255,255,255,0.4)"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="5"
              className="transition-all duration-1000"
            />

            {/* 그라데이션 */}
            <rect width="260" height="252" fill="url(#lampGradient)" mask="url(#lampMask)" />
          </svg>

        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
        <button
          onClick={onTransmitColors}
          disabled={isLoading || !mqttConnected}
          className="bg-white/20 backdrop-blur-sm border border-white/80 text-white px-8 py-4 rounded-full hover:bg-white/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
          style={{ mixBlendMode: 'difference' }}
        >
          {isLoading ? 'sending...' : 'send to pocket'}
        </button>
      </div>

    </div>
  )
}