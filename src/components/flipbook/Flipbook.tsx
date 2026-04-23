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
  const [spreadIndex, setSpreadIndex] = useState(0)

  const handlePrevious = () => {
    const newIndex = Math.max(0, spreadIndex - 1)
    setSpreadIndex(newIndex)
    onPageChange?.(newIndex * 2)
  }

  const handleNext = () => {
    const maxSpreadIndex = Math.ceil(pages.length / 2) - 1
    const newIndex = Math.min(maxSpreadIndex, spreadIndex + 1)
    setSpreadIndex(newIndex)
    onPageChange?.(newIndex * 2)
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No reports available</p>
      </div>
    )
  }

  const leftPageIndex = spreadIndex * 2
  const rightPageIndex = leftPageIndex + 1
  const leftPage = pages[leftPageIndex]
  const rightPage = rightPageIndex < pages.length ? pages[rightPageIndex] : null

  const isFirstSpread = spreadIndex === 0
  const isLastSpread = rightPageIndex >= pages.length - 1

  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {/* Month Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => {
              setSpreadIndex(Math.floor(index / 2))
              onPageChange?.(index)
            }}
            className={clsx(
              'whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-colors',
              Math.floor(index / 2) === spreadIndex
                ? 'bg-white text-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            {page.month_tag}
          </button>
        ))}
      </div>

      {/* Book Container - Two Page Spread */}
      <div className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg shadow-2xl p-6">
        <div className="flex gap-6">
          {/* Left Page */}
          <div className="flex-1 bg-white rounded-sm shadow-lg overflow-hidden">
            {leftPage ? (
              <FlipbookPage page={leftPage} />
            ) : (
              <div className="p-8 min-h-96 flex items-center justify-center text-slate-400">
                <p>Front Cover</p>
              </div>
            )}
          </div>

          {/* Right Page */}
          <div className="flex-1 bg-white rounded-sm shadow-lg overflow-hidden">
            {rightPage ? (
              <FlipbookPage page={rightPage} />
            ) : (
              <div className="p-8 min-h-96 flex items-center justify-center text-slate-400">
                <p>Back Cover</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={isFirstSpread}
          className="gap-2"
        >
          ← Previous
        </Button>

        <div className="text-sm text-slate-600">
          Pages {leftPageIndex + 1}-{rightPage ? rightPageIndex + 1 : leftPageIndex + 1} of {pages.length}
        </div>

        <Button
          variant="secondary"
          onClick={handleNext}
          disabled={isLastSpread}
          className="gap-2"
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
