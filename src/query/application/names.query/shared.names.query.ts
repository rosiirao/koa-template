import { IIdentityState } from '../../../app';
import { aclRelationClause } from '../shared.application.query';

export const aclQueryInput = (
  identities: IIdentityState['identities'],
  applicationId: number
) => ({
  Resource: aclRelationClause(identities, applicationId, 'UnityResource'),
});
