'use client'

import Image from 'next/image'

type Props = {
  size?: 'sm' | 'lg'
  lang?: 'en' | 'uz'
}

export function JahongirAvatar({ size = 'lg', lang = 'en' }: Props) {
  const dimensions = size === 'lg' ? 'h-24 w-24' : 'h-9 w-9'
  const ring = size === 'lg' ? 'shadow-[0_10px_35px_rgba(37,99,235,0.18)]' : ''

  return (
    <div className={`relative ${dimensions} overflow-hidden rounded-full ${ring}`}>
      <Image
        src="/jahongir.jpg"
        alt="Jahongir Pulatov"
        fill
        sizes={size === 'lg' ? '96px' : '36px'}
        className="object-cover"
      />
      <div className="absolute inset-0 rounded-full border border-white/20" />
      {size === 'lg' && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="whitespace-nowrap text-sm font-semibold text-[var(--foreground)]">
            {lang === 'uz' ? 'Jahongir Pulatov' : 'Jahongir Pulatov'}
          </p>
        </div>
      )}
    </div>
  )
}
