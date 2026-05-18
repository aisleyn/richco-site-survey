import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export function useRealtimeNotifications(projectIds: string[]) {
  const toast = useToast()

  useEffect(() => {
    if (projectIds.length === 0) return

    const channel = supabase.channel('sample-status-changes', {
      config: {
        broadcast: { self: true },
      },
    })

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'samples',
        filter: `project_id=in.(${projectIds.join(',')})`,
      },
      (payload) => {
        const newSample = payload.new
        const oldSample = payload.old

        // Only show toast if status changed
        if (oldSample.status !== newSample.status) {
          const statusLabel = newSample.status.charAt(0).toUpperCase() + newSample.status.slice(1)
          toast({
            message: `Sample "${newSample.title}" was ${statusLabel}`,
            type: newSample.status === 'approved' ? 'success' : 'info',
          })
        }
      }
    )

    channel.subscribe((status) => {
      if (status === 'CLOSED') {
        console.log('Realtime subscription closed')
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectIds, toast])
}
