import { useEffect, useState } from 'react'
import './AnimatedBackground.css'

interface Node {
  id: number
  x: number
  y: number
  driftX: number
  driftY: number
  duration: number
  delay: number
}

export default function AnimatedBackground() {
  const [nodes, setNodes] = useState<Node[]>([])

  useEffect(() => {
    // Generate 14 nodes symmetrically scattered
    const generateNodes = () => {
      const nodeCount = 14
      const newNodes: Node[] = []

      for (let i = 0; i < nodeCount; i++) {
        const x = Math.random() * 100
        const y = Math.random() * 100

        // Random drift direction within -30% to 30% range
        const driftX = (Math.random() - 0.5) * 60
        const driftY = (Math.random() - 0.5) * 60

        const duration = 20 + Math.random() * 20 // 20-40s
        const delay = Math.random() * 5 // 0-5s delay

        newNodes.push({
          id: i,
          x,
          y,
          driftX,
          driftY,
          duration,
          delay,
        })
      }

      return newNodes
    }

    setNodes(generateNodes())
  }, [])

  return (
    <div className="animated-background-container fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* SVG for connecting lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <defs>
          <line id="faint-line" stroke="white" strokeWidth="0.5" />
        </defs>

        {/* Draw connecting lines between nearby nodes */}
        {nodes.map((node, idx) => {
          const nextIdx = (idx + 1) % nodes.length
          const nextNode = nodes[nextIdx]

          const distance = Math.sqrt(
            Math.pow((nextNode.x - node.x) * window.innerWidth / 100, 2) +
            Math.pow((nextNode.y - node.y) * window.innerHeight / 100, 2)
          )

          if (distance < 300) {
            return (
              <line
                key={`line-${idx}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${nextNode.x}%`}
                y2={`${nextNode.y}%`}
                stroke="white"
                strokeWidth="0.5"
              />
            )
          }
          return null
        })}
      </svg>

      {/* Animated nodes */}
      {nodes.map((node) => (
        <div
          key={node.id}
          className="animated-node"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            '--drift-x': `${node.driftX}px`,
            '--drift-y': `${node.driftY}px`,
            '--duration': `${node.duration}s`,
            '--delay': `${node.delay}s`,
          } as React.CSSProperties & { '--drift-x': string; '--drift-y': string; '--duration': string; '--delay': string }}
        />
      ))}
    </div>
  )
}
