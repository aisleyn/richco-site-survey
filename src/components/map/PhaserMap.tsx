import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as Phaser from 'phaser'
import { MapScene } from './phaser/MapScene'
import type { MapWaypoint } from '../../types'

export interface PhaserMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

interface PhaserMapProps {
  imageUrl: string
  waypoints: MapWaypoint[]
  isEditable?: boolean
  isPlacingWaypoint?: boolean
  isMovingWaypoint?: boolean
  mapLayer?: 'blueprint' | 'detail'
  onWaypointClick: (waypoint: MapWaypoint) => void
  onWaypointAdd: (xPercent: number, yPercent: number) => void
  onWaypointDrop: (waypointId: string, xPercent: number, yPercent: number) => void
  className?: string
}

export const PhaserMap = forwardRef<PhaserMapHandle, PhaserMapProps>(
  (
    {
      imageUrl,
      waypoints,
      isPlacingWaypoint = false,
      isMovingWaypoint = false,
      mapLayer = 'detail',
      onWaypointClick,
      onWaypointAdd,
      onWaypointDrop,
      className = '',
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const gameRef = useRef<Phaser.Game | null>(null)
    const sceneRef = useRef<MapScene | null>(null)
    const callbacksRef = useRef({
      onWaypointClick,
      onWaypointDrop,
      onMapClick: onWaypointAdd,
    })

    // Mount Phaser game
    useEffect(() => {
      if (gameRef.current) return

      console.log('PhaserMap: mounting game, container size:', {
        width: containerRef.current?.clientWidth,
        height: containerRef.current?.clientHeight,
      })

      const mapScene = new MapScene()

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: '#f3f4f6',
        scene: [mapScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: 'arcade',
          arcade: { debug: false },
        },
        render: {
          pixelArt: false,
          antialias: true,
        },
      }

      console.log('PhaserMap: creating Phaser game')
      const game = new Phaser.Game(config)
      gameRef.current = game
      console.log('PhaserMap: game created')

      return () => {
        console.log('PhaserMap: destroying game')
        game.destroy(true)
        gameRef.current = null
        sceneRef.current = null
      }
    }, [])

    // Sync callbacks (fresh closures every render)
    useEffect(() => {
      callbacksRef.current = {
        onWaypointClick,
        onWaypointDrop,
        onMapClick: onWaypointAdd,
      }
    })

    // Start scene with imageUrl and callbacks
    useEffect(() => {
      console.log('PhaserMap: scene start effect, gameRef=', !!gameRef.current, 'imageUrl=', !!imageUrl)
      if (!gameRef.current || !imageUrl) return

      const game = gameRef.current

      console.log('PhaserMap: starting MapScene with imageUrl:', imageUrl)

      // If scene is already running, stop and restart it
      if (game.scene.isActive('MapScene')) {
        console.log('PhaserMap: MapScene already active, stopping it first')
        game.scene.stop('MapScene')
      }

      console.log('PhaserMap: available scenes before start:', game.scene.getScenes().map((s: any) => s.key))
      console.log('PhaserMap: calling game.scene.start')
      game.scene.start('MapScene', {
        imageUrl,
        callbacks: callbacksRef.current,
      })
      console.log('PhaserMap: available scenes after start:', game.scene.getScenes().map((s: any) => s.key))

      // Wait for scene to exist and get reference - be more aggressive
      let attempts = 0
      sceneRef.current = null // Clear any stale reference
      const timer = setInterval(() => {
        attempts++
        const scene = game.scene.getScene('MapScene') as MapScene | null
        if (scene && scene.events) {
          console.log('PhaserMap: scene is now available after', attempts, 'attempts')
          sceneRef.current = scene
          clearInterval(timer)
        } else if (attempts > 100) {
          console.error('PhaserMap: timeout waiting for scene after 1000ms')
          clearInterval(timer)
        }
      }, 10)

      return () => {
        clearInterval(timer)
        // Don't clear sceneRef on cleanup - keep it for waypoint syncing
      }
    }, [imageUrl])

    // Sync waypoints whenever they change and scene is ready
    useEffect(() => {
      let attempts = 0
      const maxAttempts = 20 // Try for up to 2 seconds

      const trySync = () => {
        attempts++
        if (sceneRef.current) {
          console.log('PhaserMap: syncing waypoints, count:', waypoints.length)
          sceneRef.current.syncWaypoints(waypoints)
        } else if (attempts < maxAttempts) {
          // Scene not ready yet, retry in 100ms
          console.log('PhaserMap: waiting for scene to be ready (attempt', attempts, ')')
          setTimeout(trySync, 100)
        } else {
          console.warn('PhaserMap: gave up waiting for scene, waypoints may not display')
        }
      }

      trySync()
    }, [waypoints])

    // Sync placement mode
    useEffect(() => {
      sceneRef.current?.setPlacementMode(isPlacingWaypoint)
    }, [isPlacingWaypoint])

    // Sync move mode
    useEffect(() => {
      sceneRef.current?.setMoveMode(isMovingWaypoint)
    }, [isMovingWaypoint])

    // Sync map layer
    useEffect(() => {
      sceneRef.current?.setMapLayer(mapLayer)
    }, [mapLayer])

    // ResizeObserver for container size changes
    useEffect(() => {
      if (!containerRef.current || !gameRef.current) return

      const observer = new ResizeObserver(() => {
        const rect = containerRef.current!.getBoundingClientRect()
        gameRef.current?.scale.resize(rect.width, rect.height)
      })

      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }, [])

    // Expose zoom controls via imperativeHandle
    useImperativeHandle(ref, () => ({
      zoomIn: () => sceneRef.current?.zoomIn(),
      zoomOut: () => sceneRef.current?.zoomOut(),
      resetView: () => sceneRef.current?.resetView(),
    }))

    return <div ref={containerRef} className={className} style={{ width: '100%' }} />
  },
)

PhaserMap.displayName = 'PhaserMap'
