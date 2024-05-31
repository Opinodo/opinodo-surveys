import { revalidateTag } from "next/cache";

interface RevalidateProps {
  id?: string;
  environmentId?: string;
  hashedKey?: string;
}

export const apiKeyCache = {
  tag: {
    byId(id: string) {
      return `{apiKeys}-apiKeys-${id}`;
    },
    byEnvironmentId(environmentId: string) {
      return `{apiKeys}-environments-${environmentId}-apiKeys`;
    },
    byHashedKey(hashedKey: string) {
      return `{apiKeys}-apiKeys-${hashedKey}-apiKey`;
    },
  },
  revalidate({ id, environmentId, hashedKey }: RevalidateProps): void {
    if (id) {
      revalidateTag(this.tag.byId(id));
    }

    if (environmentId) {
      revalidateTag(this.tag.byEnvironmentId(environmentId));
    }

    if (hashedKey) {
      revalidateTag(this.tag.byHashedKey(hashedKey));
    }
  },
};
