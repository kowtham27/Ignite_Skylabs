import { useEffect, useState } from 'react'
import { feedbackApi, subscribe } from '../services/feedbackApi'
import type { Feedback, FeedbackFilters } from '../types'

/** Live list that refetches when filters or the underlying data change */
export function useFeedbackList(filters: FeedbackFilters = {}) {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const key = JSON.stringify(filters)

  useEffect(() => {
    let alive = true
    const run = () =>
      feedbackApi.list(JSON.parse(key) as FeedbackFilters).then((res) => {
        if (alive) {
          setItems(res)
          setLoading(false)
        }
      })
    run()
    const off = subscribe(run)
    return () => {
      alive = false
      off()
    }
  }, [key])

  return { items, loading }
}
