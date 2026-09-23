import { useSession } from '../../lib/clientSession'
import ClientHome from './ClientHome'
import ClientLogin from './ClientLogin'

/** The app's front door: the client's panel when signed in, the sign-in page otherwise */
export default function ClientEntry() {
  const session = useSession()
  return session ? <ClientHome /> : <ClientLogin />
}
