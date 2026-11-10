import { cloneElement, createContext, useContext, useId, type ReactElement, type ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
const DisabledContext = createContext(false);

export function Form<T extends FieldValues>({
  form,
  disabled = false,
  onValuesChange,
  children,
}: {
  form: UseFormReturn<T>;
  disabled?: boolean;
  onValuesChange?: () => void;
  children: ReactNode;
}) {
  return (
    <FormProvider {...form}>
      <DisabledContext.Provider value={disabled}>
        <div className="grid gap-4" onChange={onValuesChange}>
          {children}
        </div>
      </DisabledContext.Provider>
    </FormProvider>
  );
}

export function Field({
  name,
  label,
  required,
  extra,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  extra?: ReactNode;
  children: ReactElement<Record<string, unknown>>;
}) {
  const { control } = useFormContext();
  const disabled = useContext(DisabledContext);
  const id = useId();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-2 min-w-0">
          <label className="font-medium text-body" id={`${id}-label`} htmlFor={id}>
            {label}
            {required && (
              <span aria-hidden className="text-muted ml-1">
                *
              </span>
            )}
          </label>
          {cloneElement(children, {
            ...field,
            value: field.value ?? '',
            id,
            disabled,
            'aria-labelledby': `${id}-label`,
            'aria-invalid': !!fieldState.error,
            'aria-describedby': (fieldState.error && `${id}-error`) || (extra && `${id}-help`) || undefined,
          })}
          {extra && (
            <small className="text-muted leading-[1.6] text-helper" id={`${id}-help`}>
              {extra}
            </small>
          )}
          {fieldState.error && (
            <span role="alert" className="text-danger text-helper" id={`${id}-error`}>
              {fieldState.error.message}
            </span>
          )}
        </div>
      )}
    />
  );
}
