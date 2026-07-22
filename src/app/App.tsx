import { RouteveilProvider, RouteveilView } from '../react-router'
import { DocumentMetadata } from './shared/DocumentMetadata'
import { SiteLayout } from './shared/layout/SiteLayout'

export default function App() {
  return (
    <>
      <DocumentMetadata />
      <RouteveilProvider>
        <SiteLayout>
          <RouteveilView className="route-stage" />
        </SiteLayout>
      </RouteveilProvider>
    </>
  )
}
