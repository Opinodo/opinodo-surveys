import { revalidateTag } from "next/cache";

interface RevalidateProps {
  id?: string;
  name?: string;
  environmentId?: string;
}

export const attributeClassCache = {
  tag: {
    byId(id: string) {
      return `{attributeClasses}-attributeClass-${id}`;
    },
    byEnvironmentId(environmentId: string) {
      return `{attributeClasses}-environments-${environmentId}-attributeClasses`;
    },
    byEnvironmentIdAndName(environmentId: string, name: string) {
      return `{attributeClasses}-environments-${environmentId}-name-${name}-attributeClasses`;
    },
  },
  revalidate({ id, environmentId, name }: RevalidateProps): void {
    if (id) {
      revalidateTag(this.tag.byId(id));
    }

    if (environmentId) {
      revalidateTag(this.tag.byEnvironmentId(environmentId));
    }

    if (environmentId && name) {
      revalidateTag(this.tag.byEnvironmentIdAndName(environmentId, name));
    }
  },
};
