import { BootstrapperContext } from '.'
import { JSONGrid } from '../../json-spec'

const QUERY = `
query GET_GRIDS($instanceId: ID!, $language: String!) {
	grid {
    getMany (
      instanceId: $instanceId
      language: $language
    ) {
      id
      name
      rows {
        columns {
          item {
            externalReference
            tree {
              path(language: $language)
            }
          }
          layout {
            rowspan
            colspan
          }
        }
      }
    }
  }
}
`

export async function getAllGrids(
  language: string,
  context: BootstrapperContext
): Promise<JSONGrid[]> {
  const response = await context.callPIM({
    query: QUERY,
    variables: {
      language,
      instanceId: context.instanceId,
    },
  })

  function handleRow(row: any) {
    return {
      columns: row.columns.map((c: any) => ({
        layout: c.layout,
        item: !c.item
          ? null
          : {
              externalReference: c.item.tree.externalReference,
              catalogPath: c.item.tree.path,
            },
      })),
    }
  }

  function handleGrid(grid: any): JSONGrid {
    return {
      ...grid,
      rows: grid.rows?.map(handleRow) || [],
    }
  }

  return response.data?.grid?.getMany?.map(handleGrid) || []
}
