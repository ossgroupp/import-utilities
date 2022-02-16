import gql from 'graphql-tag'
import { VatType } from '../../types'
import { buildCreateVatTypeMutation } from '../../graphql'

import { JsonSpec } from '../json-spec'
import { AreaUpdate, BootstrapperContext } from './utils'

export async function getExistingVatTypes(
  context: BootstrapperContext
): Promise<VatType[]> {
  const instanceId = context.instanceId
  const r = await context.callPIM({
    query: gql`
      query GET_INSTANCE_VAT_TYPES($instanceId: ID!) {
        instance {
          get(id: $instanceId) {
            vatTypes {
              id
              instanceId
              name
              percent
            }
          }
        }
      }
    `,
    variables: {
      instanceId,
    },
  })

  return r.data?.instance?.get?.vatTypes || []
}

export interface Props {
  spec: JsonSpec | null
  onUpdate(t: AreaUpdate): any
  context: BootstrapperContext
}

export async function setVatTypes({
  spec,
  context,
  onUpdate,
}: Props): Promise<VatType[]> {
  // Get all the vat types from the instance
  const existingVatTypes = await getExistingVatTypes(context)

  if (!spec?.vatTypes) {
    onUpdate({
      progress: 1,
    })
    return existingVatTypes
  }

  const existingVatTypesIdentifiers = existingVatTypes.map((l) => l.name)
  const missingVatTypes = spec.vatTypes.filter(
    (l) => !existingVatTypesIdentifiers.includes(l.name)
  )

  if (missingVatTypes.length > 0) {
    onUpdate({
      message: `Adding ${missingVatTypes.length} vatType(s)...`,
    })

    const instanceId = context.instanceId

    let finished = 0

    await Promise.all(
      missingVatTypes.map(async (vatType) => {
        const result = await context.callPIM({
          query: buildCreateVatTypeMutation({
            input: {
              instanceId,
              name: vatType.name,
              percent: vatType.percent,
            },
          }),
        })
        finished++

        onUpdate({
          progress: finished / missingVatTypes.length,
          message: `${vatType.name}: ${result?.errors ? 'error' : 'added'}`,
        })
      })
    )
  }

  onUpdate({
    progress: 1,
  })

  return getExistingVatTypes(context)
}
