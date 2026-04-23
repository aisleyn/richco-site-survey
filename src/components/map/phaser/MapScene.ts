import * as Phaser from 'phaser'
import type { MapWaypoint } from '../../../types'

export interface MapSceneCallbacks {
  onWaypointClick: (waypoint: MapWaypoint) => void
  onWaypointDrop: (waypointId: string, xPercent: number, yPercent: number) => void
  onMapClick: (xPercent: number, yPercent: number) => void
}

interface SceneData {
  imageUrl: string
  callbacks: MapSceneCallbacks
}

export class MapScene extends Phaser.Scene {
  private imageUrl: string = ''
  private mapImage: Phaser.GameObjects.Image | null = null
  private mapWidth: number = 0
  private mapHeight: number = 0
  private minZoom: number = 1
  private maxZoom: number = 10
  private isDragging: boolean = false
  private dragStart = { x: 0, y: 0, camX: 0, camY: 0 }
  private isPlacingWaypoint: boolean = false
  private isMovingWaypoint: boolean = false
  private lastClickTime: number = 0
  private lastClickPos = { x: 0, y: 0 }
  private callbacks: MapSceneCallbacks | null = null
  private waypointSprites = new Map<string, Phaser.GameObjects.Container>()
  private waypointData = new Map<string, MapWaypoint>()
  private tooltip: Phaser.GameObjects.Text | null = null
  private tooltipBg: Phaser.GameObjects.Rectangle | null = null
  private draggedWaypointId: string | null = null

  constructor() {
    console.log('MapScene: constructor called')
    try {
      super({ key: 'MapScene' })
      console.log('MapScene: super() completed')
    } catch (err) {
      console.error('MapScene: constructor error:', err)
      throw err
    }
  }

  init(data: SceneData) {
    console.log('MapScene: init called with data:', data)
    this.imageUrl = data.imageUrl
    this.callbacks = data.callbacks
    console.log('MapScene: init complete, imageUrl=', this.imageUrl)
  }

  preload() {
    console.log('MapScene: preload called, imageUrl=', this.imageUrl)
    if (this.imageUrl) {
      console.log('MapScene: loading image from URL:', this.imageUrl)
      this.load.image('floorplan', this.imageUrl)

      this.load.on('complete', () => {
        console.log('MapScene: image load complete')
      })

      this.load.on('loaderror', (file: any) => {
        console.error('MapScene: image load error:', file)
      })
    } else {
      console.warn('MapScene: preload called but imageUrl is empty')
    }
  }

  create() {
    console.log('MapScene: create called, imageUrl=', this.imageUrl)
    if (!this.imageUrl) {
      console.error('MapScene: no imageUrl provided')
      return
    }

    try {
      // Check if texture is loaded
      console.log('MapScene: checking textures...')
      const hasTexture = this.textures.exists('floorplan')
      console.log('MapScene: floorplan texture exists?', hasTexture)

      if (!hasTexture) {
        console.error('MapScene: floorplan texture not loaded')
        return
      }

      // Get image dimensions
      const textureSource = this.textures.get('floorplan')
      if (!textureSource || !textureSource.source[0]) {
        console.error('MapScene: could not get texture source')
        return
      }

      this.mapWidth = textureSource.source[0].width
      this.mapHeight = textureSource.source[0].height
      console.log('MapScene: image dimensions', this.mapWidth, 'x', this.mapHeight)

      // Create image
      this.mapImage = this.add.image(0, 0, 'floorplan')
      this.mapImage.setOrigin(0, 0)
      console.log('MapScene: image added to canvas at 0,0')

      // Setup camera
      this.setupCamera()

      // Input handling
      this.setupInput()

      // Create tooltip (hidden initially)
      this.createTooltip()

      console.log('MapScene: create complete, canvas ready')
    } catch (err) {
      console.error('MapScene: create error', err)
    }
  }

  private setupCamera() {
    const cam = this.cameras.main
    cam.setBounds(0, 0, this.mapWidth, this.mapHeight)
    this.setInitialZoom()
  }

  private setInitialZoom() {
    const cam = this.cameras.main
    const zoomX = cam.width / this.mapWidth
    const zoomY = cam.height / this.mapHeight
    const fitZoom = Math.min(zoomX, zoomY)
    this.minZoom = fitZoom
    cam.setZoom(fitZoom)
    cam.centerOn(this.mapWidth / 2, this.mapHeight / 2)
  }

