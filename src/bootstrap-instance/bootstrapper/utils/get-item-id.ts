import gql from 'graphql-tag'
import { BootstrapperContext } from '.'

const cache = new Map()

export interface ItemAndParentId {
  itemId?: string
  parentId?: string
}

export function clearCache() {
  cache.clear()
}

export async function getItemId(props: {
  externalReference?: string
  catalogPath?: string
  language: string
  instanceId: string
  context: BootstrapperContext
  shapeIdentifier?: string
}): Promise<ItemAndParentId> {
  const {
    externalReference,
    catalogPath,
    language,
    instanceId,
    shapeIdentifier,
    context,
  } = props

  let idAndParent: ItemAndParentId = {}

  if (externalReference) {
    idAndParent = await getItemIdFromExternalReference({
      externalReference,
      language,
      instanceId,
      useCache: context.useReferenceCache,
      shapeIdentifier,
      context,
    })
  }

  if (!idAndParent.itemId && catalogPath) {
    idAndParent = await getItemIdFromCatalogPath({
      path: catalogPath,
      language,
      useCache: context.useReferenceCache,
      context,
    })

    if (!idAndParent.itemId) {
      idAndParent =
        context.itemJSONCatalogPathToIDMap.get(catalogPath) || {}
    }
  }

  return idAndParent
}

async function getItemIdFromExternalReference({
  externalReference,
  language,
  instanceId,
  useCache,
  shapeIdentifier,
  context,
}: {
  externalReference: string
  language: string
  instanceId: string
  useCache: boolean
  context: BootstrapperContext
  shapeIdentifier?: string
}): Promise<ItemAndParentId> {
  if (useCache) {
    const cacheItem = cache.get(`externalReference:${externalReference}`)
    if (cacheItem) {
      return cacheItem
    }
  }

  const response = await context.callPIM({
    query: gql`
      query GET_ID_FROM_EXTERNAL_REFERENCE(
        $externalReferences: [String!]
        $language: String!
        $instanceId: ID!
      ) {
        item {
          getMany(
            externalReferences: $externalReferences
            language: $language
            instanceId: $instanceId
          ) {
            id
            shape {
              identifier
            }
            tree {
              parentId
            }
          }
        }
      }
    `,
    variables: {
      externalReferences: [externalReference],
      language,
      instanceId,
    },
  })

  let items = response.data?.item?.getMany || []

  if (shapeIdentifier) {
    items = items.filter((s: any) => s.shape.identifier === shapeIdentifier)
  }

  const item = items[0]
  if (!item) {
    return {}
  }
  const idAndParent = {
    itemId: item.id,
    parentId: item.tree?.parentId,
  }

  if (useCache) {
    cache.set(`externalReference:${externalReference}`, idAndParent)
  }

  return idAndParent
}

async function getItemIdFromCatalogPath({
  path,
  language,
  useCache,
  context,
}: {
  path: string
  language: string
  useCache: boolean
  context: BootstrapperContext
}): Promise<ItemAndParentId> {
  if (useCache) {
    const cacheItem = cache.get(`path:${path}`)
    if (cacheItem) {
      return cacheItem
    }
  }

  const response = await context.callCatalog({
    query: gql`
      query GET_ID_FROM_PATH($path: String, $language: String) {
        catalog(path: $path, language: $language) {
          id
          parent {
            id
          }
        }
      }
    `,
    variables: {
      path,
      language,
    },
  })

  const item = response.data?.catalog
  if (!item) {
    return {}
  }
  const idAndParent = {
    itemId: item.id,
    parentId: item.parent?.id,
  }

  if (useCache) {
    cache.set(`path:${path}`, idAndParent)
  }

  return idAndParent
}
