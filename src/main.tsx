import React from 'react'
import ReactDOM from 'react-dom/client'
import { PostHogProvider } from '@posthog/react'
import App from './App.tsx'
import './index.css'

const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
} as const

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN} options={posthogOptions}>
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)
