import gql from 'graphql-tag'
import { JsonSpec } from '../json-spec'
import { AreaUpdate, BootstrapperContext } from './utils'
import {
  CreateSubscriptionPlanInput,
  SubscriptionPlan,
} from '../../generated/graphql'

export async function getExistingSubscriptionPlans(
  context: BootstrapperContext
): Promise<SubscriptionPlan[]> {
  const instanceId = context.instanceId
  const r = await context.callPIM({
    query: gql`
      query GET_INSTANCE_SUBSCRIPTION_PLANS($instanceId: ID!) {
        subscriptionPlan {
          getMany(instanceId: $instanceId) {
            identifier
            name
            meteredVariables {
              id
              identifier
              name
              unit
            }
            periods {
              id
              name
              initial {
                period
                unit
              }
              recurring {
                period
                unit
              }
            }
          }
        }
      }
    `,
    variables: {
      instanceId,
    },
  })

  return r.data?.subscriptionPlan?.getMany || []
}

export interface Props {
  spec: JsonSpec | null
  onUpdate(t: AreaUpdate): any
  context: BootstrapperContext
}

export async function setSubscriptionPlans({
  spec,
  onUpdate,
  context,
}: Props): Promise<SubscriptionPlan[]> {
  // Get all the subscription plans from the instance
  const existingSubscriptionPlans = await getExistingSubscriptionPlans(context)
  if (!spec?.subscriptionPlans) {
    onUpdate({
      progress: 1,
    })
    return existingSubscriptionPlans
  }

  const missingSubscriptionPlans = spec.subscriptionPlans.filter(
    (l) => !existingSubscriptionPlans.some((s) => s.identifier === l.identifier)
  )

  if (missingSubscriptionPlans.length > 0) {
    onUpdate({
      message: `Adding ${missingSubscriptionPlans.length} subscription plan(s)...`,
    })

    const instanceId = context.instanceId

    let finished = 0

    await Promise.all(
      missingSubscriptionPlans.map(async (subscriptionPlan) => {
        const input: CreateSubscriptionPlanInput = {
          instanceId,
          name: subscriptionPlan.name,
          identifier: subscriptionPlan.identifier,
          periods: subscriptionPlan.periods,
          meteredVariables: subscriptionPlan.meteredVariables,
        }
        const result = await context.callPIM({
          query: gql`
            mutation CREATE_SUBSCRIPTION_PLAN(
              $input: CreateSubscriptionPlanInput!
            ) {
              subscriptionPlan {
                create(input: $input) {
                  identifier
                }
              }
            }
          `,
          variables: {
            input,
          },
        })
        finished++

        onUpdate({
          progress: finished / missingSubscriptionPlans.length,
          message: `${subscriptionPlan.name}: ${
            result?.errors ? 'error' : 'added'
          }`,
        })
      })
    )
  }

  onUpdate({
    progress: 1,
  })

  return await getExistingSubscriptionPlans(context)
}
