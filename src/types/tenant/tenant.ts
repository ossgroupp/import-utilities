import { Shape } from '../shapes/shape'

export interface Instance {
  id: string
  identifier: string
  rootItemId: string
  vatTypes: [
    {
      id: string
      name: string
    }
  ]
  shapes: Shape[]
}
