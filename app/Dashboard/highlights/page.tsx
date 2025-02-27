import { VideoHighlights } from "../components/video-highlights"
import Layout from "../layout"

export default function HighlightsPage() {
  return (
    <Layout>
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Video Highlights</h2>
      <VideoHighlights />
    </div>
  </Layout>
  )
}

