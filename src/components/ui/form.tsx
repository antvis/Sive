import { cloneElement, createContext, useContext, useId, type ReactElement, type ReactNode } from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
export { useForm } from 'react-hook-form';
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
        <div className="ui-form" onChange={onValuesChange}>
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
  children: ReactElement;
}) {
  const { control } = useFormContext();
  const disabled = useContext(DisabledContext);
  const id = useId();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="ui-field">
          <label id={`${id}-label`} htmlFor={id}>
            {label}
            {required && (
              <span aria-hidden className="ui-required">
                *
              </span>
            )}
          </label>
          {cloneElement(children as ReactElement<Record<string, unknown>>, {
            ...field,
            value: field.value ?? '',
            id,
            disabled,
            'aria-labelledby': `${id}-label`,
            'aria-invalid': !!fieldState.error,
            'aria-describedby': fieldState.error ? `${id}-error` : extra ? `${id}-help` : undefined,
          })}
          {extra && <small id={`${id}-help`}>{extra}</small>}
          {fieldState.error && (
            <span role="alert" className="ui-field-error" id={`${id}-error`}>
              {fieldState.error.message}
            </span>
          )}
        </div>
      )}
    />
  );
}