  private setupInput() {
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom
      const newZoom = deltaY < 0 ? currentZoom * 1.1 : currentZoom / 1.1
      const clamped = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom)
      this.cameras.main.setZoom(clamped)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return

      // In placement mode, ALWAYS place waypoints on any click
      if (this.isPlacingWaypoint) {
        console.log('MapScene: placing waypoint at pointer')
        const { x, y } = this.worldToPercent(pointer.worldX, pointer.worldY)
        console.log('MapScene: waypoint percent coords:', x, y)
        this.callbacks?.onMapClick(x, y)
        return
      }

      // Check if clicking on a waypoint for dragging (only in move mode)
      const clickedWaypoint = this.getWaypointAtPointer(pointer)
      if (clickedWaypoint && this.isMovingWaypoint) {
        this.draggedWaypointId = clickedWaypoint
        this.input.setDefaultCursor('grabbing')
        return
      }

      // Fire waypoint click callback if NOT in move mode and clicked on waypoint
      if (clickedWaypoint && !this.isMovingWaypoint) {
        // Container handles this via pointerdown event
        return
      }

      this.isDragging = true
      this.dragStart = {
        x: pointer.x,
        y: pointer.y,
        camX: this.cameras.main.scrollX,
        camY: this.cameras.main.scrollY,
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle waypoint dragging - move sprite visually
      if (this.draggedWaypointId) {
        const sprite = this.waypointSprites.get(this.draggedWaypointId)
        if (sprite) {
          sprite.setPosition(pointer.worldX, pointer.worldY)
        }
        return
      }

      // Show grab cursor when hovering waypoint in move mode only
      if (this.isMovingWaypoint) {
        const hoveredWaypoint = this.getWaypointAtPointer(pointer)
        if (hoveredWaypoint) {
          this.input.setDefaultCursor('grab')
        } else {
          this.input.setDefaultCursor('default')
        }
      }

      if (this.isDragging) {
        const deltaX = pointer.x - this.dragStart.x
        const deltaY = pointer.y - this.dragStart.y
        const cam = this.cameras.main
        cam.setScroll(
          this.dragStart.camX - deltaX / cam.zoom,
          this.dragStart.camY - deltaY / cam.zoom,
        )
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Save waypoint position if dragging
      if (this.draggedWaypointId) {
        const waypointId = this.draggedWaypointId
        this.draggedWaypointId = null // Clear immediately to prevent double-fire
        const { x, y } = this.worldToPercent(pointer.worldX, pointer.worldY)
        console.log('MapScene: waypoint drop, id=', waypointId, 'percent=', x, y)
        this.callbacks?.onWaypointDrop(waypointId, x, y)
        if (this.isMovingWaypoint) {
          this.input.setDefaultCursor('grab')
        } else {
          this.input.setDefaultCursor('default')
        }
        return
      }

      this.isDragging = false
    })

    // Double-click to zoom in (but not during waypoint placement)
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const now = Date.now()
      const timeSinceLast = now - this.lastClickTime
      const distance = Phaser.Math.Distance.Between(
        pointer.x,
        pointer.y,
        this.lastClickPos.x,
        this.lastClickPos.y
      )

