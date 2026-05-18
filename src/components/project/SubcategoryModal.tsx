import { useState } from 'react'
import { Modal, Button, Input, Card, Select } from '../ui'
import { createSubcategory, deleteSubcategory, updateSubcategoryStatus } from '../../services/subcategories'
import { useToast } from '../ui/Toast'
import type { ProjectSubcategory, ProjectType, ZoneStatus } from '../../types'

interface SubcategoryModalProps {
  isOpen: boolean
  projectId: string
  subcategories: ProjectSubcategory[]
  onCreated: (subcategory: ProjectSubcategory) => void
  onDeleted: (id: string) => void
  onClose: () => void
  projectType?: ProjectType
}

export function SubcategoryModal({
  isOpen,
  projectId,
  subcategories,
  onCreated,
  onDeleted,
  onClose,
  projectType,
}: SubcategoryModalProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const toast = useToast()

  const zoneStatuses: ZoneStatus[] = ['concept', 'in_development', 'approved', 'denied', 'on_hold']

  const handleStatusChange = async (zoneId: string, newStatus: ZoneStatus) => {
    setUpdatingId(zoneId)
    try {
      await updateSubcategoryStatus(zoneId, newStatus)
      toast({ message: 'Zone status updated', type: 'success' })
      // Refetch would happen through parent component
    } catch (err) {
      console.error(err)
      toast({ message: 'Failed to update zone status', type: 'error' })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a zone name')
      return
    }

    if (subcategories.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A zone with this name already exists')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createSubcategory(projectId, name.trim())
      onCreated(result)
      setName('')
      toast({ message: 'Zone created', type: 'success' })
    } catch (err) {
      setError('Failed to create zone')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this zone?')) return

    try {
      await deleteSubcategory(id)
      onDeleted(id)
      toast({ message: 'Zone deleted', type: 'success' })
    } catch (err) {
      console.error(err)
      toast({ message: 'Failed to delete zone', type: 'error' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="Manage Zones">
      <div className="space-y-4">
        {/* New Zone Input */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">New Zone Name</label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Queue A, Zone 1"
              disabled={isLoading}
              error={error || undefined}
            />
            <Button
              onClick={handleCreate}
              disabled={isLoading || !name.trim()}
              variant="primary"
              size="sm"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {/* Existing Zones */}
        {subcategories.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Existing Zones</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subcategories.map(zone => (
                <Card key={zone.id} className="flex items-center justify-between p-3 gap-2">
                  <div className="flex-1">
                    <span className="text-white block">{zone.name}</span>
                    {projectType === 'development' && (
                      <Select
                        value={zone.status}
                        onChange={(e) => handleStatusChange(zone.id, e.target.value as ZoneStatus)}
                        disabled={updatingId === zone.id}
                        size="sm"
                        className="mt-1"
                      >
                        {zoneStatuses.map(status => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  <Button
                    onClick={() => handleDelete(zone.id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {subcategories.length === 0 && !error && (
          <p className="text-slate-400 text-sm italic">No zones yet. Create one above.</p>
        )}
      </div>
    </Modal>
  )
}
