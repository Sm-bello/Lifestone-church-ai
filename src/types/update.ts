export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

export interface UpdateInfo {
  version: string
  title: string
  notes: string
  publishedAt: string
  releaseUrl: string
  assets: ReleaseAsset[]
}
