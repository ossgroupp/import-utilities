import { TopicChildInput } from './topic.child.input'

export interface TopicInput {
  instanceId: string
  parentId?: string
  name: string
  pathIdentifier?: string
  children?: TopicChildInput[]
}

export interface TopicUpdateInputInput {
  parentId?: string
  name: string
}

export interface TopicUpdateInput {
  id: string
  language: string
  input: TopicUpdateInputInput
}
