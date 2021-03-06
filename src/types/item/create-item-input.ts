import { ComponentContentInput } from '../shapes/components/component-content.input'

export interface CreateItemInput {
  name: string
  instanceId?: string
  shapeIdentifier?: string
  topicIds?: string[]
  components?: {
    [componentId: string]: ComponentContentInput
  }
  tree?: {
    parentId: string
  }
}
