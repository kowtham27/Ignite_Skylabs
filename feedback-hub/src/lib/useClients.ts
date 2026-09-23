import { useEffect, useState } from 'react'
import { clientApi, subscribeClients } from '../services/clientApi'
import type { Client, ClientRequest } from '../types'

/** Generic "load, then reload whenever client data changes" hook */
function useLive<T>(load: () => Promise<T>, initial: T, deps: unknown[]) {
  // Remember which inputs the data was loaded for, so changing inputs (e.g. signing in) reads as loading again
  const key = JSON.stringify(deps)
  const [state, setState] = useState<{ key: string | null; data: T }>({ key: null, data: initial })
  const loading = state.key !== key
  const data = loading ? initial : state.data
  useEffect(() => {
    let alive = true
    const run = () =>
      load().then((d) => {
        if (alive) setState({ key, data: d })
      })
    run()
    const off = subscribeClients(run)
    return () => {
      alive = false
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading }
}

export const useClients = () => useLive<Client[]>(() => clientApi.listClients(), [], [])
export const useClient = (clientId: string | null) =>
  useLive<Client | undefined>(() => (clientId ? clientApi.getClient(clientId) : Promise.resolve(undefined)), undefined, [clientId])
export const useClientRequests = (clientId?: string) => useLive<ClientRequest[]>(() => clientApi.listRequests(clientId), [], [clientId])
export const useClientRequest = (id: string) => useLive<ClientRequest | undefined>(() => clientApi.getRequest(id), undefined, [id])
