import { useState } from 'react'
import { Modal, Button, Input } from '../ui'

interface FloorPlanRenameModalProps {
  isOpen: boolean
  onClose: () => void
  currentLabel: string
  pageNumber: number
  onSave: (newLabel: string) => void
}

export function FloorPlanRenameModal({
  isOpen,
  onClose,
  currentLabel,
  pageNumber,
  onSave,
}: FloorPlanRenameModalProps) {
  const [label, setLabel] = useState(currentLabel)

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rename Floor Plan (Page ${pageNumber})`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Floor Plan Name</label>
          <Input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Main Floor, Second Floor"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            disabled={!label.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
