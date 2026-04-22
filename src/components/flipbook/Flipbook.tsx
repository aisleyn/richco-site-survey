import { useState } from 'react'
import clsx from 'clsx'
import { FlipbookPage } from './FlipbookPage'
import { Button } from '../ui'
import type { ReportPage } from '../../types'

interface FlipbookProps {
  pages: ReportPage[]
  onPageChange?: (pageNumber: number) => void
  className?: string
}

export function Flipbook({ pages, onPageChange, className }: FlipbookProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handlePrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1)
    setCurrentIndex(newIndex)
    onPageChange?.(newIndex)
  }

  const handleNext = () => {
    const newIndex = Math.min(pages.length - 1, currentIndex + 1)
    setCurrentIndex(newIndex)
    onPageChange?.(newIndex)
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No reports available</p>
      </div>
    )
  }

  const currentPage = pages[currentIndex]
  const isFirstPage = currentIndex === 0
  const isLastPage = currentIndex === pages.length - 1

  return (
    <div className={className}>
      {/* Month Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => {
              setCurrentIndex(index)
              onPageChange?.(index)
            }}
            className={clsx(
              'whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-colors',
              currentIndex === index
                ? 'bg-white text-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            {page.month_tag}
          </button>
        ))}
      </div>

      {/* Flipbook Container */}
      <div className="bg-slate-50 rounded-lg shadow-lg p-8">
        <div className="perspective max-w-4xl mx-auto">
          {/* Book spine effect */}
          <div className="bg-white rounded-r-lg shadow-2xl" style={{ minHeight: '500px' }}>
            {/* Page container with 3D effect */}
            <div className="relative h-full">
              {/* Current page with flip animation */}
              <div
                className="absolute inset-0 origin-left transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateY(${currentIndex === 0 ? 0 : -5}deg)`,
                }}
              >
                <FlipbookPage page={currentPage} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={isFirstPage}
            className="gap-2"
          >
            ← Previous
          </Button>

          <div className="text-sm text-slate-600">
            Page {currentIndex + 1} of {pages.length}
          </div>

          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={isLastPage}
            className="gap-2"
          >
            Next →
          </Button>
        </div>

        {/* Mobile swipe hint */}
        <div className="mt-4 text-center text-xs text-slate-500">
          Use arrow keys or buttons to navigate
        </div>
      </div>
    </div>
  )
}
