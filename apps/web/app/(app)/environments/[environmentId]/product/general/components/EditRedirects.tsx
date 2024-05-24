"use client";

import { updateProductAction } from "@/app/(app)/environments/[environmentId]/settings/product/actions";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { TProduct } from "@formbricks/types/product";
import { Button } from "@formbricks/ui/Button";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";

type EditDefaultRedirectValues = {
  defaultRedirectOnCompleteUrl: string | null;
  defaultRedirectOnFailUrl: string | null;
};

type EditRedirectsProps = {
  environmentId: string;
  product: TProduct;
};

const EditRedirects: React.FC<EditRedirectsProps> = ({ product, environmentId }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditDefaultRedirectValues>({
    defaultValues: {
      defaultRedirectOnCompleteUrl: product.defaultRedirectOnCompleteUrl ?? null,
      defaultRedirectOnFailUrl: product.defaultRedirectOnFailUrl ?? null,
    },
  });

  const updateDefaultRedirects: SubmitHandler<EditDefaultRedirectValues> = async (data) => {
    try {
      const updatedProduct = await updateProductAction(environmentId, product.id, data);
      if (!!updatedProduct?.id) {
        toast.success("Default redirects updated successfully.");
        router.refresh();
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form className="w-full max-w-sm items-center" onSubmit={handleSubmit(updateDefaultRedirects)}>
      <Label htmlFor="defaultRedirectOnCompleteUrl">Redirect on complete URL:</Label>
      <Input
        type="url"
        id="defaultRedirectOnCompleteUrl"
        placeholder="https://client-web.com/redirect/complete"
        defaultValue={product.defaultRedirectOnCompleteUrl ?? ""}
        {...register("defaultRedirectOnCompleteUrl", {
          required: {
            value: true,
            message: "Required",
          },
        })}
      />
      {errors?.defaultRedirectOnCompleteUrl ? (
        <div className="my-2">
          <p className="text-xs text-red-500">{errors?.defaultRedirectOnCompleteUrl?.message}</p>
        </div>
      ) : null}

      <Label htmlFor="defaultRedirectOnFailUrl">Redirect on fail URL:</Label>
      <Input
        type="url"
        id="defaultRedirectOnFailUrl"
        placeholder="https://client-web.com/redirect/failed"
        defaultValue={product.defaultRedirectOnFailUrl ?? ""}
        {...register("defaultRedirectOnFailUrl", {
          required: {
            value: true,
            message: "Required",
          },
        })}
      />
      {errors?.defaultRedirectOnFailUrl ? (
        <div className="my-2">
          <p className="text-xs text-red-500">{errors?.defaultRedirectOnFailUrl?.message}</p>
        </div>
      ) : null}

      <Button type="submit" variant="darkCTA" className="mt-4">
        Update
      </Button>
    </form>
  );
};

export default EditRedirects;
