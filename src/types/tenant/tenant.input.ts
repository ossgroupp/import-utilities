import { ShapeInput } from '../shapes'

export interface InstanceInput {
  identifier: string
  name: string
  shapes?: ShapeInput[]
  defaults?: {
    language?: string
    currency?: string
  }
}
