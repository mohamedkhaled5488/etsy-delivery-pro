'use client'

import { TEMPLATE_CONFIGS } from '@/lib/pdf-generator'
import { cn } from '@/lib/utils'
import type { PDFTemplate } from '@/types'

interface TemplateSelectorProps {
  selected: PDFTemplate
  onChange: (template: PDFTemplate) => void
}

const TEMPLATE_PREVIEWS: Record<PDFTemplate, { gradient: string; accent: string }> = {
  minimal: { gradient: 'from-white to-stone-100', accent: '#1c1c1c' },
  luxury: { gradient: 'from-[#141210] to-[#1e1a14]', accent: '#d4b87a' },
  botanical: { gradient: 'from-[#f4f7f0] to-[#dff0df]', accent: '#4a7a4c' },
  modern: { gradient: 'from-[#f3f2f8] to-[#e8e4f8]', accent: '#6b38df' },
  neutral: { gradient: 'from-[#faf7f2] to-[#f0ebe2]', accent: '#b88b6b' },
}

export default function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {(Object.values(TEMPLATE_CONFIGS) as (typeof TEMPLATE_CONFIGS)[PDFTemplate][]).map((tpl) => {
        const preview = TEMPLATE_PREVIEWS[tpl.id]
        const isSelected = selected === tpl.id

        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className={cn(
              'relative flex flex-col rounded-xl overflow-hidden border-2 transition-all text-left',
              isSelected
                ? 'border-brand-500 ring-2 ring-brand-200 shadow-md'
                : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
            )}
          >
            {/* Mini PDF preview */}
            <div className={cn('h-20 bg-gradient-to-b w-full relative', preview.gradient)}>
              {/* Header bar */}
              <div
                className="absolute inset-x-0 top-0 h-5"
                style={{ backgroundColor: `${preview.accent}22` }}
              />
              {/* Content lines */}
              <div className="absolute inset-x-2 top-7 space-y-1">
                <div
                  className="h-1.5 rounded-full w-full opacity-30"
                  style={{ backgroundColor: preview.accent }}
                />
                <div
                  className="h-1 rounded-full w-3/4 opacity-20"
                  style={{ backgroundColor: preview.accent }}
                />
                <div
                  className="h-1 rounded-full w-1/2 opacity-15"
                  style={{ backgroundColor: preview.accent }}
                />
              </div>
              {/* Button */}
              <div
                className="absolute bottom-2 inset-x-2 h-4 rounded"
                style={{ backgroundColor: preview.accent, opacity: 0.8 }}
              />
            </div>

            {/* Label */}
            <div className="px-2.5 py-2">
              <p className={cn('text-xs font-semibold', isSelected ? 'text-brand-700' : 'text-stone-700')}>
                {tpl.name}
              </p>
              <p className="text-[10px] text-stone-400 leading-tight mt-0.5">{tpl.description}</p>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M8.5 2.5L4 7 1.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
