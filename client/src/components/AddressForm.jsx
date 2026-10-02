import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { countryName } from '../lib/countries';
import { cn } from '../lib/format';
import { Badge, Button, CountrySelect, Field, Icon, Input, PhoneInput } from './ui';
import { applyServerErrors } from '../pages/Auth';

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(2, 'Enter the recipient name'),
  phone: z.object({ dialCode: z.string(), number: z.string().trim().regex(/^[0-9\s-]{5,16}$/, 'Enter a valid phone number') }),
  addressLine1: z.string().trim().min(3, 'Enter the street address'),
  addressLine2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter the city'),
  state: z.string().trim().min(2, 'Enter the state / region'),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9\s-]{3,12}$/, 'Enter a valid postal code'),
  country: z.string().length(2, 'Select a country'),
  isDefault: z.boolean().optional(),
});

export const emptyAddress = (user) => ({
  label: 'Home',
  fullName: user?.name || '',
  phone: { dialCode: user?.phone?.dialCode || '+91', number: user?.phone?.number || '' },
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
  country: user?.country || 'IN',
  isDefault: false,
});

/**
 * International address form. When `embedded` it renders without its own <form>
 * submit button (parent controls via `formRef`-style onSubmit prop).
 */
export function AddressForm({ defaultValues, onSubmit, submitLabel = 'Save address', onCancel, showDefault = true, extra }) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(addressSchema), defaultValues });
  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyServerErrors(err, setError);
      setError('root', { message: err.message });
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      {errors.root && <p className="md:col-span-2 p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm" role="alert">{errors.root.message}</p>}
      <Field label="Full name" error={errors.fullName?.message} required htmlFor="a-name">
        <Input id="a-name" autoComplete="name" error={errors.fullName} {...register('fullName')} />
      </Field>
      <Field label="Phone for delivery" error={errors.phone?.number?.message} required>
        <PhoneInput dialProps={register('phone.dialCode')} numberProps={register('phone.number')} error={errors.phone?.number} />
      </Field>
      <Field label="Country" error={errors.country?.message} required className="md:col-span-2">
        <CountrySelect autoComplete="country" error={errors.country} {...register('country')} />
      </Field>
      <Field label="Address line 1" error={errors.addressLine1?.message} required className="md:col-span-2" htmlFor="a-l1">
        <Input id="a-l1" autoComplete="address-line1" placeholder="House / flat no., building, street" error={errors.addressLine1} {...register('addressLine1')} />
      </Field>
      <Field label="Address line 2" htmlFor="a-l2">
        <Input id="a-l2" autoComplete="address-line2" placeholder="Area, locality (optional)" {...register('addressLine2')} />
      </Field>
      <Field label="Landmark" htmlFor="a-lm">
        <Input id="a-lm" placeholder="Near… (optional)" {...register('landmark')} />
      </Field>
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <Field label="City" error={errors.city?.message} required htmlFor="a-city">
          <Input id="a-city" autoComplete="address-level2" error={errors.city} {...register('city')} />
        </Field>
        <Field label="State / Region" error={errors.state?.message} required htmlFor="a-state">
          <Input id="a-state" autoComplete="address-level1" error={errors.state} {...register('state')} />
        </Field>
        <Field label="Postal code" error={errors.postalCode?.message} required htmlFor="a-zip">
          <Input id="a-zip" autoComplete="postal-code" error={errors.postalCode} {...register('postalCode')} />
        </Field>
      </div>
      <Field label="Label" hint="e.g. Home, Office, Parents" htmlFor="a-label">
        <Input id="a-label" {...register('label')} />
      </Field>
      {showDefault && (
        <label className="flex items-center gap-2 text-body-sm self-end pb-3">
          <input type="checkbox" className="accent-secondary w-4 h-4" {...register('isDefault')} /> Set as default address
        </label>
      )}
      {extra}
      <div className="md:col-span-2 flex justify-end gap-space-sm pt-space-xs">
        {onCancel && <Button type="button" variant="tonal" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function AddressCard({ address, selected, onSelect, actions, name = 'address' }) {
  const Comp = onSelect ? 'label' : 'div';
  return (
    <Comp className={cn('relative flex flex-col p-space-md rounded-2xl transition-all', onSelect && 'cursor-pointer', selected ? 'bg-surface-container-lowest shadow-lift ring-2 ring-secondary' : 'bg-surface-container-low shadow-card hover:bg-surface-container-lowest')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {onSelect && <input type="radio" name={name} checked={selected} onChange={onSelect} className="w-4 h-4 accent-primary" />}
          <span className="text-headline-sm">{address.label || 'Address'}</span>
        </div>
        {address.isDefault && <Badge tone="mint">Default</Badge>}
      </div>
      <div className="mt-3 text-body-sm text-on-surface-variant flex flex-col gap-0.5">
        <span className="font-semibold text-on-surface">{address.fullName}</span>
        <span>{[address.addressLine1, address.addressLine2].filter(Boolean).join(', ')}</span>
        {address.landmark && <span>Landmark: {address.landmark}</span>}
        <span>{address.city}, {address.state} {address.postalCode}</span>
        <span>{countryName(address.country)}</span>
        {address.phone?.number && <span className="text-label-sm font-normal text-outline mt-1 flex items-center gap-1"><Icon name="call" className="text-[14px]" /> {address.phone.dialCode} {address.phone.number}</span>}
      </div>
      {actions && <div className="flex gap-3 mt-space-sm pt-space-sm border-t border-surface-container-high">{actions}</div>}
    </Comp>
  );
}
