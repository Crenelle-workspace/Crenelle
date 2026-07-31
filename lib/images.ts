/**
 * Scales and optimizes event banner image URLs dynamically.
 * Resolves project Supabase Storage URLs to edge-based transform URLs
 * and appends size/compression params to Unsplash and other recognized CDN links.
 */
export function getOptimizedBannerUrl(
  url: string | null | undefined,
  type: 'email' | 'web'
): string {
  if (!url) return ''

  // 1. Handle Supabase Storage bucket URLs
  // Standard Supabase URL: https://[project-ref].supabase.co/storage/v1/object/public/banners/[filename]
  // Transform URL: https://[project-ref].supabase.co/storage/v1/render/image/public/banners/[filename]
  if (url.includes('/storage/v1/object/public/banners/')) {
    const isTransformationEnabled = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMATION === 'true'
    
    if (!isTransformationEnabled) {
      // Gracefully fall back to standard un-resized public storage URL (for Supabase Free plan)
      return url
    }

    const transformUrl = url.replace('/storage/v1/object/public/banners/', '/storage/v1/render/image/public/banners/')
    
    if (type === 'email') {
      // 600px width, contain ratio, 75% quality compression
      return `${transformUrl}?width=600&resize=contain&quality=75`
    } else {
      // 1200px width, 80% quality compression for high-res web displays
      return `${transformUrl}?width=1200&quality=80`
    }
  }

  // 2. Handle Unsplash URLs (very common pasted URLs)
  // Standard format: https://images.unsplash.com/photo-xxx?auto=format&fit=crop&w=xxx&q=xxx
  if (url.includes('images.unsplash.com/')) {
    const baseUrl = url.split('?')[0]
    
    if (type === 'email') {
      return `${baseUrl}?auto=format&fit=crop&w=600&q=75`
    } else {
      return `${baseUrl}?auto=format&fit=crop&w=1200&q=80`
    }
  }

  // 3. Fallback for other arbitrary URLs
  return url
}

const extToMime: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
}

/** Helper to extract a safe, allowed extension from a File */
function extFromFile(file: File): string {
  const parts = file.name.split('.')
  if (parts.length < 2) return 'jpg'
  const rawExt = (parts.pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif']
  return allowedExts.includes(rawExt) ? rawExt : 'jpg'
}

/** Helper to generate a unique filename prefix */
function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
}

let cachedHas2DCanvas: boolean | null = null

function check2DCanvasSupport(): boolean {
  if (cachedHas2DCanvas !== null) return cachedHas2DCanvas
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cachedHas2DCanvas = false
    return false
  }
  try {
    cachedHas2DCanvas = !!document.createElement('canvas').getContext?.('2d')
  } catch {
    cachedHas2DCanvas = false
  }
  return cachedHas2DCanvas
}

export interface CompressImageResult {
  blob: Blob
  fileName: string
  contentType: string
  compressed: boolean
}

/**
 * Compresses and resizes an uploaded image file client-side to WebP format.
 * Reduces raw 5MB-10MB photo files to ~120KB-180KB WebP before network transmission.
 *
 * Note: HEIC/HEIF files pass through uncompressed on non-Safari browsers because HTML5 <img>
 * cannot decode HEIC natively outside WebKit. They retain their original extension and MIME type.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
  timeoutMs = 10000
): Promise<CompressImageResult> {
  const id = generateUniqueId()
  const fallbackExt = extFromFile(file)
  const fallbackContentType = file.type || extToMime[fallbackExt] || 'image/jpeg'

  const fallbackResult: CompressImageResult = {
    blob: file,
    fileName: `${id}.${fallbackExt}`,
    contentType: fallbackContentType,
    compressed: false,
  }

  if (!check2DCanvasSupport()) {
    return fallbackResult
  }

  if (file.type === 'image/gif') {
    return {
      blob: file,
      fileName: `${id}.gif`,
      contentType: 'image/gif',
      compressed: false,
    }
  }

  return new Promise((resolve) => {
    let settled = false
    let objectUrl: string | null = null

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        resolve(fallbackResult)
      }
    }, timeoutMs)

    const finish = (result: CompressImageResult) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        cleanup()
        resolve(result)
      }
    }

    const img = new Image()
    objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension)
          width = maxDimension
        } else {
          width = Math.round((width / height) * maxDimension)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        finish(fallbackResult)
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== 'image/webp') {
            finish(fallbackResult)
            return
          }
          finish({
            blob,
            fileName: `${id}.webp`,
            contentType: 'image/webp',
            compressed: true,
          })
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      finish(fallbackResult)
    }

    img.src = objectUrl
  })
}
