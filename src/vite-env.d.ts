/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION?: string
  readonly BUILD_TIME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}