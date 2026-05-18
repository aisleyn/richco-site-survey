import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSamplesByProject } from '../../services/samples'
import { getProjectById } from '../../services/projects'
import type { Sample, Project } from '../../types'
import { Card, Button, Spinner, BackButton } from '../../components/ui'
import { SampleCard } from '../../components/samples/SampleCard'
import { SampleCreateModal } from '../../components/samples/SampleCreateModal'

export default function SamplesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      const [p, s] = await Promise.all([
        getProjectById(projectId),
        getSamplesByProject(projectId),
      ])
      setProject(p)
      setSamples(s)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSampleCreated = (newSample: Sample) => {
    setSamples([newSample, ...samples])
    setIsCreateModalOpen(false)
  }

  const handleSampleStatusUpdated = (updatedSample: Sample) => {
    setSamples(samples.map(s => s.id === updatedSample.id ? updatedSample : s))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return <div>Project not found</div>
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton label={`Back to ${project.name}`} />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Samples</h1>
          <p className="text-secondary mt-1">{project.name}</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          Add Sample
        </Button>
      </div>

      {samples.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-secondary">No samples yet</p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              Create First Sample
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {samples.map(sample => (
            <SampleCard
              key={sample.id}
              sample={sample}
              onStatusChange={handleSampleStatusUpdated}
            />
          ))}
        </div>
      )}

      <SampleCreateModal
        isOpen={isCreateModalOpen}
        projectId={projectId}
        onCreated={handleSampleCreated}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
