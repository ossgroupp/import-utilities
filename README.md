# @osspim/import-utilities

This repository contains a collection of types and functions that can be used
to:

- [Import data to an instance](https://github.com/ossgroupp/examples/tree/main/products-import)
- [Backup an instance](https://github.com/ossgroupp/examples/tree/main/backup-instance)
- [Transfer data from one instance to another instance](https://github.com/ossgroupp/examples/tree/main/duplicate-instance)

[Examples](https://github.com/ossgroupp/examples/tree/main/backup-instance)

---

## Creating an instance specification

The instance specification describes how the instance is configured, and can contain
information on:

- [Languages](https://ossgroup.com/learn/concepts/pim/multilingual)
- [VAT types](https://ossgroup.com/learn/concepts/ecommerce/tax)
- [Price variants](https://ossgroup.com/learn/concepts/ecommerce/price-variant)
- [Shapes](https://ossgroup.com/learn/concepts/pim/shape)
- [Topics](https://ossgroup.com/learn/concepts/pim/topic-map)
- [Grids](https://ossgroup.com/learn/concepts/pim/grid-organizer)
- [Products](https://ossgroup.com/learn/concepts/pim/product),
  [Documents](https://ossgroup.com/learn/concepts/pim/document) and
  [Folders](https://ossgroup.com/learn/concepts/pim/folder)

It is described in a `.json` file, like such:

```json
{
  "languages": [],
  "vatTypes": [],
  "priceVariants": [],
  "shapes": [],
  "topicMaps": [],
  "grids": [],
  "items": []
}
```

### Create the specification manually

You can create the instance specification manually, with the help of the
`JSONSpec` type exported from the package:

```typescript
import { JSONSpec } from '@osspim/import-utilites'

const mySpec: JSONSpec = {
  languages: [{}],
}
```

See a simple example of this in the
[examples/component-numeric](https://github.com/ossgroupp/examples/blob/main/component-numeric)
folder

### Create the specification automatically

You can create the instance specification automatically, with the help of the
`Bootstrapper` class exported from the package:

```typescript
import { Bootstrapper } from '@osspim/import-utilites'

const mySpec: JSONSpec = await bootstrapper.createSpec({
  ...
});
```

See a simple example of this in the
[examples/backup-instance](https://github.com/ossgroupp/examples/tree/main/backup-instance)
folder.

See more examples in our extensive
[examples repository](https://github.com/ossgroupp/examples)

### Bootstrap an instance

You can bootstrap an instance using a specification with the help of the
`Bootstrapper` class exported from the package:

```typescript
import { Bootstrapper, JSONSpec } from '@osspim/import-utilites'

bootstrapper.start()
```

See a simple example of this in the
[examples/bootstrap-instance](https://github.com/ossgroupp/import-utilities/tree/main/examples/bootstrap-instance)
folder.

See more examples in our extensive
[examples repository](https://github.com/ossgroupp/examples)

## Creating single queries and mutations

For composing single queries and mutations, not using the JSON specification,
there are a collection of types and functions that help with that. Here's a
couple of examples.

### Creating a Instance

You can easily build the GraphQL mutation for creating an instance.

```typescript
import {
  buildCreateInstanceMutation,
  InstanceInput,
} from '@osspim/import-utilities'

// Define the structure for the instance
const input: InstanceInput = {
  identifier: 'my-cooking-blog',
  name: 'My Cooking Blog',
}

// Build the mutation string
const mutation = buildCreateInstanceMutation(input)
```

You now have a mutation string that will create a new instance. You can then
submit this query to the [Core API][0] using your preferred GraphQL client
(apollo, urql, etc) to actually create your instance within OSSPIM.

### Creating Shapes

If you have an existing instance you can also just create individual shapes by
generating mutations from shape definitions.

```typescript
import {
  buildCreateShapeMutation,
  ShapeInput,
  shapeTypes,
  componentTypes,
} from '@osspim/import-utilities'

// Define the structure for the shape
const input: ShapeInput = {
  identifier: 'my-shape',
  instanceId: '<your instance id>',
  name: 'My Custom Product Shape',
  type: shapeTypes.product,
  components: [
    {
      id: 'images',
      name: 'Images',
      type: componentTypes.images,
    },
    {
      id: 'description',
      name: 'Description',
      type: componentTypes.richText,
    },
  ],
}

// Build the mutation string
const mutation = buildCreateShapeMutation(input)
```

You now have a mutation string that will create a new product shape with your
own custom component structure. You can then submit this query to the [Core
API][0] using your preferred GraphQL client (apollo, urql, etc) to create the
shapes for your instance.

### Creating Items

You can easily build mutations to create items by extending the shapes to
provide a schema for different items types. This is kind of a two-step process.

#### 1. Define the structure for the shape (as per the examples above)

```typescript
import {
  buildCreateShapeMutation,
  ShapeInput,
  shapeTypes,
  componentTypes,
} from '@osspim/import-utilities'

// Define the structure for the shape
const recipeShape: ShapeInput = {
  identifier: 'recipe',
  instanceId: '<your instance id>',
  name: 'Recipe',
  type: shapeTypes.document,
  components: [
    {
      id: 'ingredients',
      name: 'Ingredients',
      type: componentTypes.propertiesTable,
    },
    {
      id: 'instructions',
      name: 'Intructions',
      type: componentTypes.richText,
    },
  ],
}

// Build the mutation string
const createShapeMutation = buildCreateShapeMutation(recipeShape)
```

You can also create this shape manually via the PIM UI, if you prefer.

#### 3. Importing a single item

```typescript
import {
  buildCreateItemMutation,
  CreateItemInput,
} from '@osspim/import-utilities'

const itemData: CreateItemInput = {
  name: 'Cookies Recipe',
  shapeIdentifier: 'recipe',
  instanceId: '<your instance id>',
  components: {
    ingredients: {
      sections: {
        title: 'Ingredients',
        properties: [
          {
            key: 'Flour',
            value: '1 Cup',
          },
          {
            key: 'Chocolate Chips',
            value: '1 Cup',
          },
        ],
      },
    },
    instructions: {
      richText: {
        plainText: 'Start by adding the flour, brown sugar...',
      },
    },
  },
}

const createItemMutation = buildCreateItemMutation(itemData)
```

[0]: https://ossgroup.com/learn/developer-guides/api-overview/api-endpoints

## Instance specification and bootstrap

The specification/bootstrap of instance is broken down into two separate
operations

1. Create a backup of an instance, storing it as a `.json` specification
2. Bootstrapping an instance, using a `.json` specification

### Create an instance specification

The instance specification describes how the instance is configured, and can contain
information on:

- [Languages](https://ossgroup.com/learn/concepts/pim/multilingual)
- [VAT types](https://ossgroup.com/learn/concepts/ecommerce/tax)
- [Price variants](https://ossgroup.com/learn/concepts/ecommerce/price-variant)
- [Stock locations](https://ossgroup.com/learn/concepts/ecommerce/stock-location)
- [Shapes](https://ossgroup.com/learn/concepts/pim/shape)
- [Topics](https://ossgroup.com/learn/concepts/pim/topic-map)
- [Grids](https://ossgroup.com/learn/concepts/pim/grid-organizer)
- [Products](https://ossgroup.com/learn/concepts/pim/product),
  [Documents](https://ossgroup.com/learn/concepts/pim/document) and
  [Folders](https://ossgroup.com/learn/concepts/pim/folder)

It is described in a `.json` file, like such:

```json
{
  "languages": [],
  "vatTypes": [],
  "priceVariants": [],
  "shapes": [],
  "topicMaps": [],
  "grids": [],
  "items": []
}
```# import-utilities
