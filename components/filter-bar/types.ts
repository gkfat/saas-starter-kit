export type FilterBarConfig = {
  fields: FilterField[];
};

export type FieldValue = string | number | boolean | (string | number)[] | null | undefined;

export type FormData = Record<string, FieldValue>;

type BaseFilterField = {
  key: string;
  label: string;
  icon: string;
  placeholder?: string;
  required?: boolean;
  removable?: boolean;
  apiKey?: string;
};

export type TextInputFilterField = BaseFilterField & {
  type: 'text';
  defaultValue?: string;
  validation?: (value: string) => boolean | string;
  transform?: (value: string) => FieldValue;
};

export type SelectFilterField<T = string | number> = BaseFilterField & {
  type: 'select';
  options: SelectOption<T>[];
  defaultValue?: T | null;
  transform?: (value: T | null) => FieldValue;
};

export type MultiSelectFilterField<T = string | number> = BaseFilterField & {
  type: 'multiSelect';
  options: SelectOption<T>[];
  defaultValue?: T[];
  transform?: (value: T[]) => FieldValue;
};

export type FilterField =
  | TextInputFilterField
  | SelectFilterField<string | number>
  | MultiSelectFilterField<string | number>;

export const isTextInputField = (field: FilterField): field is TextInputFilterField =>
  field.type === 'text';

export const isSelectField = (field: FilterField): field is SelectFilterField<string | number> =>
  field.type === 'select';

export const isMultiSelectField = (
  field: FilterField,
): field is MultiSelectFilterField<string | number> => field.type === 'multiSelect';

export type SelectOption<T = string | number> = {
  text: string;
  value: T;
  disabled?: boolean;
};

export type AppliedFilter = {
  key: string;
  label: string;
  value: string;
  removable: boolean;
};

export type CreateTextInputFieldOptions = {
  key: string;
  label: string;
  placeholder?: string;
  icon?: string;
  required?: boolean;
  removable?: boolean;
  defaultValue?: string;
  apiKey?: string;
  validation?: (value: string) => boolean | string;
  transform?: (value: string) => FieldValue;
};

export type CreateSelectFieldOptions<T = string | number> = {
  key: string;
  label: string;
  options: SelectOption<T>[];
  icon?: string;
  required?: boolean;
  removable?: boolean;
  defaultValue?: T | null;
  apiKey?: string;
  transform?: (value: T | null) => FieldValue;
};

export type CreateMultiSelectFieldOptions<T = string | number> = {
  key: string;
  label: string;
  options: SelectOption<T>[];
  icon?: string;
  required?: boolean;
  removable?: boolean;
  defaultValue?: T[];
  apiKey?: string;
  transform?: (value: T[]) => FieldValue;
};

export const createTextInputField = (
  options: CreateTextInputFieldOptions,
): TextInputFilterField => {
  const {
    key,
    label,
    placeholder = label,
    icon = 'mdi-magnify',
    required = false,
    removable = true,
    defaultValue = '',
    apiKey,
    validation,
    transform,
  } = options;

  return {
    key,
    type: 'text',
    label,
    icon,
    placeholder,
    defaultValue,
    required,
    removable,
    apiKey,
    validation,
    transform,
  };
};

export const createSelectField = <T = string | number>(
  options: CreateSelectFieldOptions<T>,
): SelectFilterField<T> => {
  const {
    key,
    label,
    options: selectOptions,
    icon = 'mdi-chevron-down',
    required = false,
    removable = true,
    defaultValue = null,
    apiKey,
    transform,
  } = options;

  return {
    key,
    type: 'select',
    label,
    icon,
    options: selectOptions,
    defaultValue,
    required,
    removable,
    apiKey,
    transform,
  };
};

export const createMultiSelectField = <T = string | number>(
  options: CreateMultiSelectFieldOptions<T>,
): MultiSelectFilterField<T> => {
  const {
    key,
    label,
    options: selectOptions,
    icon = 'mdi-filter-variant',
    required = false,
    removable = true,
    defaultValue = [] as T[],
    apiKey,
    transform,
  } = options;

  return {
    key,
    type: 'multiSelect',
    label,
    icon,
    options: selectOptions,
    defaultValue,
    required,
    removable,
    apiKey,
    transform,
  };
};
