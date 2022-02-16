import test from 'ava'
import { InstanceInput } from '../types'
import { shapeTypes } from '../types/shapes/shape.input'
import { buildCreateInstanceMutation } from './build-create-instance-mutation'

test('create mutation for basic instance', (t) => {
  const input: InstanceInput = {
    identifier: 'cool-shop',
    name: 'Cool Shop',
  }

  const got = buildCreateInstanceMutation(input).replace(/ /g, '')
  const want: string = `
    mutation {
      instance {
        create(
          input: {
            identifier: "cool-shop",
            name: "Cool Shop"
          }
        ) {
          id
          identifier
          rootItemId
          shapes {
            identifier
            name
          }
          defaults {
            language
            currency
          }
          vatTypes {
            id
            name
          }
        }
      }
    }
  `
    .replace(/\n/g, '')
    .replace(/ /g, '')

  t.is(got, want, 'mutation string should match')
})

test('create mutation for instance with shapes', (t) => {
  const input: InstanceInput = {
    identifier: 'cool-shop',
    name: 'Cool Shop',
    shapes: [
      {
        identifier: 'cool-product',
        name: 'Cool Product',
        type: shapeTypes.product,
      },
      {
        identifier: 'less-cool-product',
        name: 'Less Cool Product',
        type: shapeTypes.product,
      },
    ],
    defaults: {
      language: 'no',
      currency: 'NOK',
    },
  }

  const got = buildCreateInstanceMutation(input).replace(/ /g, '')
  const want: string = `
    mutation {
      instance {
        create(
          input: {
            identifier: "cool-shop",
            name: "Cool Shop",
            shapes: [
              {
                identifier: "cool-product",
                name: "Cool Product",
                type: product
              },
              {
                identifier: "less-cool-product",
                name: "Less Cool Product",
                type: product
              }
            ],
            defaults: {
              language: "no",
              currency: "NOK"
            }
          }
        ) {
          id
          identifier
          rootItemId
          shapes {
            identifier
            name
          }
          defaults {
            language
            currency
          }
          vatTypes {
            id
            name
          }
        }
      }
    }
  `
    .replace(/\n/g, '')
    .replace(/ /g, '')

  t.is(got, want, 'mutation string should match')
})
