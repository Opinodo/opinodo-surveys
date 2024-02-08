"use client";

import { updateProductAction } from "@/app/(app)/environments/[environmentId]/settings/product/actions";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { TProduct } from "@formbricks/types/product";
import { Button } from "@formbricks/ui/Button";
import { Input } from "@formbricks/ui/Input";
import { Label } from "@formbricks/ui/Label";

type EditDefaultRewardFormValues = {
  defaultRewardInEuros: number;
};

type EditDefaultRewardProps = {
  environmentId: string;
  product: TProduct;
};

const EditDefaultReward: React.FC<EditDefaultRewardProps> = ({ product, environmentId }) => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditDefaultRewardFormValues>({
    defaultValues: {
      defaultRewardInEuros: product.defaultRewardInEuros,
    },
  });

  const updateDefaultReward: SubmitHandler<EditDefaultRewardFormValues> = async (data) => {
    try {
      data.defaultRewardInEuros = parseFloat(String(data.defaultRewardInEuros));
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
      <Label htmlFor="defaultRewardInEuros">Amount received for successful survey completion in euros:</Label>
      <Input
        type="number"
        id="defaultRewardInEuros"
        step="0.01"
        defaultValue={product.defaultRewardInEuros}
        {...register("defaultRewardInEuros", {
          min: { value: 0, message: "Must be a positive number" },
          max: { value: 10, message: "Must be less than 10" },
          required: {
            value: true,
            message: "Required",
          },
        })}
      />
      {errors?.defaultRewardInEuros ? (
        <div className="my-2">
          <p className="text-xs text-red-500">{errors?.defaultRewardInEuros?.message}</p>
        </div>
      ) : null}

      <Button type="submit" variant="darkCTA" className="mt-4">
        Update
      </Button>
    </form>
  );
};

export default EditDefaultReward;
