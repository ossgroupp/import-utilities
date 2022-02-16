export interface StockLocation {
  instanceId: string
  identifier: string
  name: string
  settings: {
    minimum: number
    unlimited: boolean
  }
}

export interface StockLocationInput {
  instanceId: string
  identifier: string
  name: string
  settings?: {
    minimum: number
  }
}
