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

  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 604800)

  if (!urlData?.signedUrl) {
    throw new Error('Failed to generate signed URL')
  }

  return {
    path: data.path,
    signedUrl: urlData.signedUrl,
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
