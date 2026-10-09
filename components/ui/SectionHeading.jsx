import Reveal from './Reveal.jsx'
import { cn } from '../../lib/utils.js'

const TONES = {
  light: { eyebrow: 'text-ink/60', title: 'text-ink' },
  dark: { eyebrow: 'text-white/50', title: 'text-white' },
  plum: { eyebrow: 'text-plum/60', title: 'text-plum' }
}

const SIZES = {
  lg: 'text-5xl md:text-7xl',
  xl: 'text-6xl md:text-8xl'
}

export default function SectionHeading({
  eyebrow,
  title,
  as: Tag = 'h2',
  align = 'center',
  tone = 'light',
  size = 'lg',
  bar = true,
  className
}) {
  const t = TONES[tone]

  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <Reveal as="p" className={cn('text-xs uppercase tracking-[0.4em] md:text-sm', t.eyebrow)}>
          {eyebrow}
        </Reveal>
      )}
      <Reveal
        as={Tag}
        delay={0.08}
        className={cn('mt-3 font-display font-black uppercase leading-[0.95] tracking-tight', SIZES[size], t.title)}
      >
        {title}
      </Reveal>
      {bar && (
        <Reveal
          from="fade"
          delay={0.2}
          className={cn('mt-5 block h-1 w-16 rounded-full bg-coral', align === 'center' && 'mx-auto')}
        />
      )}
    </div>
  )
}
