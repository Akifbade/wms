import { PageHeader, Card, EmptyState, Button } from '../../components/ui'

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Shipments management with full CRUD, box tracking, rack assignment, dimensions, and release workflow"
        action={<Button variant="primary">+ New Shipment</Button>}
      />
      <Card>
        <EmptyState
          icon={
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
          }
          title="Coming Soon"
          message="This page is under active development"
        />
      </Card>
    </div>
  )
}