      // True double-click: within 300ms and within 10px of last click, not during placement
      if (timeSinceLast < 300 && distance < 10 && !this.isPlacingWaypoint) {
        const currentZoom = this.cameras.main.zoom
        const newZoom = Phaser.Math.Clamp(currentZoom * 1.5, this.minZoom, this.maxZoom)
        this.cameras.main.setZoom(newZoom)
        this.cameras.main.pan(pointer.worldX, pointer.worldY, 200)
        this.lastClickTime = 0 // Reset to prevent triple-click
      } else {
        this.lastClickTime = now
        this.lastClickPos = { x: pointer.x, y: pointer.y }
      }
    })

    // Home key to reset view
    const homeKey = this.input.keyboard?.addKey('HOME')
    if (homeKey) {
      homeKey.on('down', () => this.resetView())
    }

    // WASD and arrow keys for panning
    const cursors = this.input.keyboard?.createCursorKeys()
    if (cursors) {
      this.events.on('update', () => {
        const cam = this.cameras.main
        const panSpeed = 10 / cam.zoom

        if (cursors.up.isDown || (this.input.keyboard?.addKey('W').isDown ?? false)) {
          cam.setScroll(cam.scrollX, cam.scrollY - panSpeed)
        }
        if (cursors.down.isDown || (this.input.keyboard?.addKey('S').isDown ?? false)) {
          cam.setScroll(cam.scrollX, cam.scrollY + panSpeed)
        }
        if (cursors.left.isDown || (this.input.keyboard?.addKey('A').isDown ?? false)) {
          cam.setScroll(cam.scrollX - panSpeed, cam.scrollY)
        }
        if (cursors.right.isDown || (this.input.keyboard?.addKey('D').isDown ?? false)) {
          cam.setScroll(cam.scrollX + panSpeed, cam.scrollY)
        }
      })
    }
  }

  private createTooltip() {
    this.tooltipBg = this.add.rectangle(0, 0, 100, 30, 0x1f2937)
    this.tooltip = this.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    })
    this.tooltip.setOrigin(0.5, 0.5)
    this.tooltipBg.setVisible(false)
    this.tooltip.setVisible(false)
    this.tooltipBg.setScrollFactor(0)
    this.tooltip.setScrollFactor(0)
  }

  private showTooltip(text: string, x: number, y: number) {
    if (this.tooltip && this.tooltipBg) {
      this.tooltip.setText(text)
      this.tooltip.setPosition(x, y)
      this.tooltipBg.setPosition(x, y)
      this.tooltipBg.setSize(this.tooltip.width + 16, this.tooltip.height + 8)
      this.tooltip.setVisible(true)
      this.tooltipBg.setVisible(true)
    }
  }

  private hideTooltip() {
    if (this.tooltip && this.tooltipBg) {
      this.tooltip.setVisible(false)
      this.tooltipBg.setVisible(false)
    }
  }

  private isClickingWaypoint(pointer: Phaser.Input.Pointer): boolean {
    return !!this.getWaypointAtPointer(pointer)
  }

  private getWaypointAtPointer(pointer: Phaser.Input.Pointer): string | null {
    for (const [id, sprite] of this.waypointSprites.entries()) {
      const dx = pointer.worldX - sprite.x
      const dy = pointer.worldY - sprite.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 20) {
        return id
      }
    }
    return null
  }

  private worldToPercent(worldX: number, worldY: number) {
    const xPercent = (worldX / this.mapWidth) * 100
    const yPercent = (worldY / this.mapHeight) * 100
    return {
      x: Phaser.Math.Clamp(xPercent, 0, 100),
      y: Phaser.Math.Clamp(yPercent, 0, 100),
    }
  }

  private percentToWorld(xPercent: number, yPercent: number) {
    return {
      x: (xPercent / 100) * this.mapWidth,
      y: (yPercent / 100) * this.mapHeight,
    }
  }

  syncWaypoints(waypoints: MapWaypoint[]) {
    // Deduplicate waypoints by ID (in case of duplicates in incoming data)
    const uniqueWaypoints = new Map<string, MapWaypoint>()
    for (const wp of waypoints) {
      if (!uniqueWaypoints.has(wp.id)) {
        uniqueWaypoints.set(wp.id, wp)
      }
    }

    const incomingIds = new Set(uniqueWaypoints.keys())
    const existingIds = new Set(this.waypointSprites.keys())

    // Remove waypoints no longer in list
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        const sprite = this.waypointSprites.get(id)
        if (sprite) {
          sprite.destroy()
          this.waypointSprites.delete(id)
          this.waypointData.delete(id)
        }
      }
    }

    // Add or update waypoints
    for (const wp of uniqueWaypoints.values()) {
      this.waypointData.set(wp.id, wp)

      if (this.waypointSprites.has(wp.id)) {
        // Update existing
        const sprite = this.waypointSprites.get(wp.id)!
        const { x, y } = this.percentToWorld(wp.x_percent, wp.y_percent)
        sprite.setPosition(x, y)
        this.updateWaypointSprite(wp)
      } else {
        // Create new
        const { x, y } = this.percentToWorld(wp.x_percent, wp.y_percent)
        this.createWaypointSprite(wp, x, y)
      }
    }
  }

  private createWaypointSprite(waypoint: MapWaypoint, worldX: number, worldY: number) {
    const container = this.add.container(worldX, worldY)

    // Base circle (smaller: 6px instead of 10px)
    const color = this.getStatusColor(waypoint.status)
    const circle = this.add.graphics()
    circle.fillStyle(color)
    circle.fillCircleShape(new Phaser.Geom.Circle(0, 0, 6))
    circle.lineStyle(2, 0xffffff)
    circle.strokeCircleShape(new Phaser.Geom.Circle(0, 0, 6))
    container.add(circle)

    // Ring for animation (smaller: 6px)
    const ring = this.add.graphics()
    ring.lineStyle(2, color)
    ring.strokeCircleShape(new Phaser.Geom.Circle(0, 0, 6))
    container.add(ring)

    // Label (smaller font, closer position)
    const label = this.add.text(0, -14, waypoint.area_name, {
      fontSize: '10px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 4, y: 2 },
      fontFamily: 'monospace',
    })
    label.setOrigin(0.5, 1)
    container.add(label)

    // Make interactive (tighter click zone: 14px instead of 15px)
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 14), Phaser.Geom.Circle.Contains)
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        ease: 'Power2',
      })
      this.showTooltip(
        `${waypoint.area_name}\n${waypoint.status.replace('_', ' ')}`,
        container.x - this.cameras.main.scrollX,
        container.y - 40 - this.cameras.main.scrollY,
      )
    })

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2',
      })
      this.hideTooltip()
    })

    container.on('pointerdown', () => {
      this.callbacks?.onWaypointClick(waypoint)
    })

    this.waypointSprites.set(waypoint.id, container)
    this.updateWaypointSprite(waypoint)

    // Drop-in animation
    container.setScale(0)
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      ease: 'Back.Out',
      duration: 350,
    })
  }

  private updateWaypointSprite(waypoint: MapWaypoint) {
    const container = this.waypointSprites.get(waypoint.id)
    if (!container) return

    const circle = container.list[0] as Phaser.GameObjects.Graphics
    const ring = container.list[1] as Phaser.GameObjects.Graphics
    const label = container.list[2] as Phaser.GameObjects.Text

    if (!circle || !ring || !label) return

    const color = this.getStatusColor(waypoint.status)
    circle.clear()
    circle.fillStyle(color)
    circle.fillCircleShape(new Phaser.Geom.Circle(0, 0, 6))
    circle.lineStyle(2, 0xffffff)
    circle.strokeCircleShape(new Phaser.Geom.Circle(0, 0, 6))

    ring.clear()
    ring.lineStyle(2, color)
    ring.strokeCircleShape(new Phaser.Geom.Circle(0, 0, 6))

    label.setText(waypoint.area_name)

    // Kill existing tweens for this sprite
    this.tweens.killTweensOf(ring)

    // Apply status animation
    if (waypoint.status === 'needs_repair') {
      this.tweens.add({
        targets: ring,
        scaleX: { from: 1, to: 1.6 },
        scaleY: { from: 1, to: 1.6 },
        alpha: { from: 0.8, to: 0 },
        duration: 1200,
        repeat: -1,
      })
    } else if (waypoint.status === 'in_progress') {
      this.tweens.add({
        targets: ring,
        angle: 360,
        duration: 2000,
        repeat: -1,
        ease: 'Linear',
      })
    }
  }

  private getStatusColor(status: string): number {
    switch (status) {
      case 'needs_repair':
        return 0xef4444
      case 'in_progress':
        return 0xfbbf24
      case 'completed':
        return 0x10b981
      default:
        return 0x808080
    }
  }

  resetView() {
    const cam = this.cameras.main
    cam.setZoom(this.minZoom)
    cam.centerOn(this.mapWidth / 2, this.mapHeight / 2)
  }

  zoomIn() {
    const newZoom = Phaser.Math.Clamp(
      this.cameras.main.zoom * 1.2,
      this.minZoom,
      this.maxZoom,
    )
    this.cameras.main.setZoom(newZoom)
  }

  zoomOut() {
    const newZoom = Phaser.Math.Clamp(
      this.cameras.main.zoom / 1.2,
      this.minZoom,
      this.maxZoom,
    )
    this.cameras.main.setZoom(newZoom)
  }

  setPlacementMode(enabled: boolean) {
    this.isPlacingWaypoint = enabled
    if (enabled) {
      this.input.setDefaultCursor('crosshair')
    } else if (!this.isMovingWaypoint) {
      this.input.setDefaultCursor('default')
    }
  }

  setMoveMode(enabled: boolean) {
    this.isMovingWaypoint = enabled

    // Clear any active drag when exiting move mode
    if (!enabled) {
      this.draggedWaypointId = null
      this.isDragging = false
      if (!this.isPlacingWaypoint) {
        this.input.setDefaultCursor('default')
      }
    } else {
      this.input.setDefaultCursor('grab')
    }
  }

  setMapLayer(_layer: 'blueprint' | 'detail') {
    // Layer switching implementation comes in Phase 4
  }
}
