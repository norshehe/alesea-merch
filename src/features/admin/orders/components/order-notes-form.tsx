"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/admin/components/field";
import { SubmitButton } from "@/features/admin/components/submit-button";
import { updateOrderNotes } from "@/features/admin/orders/server/order.actions";
import {
  ORDER_NOTES_MAX,
  updateOrderNotesSchema,
  type UpdateOrderNotesValues,
} from "@/features/admin/orders/schemas/order.schema";

interface IOrderNotesFormProps {
  orderId: string;
  notes: string;
}

/**
 * The only editable field on an order. Everything else — amounts, address, line
 * items — is the customer's record of what they asked for and is read-only by
 * design; these notes are the shop's own annotation.
 *
 * `<Textarea>` forwards its ref, so plain `register()` works here (unlike the
 * Base UI Select, which needs a Controller).
 */
export function OrderNotesForm({ orderId, notes }: IOrderNotesFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrderNotesValues>({
    resolver: zodResolver(updateOrderNotesSchema),
    defaultValues: { orderId, notes },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await updateOrderNotes(values.orderId, values.notes);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    // Re-baseline so the form stops reading as dirty after a successful save.
    reset(values);
    toast.success("Notes saved.");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" {...register("orderId")} />
      <Field
        label="Internal notes"
        htmlFor="notes"
        hint={`Visible to admins only. Up to ${ORDER_NOTES_MAX} characters.`}
        error={errors.notes?.message}
      >
        <Textarea
          id="notes"
          rows={4}
          disabled={isSubmitting}
          aria-invalid={!!errors.notes}
          placeholder="Anything the team should know about this order."
          {...register("notes")}
        />
      </Field>
      <div>
        <SubmitButton
          size="sm"
          pending={isSubmitting}
          disabled={!isDirty}
          pendingLabel="Saving…"
        >
          Save notes
        </SubmitButton>
      </div>
    </form>
  );
}
