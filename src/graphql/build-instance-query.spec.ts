import test from 'ava'
import { InstanceInput } from '../types'
import { buildCreateInstanceMutation } from './build-create-instance-mutation'
import { buildInstanceQuery } from './build-instance-query'

test('create instance query with id', (t) => {
  const got = buildInstanceQuery('1234').replace(/ /g, '')
  const want: string = `
    query {
      instance {
        get (id: "1234") {
          id
          identifier
          name
          rootItemId
          availableLanguages {
            code
            name
            system
          }
          defaults {
            language
            currency
          }
          vatTypes {
            id
            name
            percent
          }
          shapes {
            identifier
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
