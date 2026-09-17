// Primitives kept in ui/. Form-field components moved to components/form/ (custom
// kit) and components/onboarding/fields/ (Faktura kit); this barrel re-exports
// the Faktura kit + Modal for existing importers during the migration.
export { Button, type ButtonProps } from "./Button";
export { Card } from "./Card";
export { Stepper, type Step } from "./Stepper";
export { Modal } from "@/components/modal/Modal";
export {
  Input,
  inputBase,
  type InputProps,
  Select,
  toOptions,
  type SelectProps,
  type SelectOption,
  Label,
  FieldError,
  FormField,
  TextField,
  type TextFieldProps,
  SelectField,
  type SelectFieldProps,
  ChoiceCard,
  OptionToggle,
} from "@/components/onboarding/fields";
