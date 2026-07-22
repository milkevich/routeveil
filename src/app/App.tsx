import { RouteveilProvider, RouteveilView } from '../react-router'
import { SiteLayout } from './shared/layout/SiteLayout'

export default function App() {
  return (
    <RouteveilProvider>
      <SiteLayout>
        <RouteveilView className="route-stage" />
      </SiteLayout>
    </RouteveilProvider>
  )
}
