interface ColorBlockProps {
  blockNumber: number
  color: string
}

export function ColorBlock({ blockNumber, color }: ColorBlockProps) {
  return (
    <div
      className="w-48 h-32 border-2 border-white/30 rounded-lg backdrop-blur-sm"
      style={{ backgroundColor: color + '80' }}
    >
      <div className="w-full h-full flex items-center justify-center text-white/80 text-xs">
        Block {blockNumber}
      </div>
    </div>
  )
}