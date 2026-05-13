import { useState } from 'react'
import { Modal, Button, Input, Card } from '../ui'
import { createSubcategory, deleteSubcategory } from '../../services/subcategories'
import { useToast } from '../ui/Toast'
import type { ProjectSubcategory } from '../../types'

interface SubcategoryModalProps {
  isOpen: boolean
  projectId: string
  subcategories: ProjectSubcategory[]
  onCreated: (subcategory: ProjectSubcategory) => void
  onDeleted: (id: string) => void
  onClose: () => void
}

export function SubcategoryModal({
  isOpen,
  projectId,
  subcategories,
  onCreated,
  onDeleted,
  onClose,
}: SubcategoryModalProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

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
      toast('Zone created', 'success')
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
      toast('Zone deleted', 'success')
    } catch (err) {
      console.error(err)
      toast('Failed to delete zone', 'error')
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
              error={error}
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
                <Card key={zone.id} className="flex items-center justify-between p-3">
                  <span className="text-white">{zone.name}</span>
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
