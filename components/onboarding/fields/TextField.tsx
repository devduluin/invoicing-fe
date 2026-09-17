"use client";

import { forwardRef } from "react";
import { FormField } from "./FormField";
import { Input, type InputProps } from "./Input";

export interface TextFieldProps extends InputProps {
  label: string;
  error?: string;
  optional?: boolean;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, optional, hint, ...inputProps },
  ref,
) {
  return (
    <FormField id={id} label={label} optional={optional} error={error} hint={hint}>
      <Input ref={ref} id={id} invalid={!!error} {...inputProps} />
    </FormField>
  );
});
