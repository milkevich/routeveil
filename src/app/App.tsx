import { RouteveilProvider, RouteveilView } from '../react-router'
import { DocumentTitle } from './shared/DocumentTitle'
import { SiteLayout } from './shared/layout/SiteLayout'

export default function App() {
  return (
    <>
      <DocumentTitle />
      <RouteveilProvider>
        <SiteLayout>
          <RouteveilView className="route-stage" />
        </SiteLayout>
      </RouteveilProvider>
    </>
  )
}
