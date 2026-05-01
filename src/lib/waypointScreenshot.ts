export async function captureWaypointLocation(
  imageUrl: string,
  xPercent: number,
  yPercent: number,
): Promise<string> {
  console.log('[waypointScreenshot] Capturing waypoint location:', { imageUrl, xPercent, yPercent })

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        console.log('[waypointScreenshot] Image loaded:', { width: img.naturalWidth, height: img.naturalHeight })
        // Create full-size canvas to draw the original image
        const fullCanvas = document.createElement('canvas')
        fullCanvas.width = img.naturalWidth
        fullCanvas.height = img.naturalHeight
        const fullCtx = fullCanvas.getContext('2d')!

        // Draw the original image
        fullCtx.drawImage(img, 0, 0)

        // Calculate waypoint position in pixels
        const wpX = (xPercent / 100) * img.naturalWidth
        const wpY = (yPercent / 100) * img.naturalHeight

        // Draw waypoint marker (circle with center dot)
        fullCtx.strokeStyle = '#ef4444'
        fullCtx.fillStyle = '#ef4444'
        fullCtx.lineWidth = Math.max(2, img.naturalWidth / 400) // Scale with image size

        // Outer circle
        const radius = Math.max(15, img.naturalWidth / 50)
        fullCtx.beginPath()
        fullCtx.arc(wpX, wpY, radius, 0, Math.PI * 2)
        fullCtx.stroke()

        // Inner filled dot
        fullCtx.beginPath()
        fullCtx.arc(wpX, wpY, radius / 3, 0, Math.PI * 2)
        fullCtx.fill()

        // Calculate crop region: 70% of the smaller dimension for more context, centered on waypoint
        const cropSize = Math.min(img.naturalWidth, img.naturalHeight) * 0.7
        let cropX = wpX - cropSize / 2
        let cropY = wpY - cropSize / 2
        let cropW = cropSize
        let cropH = cropSize

        // Clamp crop region to image bounds
        if (cropX < 0) {
          cropX = 0
        }
        if (cropY < 0) {
          cropY = 0
        }
        if (cropX + cropW > img.naturalWidth) {
          cropX = img.naturalWidth - cropW
        }
        if (cropY + cropH > img.naturalHeight) {
          cropY = img.naturalHeight - cropH
        }

        // Create output canvas (fixed size for consistent document layout)
        const outputSize = 800
        const outputCanvas = document.createElement('canvas')
        outputCanvas.width = outputSize
        outputCanvas.height = outputSize
        const outputCtx = outputCanvas.getContext('2d')!

        // Fill with white background
        outputCtx.fillStyle = 'white'
        outputCtx.fillRect(0, 0, outputSize, outputSize)

        // Draw cropped region scaled to output size
        outputCtx.drawImage(
          fullCanvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          outputSize,
          outputSize
        )

        // Convert to base64 PNG (strip the data:image/png;base64, prefix)
        const dataUrl = outputCanvas.toDataURL('image/png')
        const base64 = dataUrl.split(',')[1]

        console.log('[waypointScreenshot] Screenshot captured successfully, base64 length:', base64.length)
        resolve(base64)
      } catch (err) {
        console.error('[waypointScreenshot] Error during capture:', err)
        reject(err)
      }
    }

    img.onerror = () => {
      const error = new Error(`Failed to load image from URL: ${imageUrl}`)
      console.error('[waypointScreenshot]', error)
      reject(error)
    }

    img.src = imageUrl
  })
}
