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
  required?: boolean | string;
  extra?: ReactNode;
  children: ReactElement;
}) {
  const { control } = useFormContext();
  const disabled = useContext(DisabledContext);
  const id = useId();
  const { min, max } = children.props as { min?: number; max?: number };
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        validate: (value) => {
          if (required && (value === undefined || value === null || String(value).trim() === ''))
            return typeof required === 'string' ? required : `请填写${label}`;
          if (typeof value === 'number' && !Number.isFinite(value)) return `请填写有效的${label}`;
          if (value !== '' && value != null && min !== undefined && Number(value) < min)
            return `${label}不能小于 ${min}`;
          if (value !== '' && value != null && max !== undefined && Number(value) > max)
            return `${label}不能大于 ${max}`;
          return true;
        },
      }}
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
