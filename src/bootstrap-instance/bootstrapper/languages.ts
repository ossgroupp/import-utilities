import gql from 'graphql-tag'
import { buildCreateLanguageMutation } from '../../graphql'

import { JsonSpec, JSONLanguage } from '../json-spec'
import { AreaUpdate, BootstrapperContext } from './utils'

interface InstanceSettings {
  availableLanguages: JSONLanguage[]
  defaultLanguage?: string
}

export async function getInstanceSettings(
  context: BootstrapperContext
): Promise<InstanceSettings> {
  const instanceId = context.instanceId
  const r = await context.callPIM({
    query: gql`
      query GET_INSTANCE_LANGUAGES($instanceId: ID!) {
        instance {
          get(id: $instanceId) {
            defaults {
              language
            }
            availableLanguages {
              code
              name
            }
          }
        }
      }
    `,
    variables: {
      instanceId,
    },
  })
  const data = r.data?.instance?.get || {}

  const availableLanguages = data.availableLanguages || []
  const defaultLanguage =
    data?.defaults?.language || availableLanguages[0]?.code

  {
    availableLanguages.forEach((l: JSONLanguage) => {
      l.isDefault = l.code === defaultLanguage
    })
  }

  return {
    availableLanguages,
    defaultLanguage,
  }
}

export interface Props {
  spec: JsonSpec | null
  onUpdate(t: AreaUpdate): any
  context: BootstrapperContext
}

export async function setLanguages({
  spec,
  onUpdate,
  context,
}: Props): Promise<JSONLanguage[]> {
  const instanceSettings = await getInstanceSettings(context)

  const existingLanguages = instanceSettings.availableLanguages

  if (!spec?.languages) {
    return instanceSettings.availableLanguages
  }

  const existingLanguagesIdentifiers = existingLanguages.map((l) => l.code)
  const missingLanguages = spec.languages.filter(
    (l) => !existingLanguagesIdentifiers.includes(l.code)
  )

  if (missingLanguages.length > 0) {
    onUpdate({
      message: `Adding ${missingLanguages.length} language(s)...`,
      progress: 0,
    })

    const instanceId = context.instanceId

    await Promise.all(
      missingLanguages.map(async (language) => {
        const result = await context.callPIM({
          query: buildCreateLanguageMutation({
            instanceId,
            input: {
              code: language.code,
              name: language.name,
            },
          }),
        })

        onUpdate({
          message: `${language.name}: ${result?.errors ? 'error' : 'added'}`,
        })
      })
    )
  }

  // Compose a list of all languages to be used later
  const languages: JSONLanguage[] = [...existingLanguages, ...missingLanguages]

  const defaultLanguage =
    spec.languages.find((l) => l.isDefault)?.code ||
    instanceSettings.defaultLanguage ||
    languages[0].code

  {
    languages.forEach((l) => {
      l.isDefault = l.code === defaultLanguage
    })
  }

  if (defaultLanguage !== instanceSettings.defaultLanguage) {
    const result = await context.callPIM({
      query: gql`
        mutation {
          instance {
            update(
              id: "${context.instanceId}"
              input: {
                defaults: {
                  language: "${defaultLanguage}"
                }
              }
            ) {
              id
            }
          }
        }
      `,
    })

    onUpdate({
      message: `Setting default language to "${defaultLanguage}": ${
        result?.errors ? 'error' : 'success'
      }`,
    })
  }

  onUpdate({
    progress: 1,
  })

  return languages
}
