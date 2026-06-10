import { supabase } from '../lib/supabase'

export interface UploadedFile {
  path: string
  signedUrl: string
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<UploadedFile> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  // Use public URL for all media buckets to avoid signed URL expiration
  const publicBuckets = ['floor-plans', 'waypoint-photos', 'survey-media', 'client-submission-media']
  let url: string

  if (publicBuckets.includes(bucket)) {
    url = getPublicUrl(bucket, data.path)
  } else {
    const { data: urlData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 604800)

    if (!urlData?.signedUrl) {
      throw new Error('Failed to generate signed URL')
    }
    url = urlData.signedUrl
  }

  return {
    path: data.path,
    signedUrl: url,
  }
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Failed to generate signed URL')

  return data.signedUrl
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
