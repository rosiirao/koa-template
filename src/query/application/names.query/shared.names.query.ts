import type { IIdentityState } from '../../../app.js';
import { aclRelationClause } from '../shared.application.query.js';

export const aclQueryInput = (
  identities: IIdentityState['identities'],
  applicationId: number
) => ({
  Resource: aclRelationClause(identities, applicationId, 'UnityResource'),
});
