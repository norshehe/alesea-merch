"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart.store";
import { useSettings } from "@/app/providers/settings-provider";
import { formatPrice } from "@/lib/format";
import {
  checkoutSchema,
  type CheckoutFormValues,
  type DeliveryMethod,
} from "@/features/checkout/schemas/checkout.schema";
import {
  placeOrder,
  type IPlaceOrderInput,
} from "@/features/checkout/server/place-order";

const INPUT_BASE =
  "w-full border bg-white px-[15px] py-[13px] text-sm text-ink outline-none transition-colors focus:border-teal";

interface IFieldProps {
  placeholder: string;
  error?: string;
  full?: boolean;
  type?: string;
  registration: UseFormRegisterReturn;
}

function Field({ placeholder, error, full, type, registration }: IFieldProps) {
  return (
    <div className={full ? "col-span-full" : undefined}>
      <input
        type={type}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${INPUT_BASE} ${error ? "border-destructive" : "border-line-deep"}`}
        {...registration}
      />
      {error ? (
        <p className="mt-1.5 text-[11px] tracking-[0.02em] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const DELIVERY_OPTIONS: {
  key: DeliveryMethod;
  label: string;
  note: string;
}[] = [
  { key: "standard", label: "Standard delivery", note: "3–5 days · nationwide" },
  { key: "express", label: "Express delivery", note: "1–2 days · Luzon" },
];

interface IPlacedOrder {
  ref: string;
  name: string;
  email: string;
}

export function CheckoutView() {
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const clear = useCartStore((s) => s.clear);
  const {
    currency,
    freeShipThreshold,
    standardShipping: standardRate,
    expressShipping: expressRate,
  } = useSettings();

  const [promoApplied, setPromoApplied] = useState(false);
  const [promo, setPromo] = useState("");
  const [placed, setPlaced] = useState<IPlacedOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { delivery: "standard" },
  });

  const delivery = useWatch({ control, name: "delivery" });

  const shipping = useMemo(() => {
    if (delivery === "express") return expressRate;
    return subtotal >= freeShipThreshold ? 0 : standardRate;
  }, [delivery, subtotal, expressRate, freeShipThreshold, standardRate]);

  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount + shipping;

  const deliveryLabel =
    DELIVERY_OPTIONS.find((d) => d.key === delivery)?.label ?? "Shipping";

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (code === "COAST10") {
      setPromoApplied(true);
      toast("COAST10 applied — 10% off");
    } else {
      toast("Invalid code");
    }
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    const input: IPlaceOrderInput = {
      contact: { email: values.email, phone: values.phone },
      shipping: {
        first: values.first,
        last: values.last,
        address: values.address,
        address2: values.address2,
        city: values.city,
        province: values.province,
        zip: values.zip,
        country: "Philippines",
      },
      deliveryMethod: values.delivery,
      deliveryLabel,
      paymentMethod: "Cash on delivery",
      lines: lines.map((line) => ({
        name: line.name,
        variant: `${line.color} · ${line.size}`,
        quantity: line.quantity,
        unitPrice: line.price,
        lineTotal: line.price * line.quantity,
      })),
      subtotal,
      shippingCost: shipping,
      discount,
      total,
      currency,
    };

    setSubmitting(true);
    try {
      const res = await placeOrder(input);
      if (res.ok) {
        setPlaced({ ref: res.reference, name: values.first, email: values.email });
        clear();
        setPromoApplied(false);
        setPromo("");
        window.scrollTo({ top: 0 });
      } else {
        toast.error(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- success panel ----
  if (placed) {
    return (
      <div className="min-h-[60vh] px-6 pt-12 pb-[110px] sm:px-14">
        <div className="mx-auto my-10 max-w-[560px] border border-line bg-white px-10 py-[60px] text-center">
          <span className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-teal">
            <Check className="size-7 text-white" strokeWidth={1.6} />
          </span>
          <h1 className="font-serif text-[38px] text-teal">Order confirmed</h1>
          <p className="mt-3.5 text-[15px] leading-[1.7] font-normal text-stone-deep">
            Thank you, {placed.name}. A confirmation is on its way to{" "}
            {placed.email}. Your coastal goods ship from La Union within 3–5
            days.
          </p>
          <p className="mt-[22px] font-mono text-[13px] tracking-[0.1em] text-clay">
            Order {placed.ref}
          </p>
          <Link
            href="/#shop-grid"
            className="mt-[30px] inline-block rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // ---- empty cart ----
  if (lines.length === 0) {
    return (
      <div className="min-h-[60vh] px-6 pt-12 pb-[110px] sm:px-14">
        <div className="border-t border-line py-20 text-center">
          <p className="font-serif text-[26px] text-teal">
            Your bag is empty.
          </p>
          <p className="mt-2.5 text-[15px] font-normal text-stone">
            Add a few coastal goods before checking out.
          </p>
          <Link
            href="/#shop-grid"
            className="mt-[26px] inline-block rounded-full border border-teal bg-teal px-8 py-4 text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  // ---- checkout form ----
  return (
    <div className="min-h-[60vh] px-6 pt-12 pb-[110px] sm:px-14">
      <Link
        href="/cart"
        className="mb-[26px] inline-block text-[11.5px] tracking-[0.16em] uppercase text-stone transition-colors hover:text-ink"
      >
        ← Back to bag
      </Link>

      <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-[620px]" noValidate>
          <h1 className="mb-[34px] font-serif text-[34px] text-teal sm:text-[40px]">
            Checkout
          </h1>

          {/* 1 Contact */}
          <Section step={1} title="Contact">
            <div className="grid gap-3.5">
              <Field
                placeholder="Email address"
                type="email"
                error={errors.email?.message}
                registration={register("email")}
              />
              <Field
                placeholder="Phone (for delivery updates)"
                type="tel"
                registration={register("phone")}
              />
            </div>
          </Section>

          {/* 2 Shipping address */}
          <Section step={2} title="Shipping address">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field
                placeholder="First name"
                error={errors.first?.message}
                registration={register("first")}
              />
              <Field
                placeholder="Last name"
                error={errors.last?.message}
                registration={register("last")}
              />
              <Field
                placeholder="Street address"
                full
                error={errors.address?.message}
                registration={register("address")}
              />
              <Field
                placeholder="Apartment, unit, barangay (optional)"
                full
                registration={register("address2")}
              />
              <Field
                placeholder="City / Municipality"
                error={errors.city?.message}
                registration={register("city")}
              />
              <Field
                placeholder="Province"
                error={errors.province?.message}
                registration={register("province")}
              />
              <Field
                placeholder="Postal code"
                error={errors.zip?.message}
                registration={register("zip")}
              />
              <input
                value="Philippines"
                disabled
                aria-label="Country"
                className="col-span-full border border-line-deep bg-[#EFE9DD] px-[15px] py-[13px] text-sm text-clay outline-none"
              />
            </div>
          </Section>

          {/* 3 Delivery */}
          <Section step={3} title="Delivery">
            <div className="flex flex-col gap-3">
              {DELIVERY_OPTIONS.map((option) => {
                const on = delivery === option.key;
                const price =
                  option.key === "express"
                    ? expressRate
                    : subtotal >= freeShipThreshold
                      ? 0
                      : standardRate;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setValue("delivery", option.key)}
                    aria-pressed={on}
                    className={`flex w-full items-center justify-between border px-[18px] py-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal ${
                      on ? "border-teal bg-[#F0EADD]" : "border-[#E0D6C2] bg-white"
                    }`}
                  >
                    <span className="flex items-center gap-[13px]">
                      <span
                        className={`size-[18px] flex-[0_0_18px] rounded-full border ${
                          on
                            ? "border-teal shadow-[inset_0_0_0_4px_var(--color-teal)]"
                            : "border-shell"
                        }`}
                      />
                      <span className="flex flex-col items-start gap-[3px]">
                        <span className="text-[14.5px] text-ink">
                          {option.label}
                        </span>
                        <span className="text-[12.5px] font-normal text-clay">
                          {option.note}
                        </span>
                      </span>
                    </span>
                    <span className="text-[14.5px] text-teal">
                      {price === 0 ? "Free" : formatPrice(price, currency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <button
            type="submit"
            disabled={submitting}
            className="mt-[30px] w-full rounded-full border border-teal bg-teal py-[18px] text-[12px] tracking-[0.18em] uppercase text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
          >
            {submitting
              ? "Placing order…"
              : `Place order — ${formatPrice(total, currency)}`}
          </button>
          <p className="mt-3.5 text-center text-xs font-normal text-clay">
            Orders are arranged for cash on delivery — no online payment is
            taken.
          </p>
        </form>

        {/* summary */}
        <div className="sticky top-[96px] bg-sand px-[30px] pt-[30px] pb-[34px]">
          <h2 className="mb-5 font-serif text-[22px] text-teal">In your bag</h2>
          <div className="mb-5 flex max-h-[280px] flex-col gap-4 overflow-y-auto">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-[13px]">
                <div className="dc-stripe relative aspect-4/5 flex-[0_0_50px]">
                  <span className="absolute -top-[7px] -right-[7px] flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-teal px-[5px] text-[10.5px] text-white">
                    {line.quantity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-serif text-[14.5px] leading-tight text-ink">
                    {line.name}
                  </span>
                  <span className="text-[11px] tracking-[0.06em] uppercase text-clay">
                    {line.color} · {line.size}
                  </span>
                </div>
                <span className="whitespace-nowrap text-[13.5px] text-ink">
                  {formatPrice(line.price * line.quantity, line.currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-[18px] flex gap-2">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Discount code"
              aria-label="Discount code"
              className="flex-1 border border-line-deep bg-cream px-3.5 py-3 text-[13px] text-ink outline-none focus:border-teal"
            />
            <button
              type="button"
              onClick={applyPromo}
              className="bg-ink px-[18px] text-[11px] tracking-[0.14em] uppercase text-white transition-colors hover:bg-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              Apply
            </button>
          </div>

          <div className="border-t border-[#DCD0BC] pt-4">
            <div className="flex justify-between py-[7px] text-sm text-stone-deep">
              <span>Subtotal</span>
              <span className="text-ink">{formatPrice(subtotal, currency)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between py-[7px] text-sm text-stone-deep">
                <span>Discount (COAST10)</span>
                <span className="text-ink">−{formatPrice(discount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between py-[7px] text-sm text-stone-deep">
              <span>{deliveryLabel}</span>
              <span className="text-ink">
                {shipping === 0 ? "Free" : formatPrice(shipping, currency)}
              </span>
            </div>
            <div className="mt-[9px] flex justify-between border-t border-[#DCD0BC] pt-[18px] text-[19px] text-ink">
              <span className="font-serif">Total</span>
              <span className="font-serif">{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-[18px] flex items-baseline gap-3">
      <span className="inline-flex size-[26px] items-center justify-center rounded-full bg-teal text-xs text-white">
        {step}
      </span>
      <h2 className="font-serif text-[22px] text-ink">{title}</h2>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[38px]">
      <SectionHeader step={step} title={title} />
      {children}
    </div>
  );
}
