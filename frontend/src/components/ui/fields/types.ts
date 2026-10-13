export type FieldBaseProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
  prefix?: string;
};
