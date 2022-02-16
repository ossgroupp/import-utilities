import gql from 'graphql-tag'
import { StockLocation } from '../../types'
import { buildCreateStockLocationMutation } from '../../graphql'

import { JsonSpec, JSONStockLocation as JsonStockLocation } from '../json-spec'
import { AreaUpdate, BootstrapperContext } from './utils'

export async function getExistingStockLocations(
  context: BootstrapperContext
): Promise<StockLocation[]> {
  const instanceId = context.instanceId
  const r = await context.callPIM({
    query: gql`
      query GET_INSTANCE_STOCK_LOCATIONS($instanceId: ID!) {
        stockLocation {
          getMany(instanceId: $instanceId) {
            identifier
            name
            settings {
              minimum
              unlimited
            }
          }
        }
      }
    `,
    variables: {
      instanceId,
    },
  })

  return r.data?.stockLocation?.getMany || []
}

export interface Props {
  spec: JsonSpec | null
  onUpdate(t: AreaUpdate): any
  context: BootstrapperContext
}

export async function setStockLocations({
  spec,
  onUpdate,
  context,
}: Props): Promise<JsonStockLocation[]> {
  // Get all the stock locations from the instance
  const existingStockLocations = await getExistingStockLocations(context)

  if (!spec?.stockLocations) {
    return existingStockLocations
  }

  const existingStockLocationsIdentifiers = existingStockLocations.map(
    (sl) => sl.identifier
  )
  const missingStockLocations = spec.stockLocations.filter(
    (sl) => !existingStockLocationsIdentifiers.includes(sl.identifier)
  )

  if (missingStockLocations.length > 0) {
    onUpdate({
      message: `Adding ${missingStockLocations.length} stock location(s)...`,
    })

    const instanceId = context.instanceId

    let finished = 0

    await Promise.all(
      missingStockLocations.map(async (stockLocation) => {
        const result = await context.callPIM({
          query: buildCreateStockLocationMutation({
            instanceId,
            identifier: stockLocation.identifier,
            name: stockLocation.name,
            ...(stockLocation.minimum
              ? { settings: { minimum: stockLocation.minimum } }
              : {}),
          }),
        })

        finished++

        onUpdate({
          progress: finished / missingStockLocations.length,
          message: `${stockLocation.name}: ${
            result?.errors ? 'error' : 'added'
          }`,
        })
      })
    )
  }

  onUpdate({
    progress: 1,
  })

  const stockLocations = [...existingStockLocations, ...missingStockLocations]

  return stockLocations
}
