"use client";

import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { TProduct } from "@formbricks/types/product";
import { Button } from "@formbricks/ui/Button";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";

import { updateProductAction } from "../actions";

type EditDefaultRewardFormValues = {
  defaultRewardInUSD: number;
};

type EditDefaultRewardProps = {
  environmentId: string;
  product: TProduct;
};

export const EditDefaultReward: React.FC<EditDefaultRewardProps> = ({ product, environmentId }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditDefaultRewardFormValues>({
    defaultValues: {
      defaultRewardInUSD: product.defaultRewardInUSD,
    },
  });

  const updateDefaultReward: SubmitHandler<EditDefaultRewardFormValues> = async (data) => {
    try {
      data.defaultRewardInUSD = parseFloat(String(data.defaultRewardInUSD));
      const updatedProduct = await updateProductAction(environmentId, product.id, data);
      if (!!updatedProduct?.id) {
        toast.success("Default reward updated successfully.");
        router.refresh();
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form className="w-full max-w-sm items-center" onSubmit={handleSubmit(updateDefaultReward)}>
      <Label htmlFor="defaultRewardInUSD">Amount received for successful survey completion in dollars:</Label>
      <Input
        type="number"
        id="defaultRewardInUSD"
        step="0.1"
        defaultValue={product.defaultRewardInUSD}
        {...register("defaultRewardInUSD", {
          min: { value: 0, message: "Must be a positive number" },
          max: { value: 20, message: "Must not be be greater than 20" },
          required: {
            value: true,
            message: "Required",
          },
        })}
      />
      {errors?.defaultRewardInUSD ? (
        <div className="my-2">
          <p className="text-xs text-red-500">{errors?.defaultRewardInUSD?.message}</p>
        </div>
      ) : null}

      <Button type="submit" variant="darkCTA" className="mt-4">
        Update
      </Button>
    </form>
  );
};
