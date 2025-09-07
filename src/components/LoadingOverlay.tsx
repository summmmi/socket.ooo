import { useEffect, useState } from 'react'

interface LoadingOverlayProps {
  isConnected: boolean
  onComplete: () => void
}

export function LoadingOverlay({ isConnected, onComplete }: LoadingOverlayProps) {
  const [stage, setStage] = useState<'searching' | 'found' | 'complete'>('searching')
  const [dots, setDots] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  // 검색 중 랜덤 문구들
  const searchingPhrases = [
    'searching for nearby Pockets',
  ]

  const [currentPhrase] = useState(() =>
    searchingPhrases[Math.floor(Math.random() * searchingPhrases.length)]
  )

  // 초기 로딩 애니메이션
  useEffect(() => {
    // 컴포넌트 마운트 직후 페이드인
    setTimeout(() => {
      setHasLoaded(true)
    }, 100)
  }, [])

  // 점들 애니메이션
  useEffect(() => {
    if (stage === 'searching') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    }
  }, [stage])

  // MQTT 연결 상태 감지
  useEffect(() => {
    if (isConnected && stage === 'searching') {
      setStage('found')

      // "Found!" 메시지 1초 표시 후 페이드아웃 시작
      setTimeout(() => {
        setIsVisible(false)
        // 페이드아웃 애니메이션 완료 후 컴포넌트 제거
        setTimeout(() => {
          onComplete()
        }, 500) // 페이드아웃 시간
      }, 1000)
    }
  }, [isConnected, stage, onComplete])

  if (!isVisible && stage !== 'complete') {
    // 페이드아웃 완료 후에만 컴포넌트 제거
    setTimeout(() => setStage('complete'), 1000)
  }

  if (stage === 'complete') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
      {/* 블러 배경 */}
      <div className={`absolute inset-0 bg-black/20 backdrop-blur-md transition-all duration-500 ease-in-out ${isVisible && hasLoaded ? 'opacity-100' : 'opacity-0'
        }`} />

      {/* 로딩 콘텐츠 */}
      <div className={`relative bg-white/10 backdrop-blur-lg rounded-2xl px-8 py-6 border border-white/20 shadow-2xl transition-all duration-500 ease-in-out ${isVisible && hasLoaded ? 'opacity-100' : 'opacity-0'
        }`}>
        <div className="text-center">
          <div className={`transition-opacity duration-500 ease-in-out ${stage === 'searching' ? 'opacity-100' : 'opacity-0'
            }`} style={{ display: stage === 'searching' ? 'block' : 'none' }}>
            <h2 className="text-2xl font-bold text-white mb-2">
              {currentPhrase}{dots}
            </h2>
          </div>

          <div className={`transition-opacity duration-500 ease-in-out ${stage === 'found' ? 'opacity-100' : 'opacity-0'
            }`} style={{ display: stage === 'found' ? 'block' : 'none' }}>
            <h2 className="text-2xl font-bold text-white mb-2">
              colors are ready to flow
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}