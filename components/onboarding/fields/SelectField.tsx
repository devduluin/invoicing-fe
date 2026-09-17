"use client";

import { forwardRef } from "react";
import { FormField } from "./FormField";
import { Select, type SelectProps } from "./Select";

export interface SelectFieldProps extends SelectProps {
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id, label, error, optional, hint, ...selectProps },
  ref,
) {
  return (
    <FormField id={id} label={label} optional={optional} error={error} hint={hint}>
      <Select ref={ref} id={id} invalid={!!error} {...selectProps} />
    </FormField>
  );
});
