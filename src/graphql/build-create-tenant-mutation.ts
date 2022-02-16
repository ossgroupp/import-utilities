import { jsonToGraphQLQuery } from 'json-to-graphql-query'
import { InstanceInput } from '../types'

export const buildCreateInstanceMutation = (input: InstanceInput): string => {
  const mutation = {
    mutation: {
      instance: {
        create: {
          __args: {
            input,
          },
          id: true,
          identifier: true,
          rootItemId: true,
          shapes: {
            identifier: true,
            name: true,
          },
          defaults: {
            language: true,
            currency: true,
          },
          vatTypes: {
            id: true,
            name: true,
          },
        },
      },
    },
  }

  return jsonToGraphQLQuery(mutation)
}
