import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductWordmark, Squiggle } from '../../components/bits'

export default function Home() {
  return (
    <div className="pt-8 sm:pt-16">
      <p className="mb-4 text-sm text-ink-2">From the Ridemap &amp; PrintA4 team</p>
      <h1 className="max-w-2xl text-4xl leading-[1.05] font-extrabold sm:text-6xl">
        Something bugging you? Got an idea? <span className="marker">We&rsquo;re listening.</span>
      </h1>
      <p className="mt-5 max-w-lg text-ink-2">
        Pick the app you want to talk about. Questions, complaints, wild ideas: all welcome. You&rsquo;ll get a reference ID so
        you can see what we did about it.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-[1.15fr_1fr]">
        <Link
          to="/feedback/ridemap"
          className="group card relative overflow-hidden p-6 transition hover:-translate-y-0.5 hover:border-ink-2 sm:p-8"
        >
          <ProductWordmark product="ridemap" height={30} className="mb-8" />
          <h2 className="sr-only">Ridemap</h2>
          <p className="mt-1 text-sm text-ink-2">Bus tracking, ETAs, bus pass, routes &amp; stops</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
            Talk about Ridemap <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </span>
          <Squiggle className="absolute -right-4 bottom-6 w-40 rotate-[-8deg] text-lime-500/25" />
        </Link>
        <Link
          to="/feedback/printa4"
          className="group card relative overflow-hidden p-6 transition hover:-translate-y-0.5 hover:border-ink-2 sm:mt-10 sm:p-8"
        >
          <ProductWordmark product="printa4" height={30} className="mb-8" />
          <h2 className="sr-only">PrintA4</h2>
          <p className="mt-1 text-sm text-ink-2">Kiosks, payments &amp; refunds, print quality</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
            Talk about PrintA4 <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </span>
          <Squiggle className="absolute -right-4 bottom-6 w-40 rotate-[6deg] text-blue-500/20" />
        </Link>
      </div>

      <p className="mt-10 text-sm text-ink-2">
        Already sent something?{' '}
        <Link to="/track" className="font-medium text-ink underline decoration-marker decoration-2 underline-offset-4">
          Check its status
        </Link>
      </p>
    </div>
  )
}
