declare module 'docxtemplater-image-module-free' {
  class ImageModule {
    constructor(options?: {
      centered?: boolean
      fileType?: string
      getImage?: (tagValue: string) => Uint8Array
      getSize?: (img: Uint8Array) => [number, number]
    })
  }
  export = ImageModule
}
