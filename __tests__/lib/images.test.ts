/**
 * __tests__/lib/images.test.ts
 *
 * Unit tests for getOptimizedBannerUrl and client-side image compression.
 */
import { describe, it, expect } from 'vitest'
import { getOptimizedBannerUrl, compressImageToWebP } from '@/lib/images'

describe('getOptimizedBannerUrl', () => {
  it('returns empty string when url is null or empty', () => {
    expect(getOptimizedBannerUrl(null, 'web')).toBe('')
    expect(getOptimizedBannerUrl('', 'web')).toBe('')
  })

  it('returns raw URL when image transformation is disabled for Supabase URLs', () => {
    const rawUrl = 'https://abc.supabase.co/storage/v1/object/public/banners/my-banner.jpg'
    expect(getOptimizedBannerUrl(rawUrl, 'web')).toBe(rawUrl)
  })

  it('appends dimensions to Unsplash URLs for email and web', () => {
    const unsplashUrl = 'https://images.unsplash.com/photo-12345?foo=bar'
    expect(getOptimizedBannerUrl(unsplashUrl, 'email')).toBe('https://images.unsplash.com/photo-12345?auto=format&fit=crop&w=600&q=75')
    expect(getOptimizedBannerUrl(unsplashUrl, 'web')).toBe('https://images.unsplash.com/photo-12345?auto=format&fit=crop&w=1200&q=80')
  })
})

describe('compressImageToWebP', () => {
  it('gracefully falls back when HTMLCanvasElement is unavailable in Node/Vitest with exact extension', async () => {
    const file = new File(['fake-image-content'], 'event-photo.png', { type: 'image/png' })
    const result = await compressImageToWebP(file)

    expect(result.compressed).toBe(false)
    expect(result.contentType).toBe('image/png')
    expect(result.fileName).toMatch(/\.png$/)
  })

  it('preserves GIF files without canvas compression to maintain animation', async () => {
    const file = new File(['fake-gif'], 'banner.gif', { type: 'image/gif' })
    const result = await compressImageToWebP(file)

    expect(result.compressed).toBe(false)
    expect(result.contentType).toBe('image/gif')
    expect(result.fileName).toMatch(/\.gif$/)
  })

  it('maps jpg extension to image/jpeg MIME type when file.type is missing', async () => {
    const file = new File(['fake-jpg'], 'photo.jpg', { type: '' })
    const result = await compressImageToWebP(file)

    expect(result.contentType).toBe('image/jpeg')
    expect(result.fileName).toMatch(/\.jpg$/)
  })

  it('preserves heic extension and image/heic MIME type on fallback', async () => {
    const file = new File(['fake-heic'], 'photo.heic', { type: '' })
    const result = await compressImageToWebP(file)

    expect(result.contentType).toBe('image/heic')
    expect(result.fileName).toMatch(/\.heic$/)
  })
})
