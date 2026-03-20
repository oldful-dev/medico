// ─── Service Form SDUI Types ───
// Defines the JSON schema for Service.formFieldsJson
// Backend sends this config → DynamicFormRenderer renders the form

// ─── Visibility Rules ───
export type VisibilityOperator = 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'lt' | 'contains';

export interface VisibilityRule {
  field_id: string;
  operator: VisibilityOperator;
  value: string | string[] | number | boolean;
}

// ─── Alert Config ───
export interface AlertConfig {
  title: string;
  message: string;
  trigger_values?: string[];
}

// ─── Option Types ───
export interface FieldOption {
  id: string;
  label: string;
  sub_label?: string;
  icon_key?: string;
  image_url?: string;
  ionicon?: string;
  color?: string;
  bg_color?: string;
  border_color?: string;
  price?: string;
  price_value?: number;
  badge?: string;
  description?: string;
  sort_order: number;
  visible?: boolean;
}

// ─── Base Field ───
export interface BaseField {
  id: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  default_value?: any;
  visible_when?: VisibilityRule;
  placeholder?: string;
}

// ─── Field Types ───
export type FieldType =
  | 'radio'
  | 'checkbox'
  | 'pill_select'
  | 'icon_grid'
  | 'text_input'
  | 'textarea'
  | 'datetime'
  | 'image_upload'
  | 'stepper'
  | 'toggle'
  | 'mode_card'
  | 'dropdown'
  | 'info_banner';

// Radio — stacked vertical list, horizontal row, or image cards
export type RadioDisplay = 'stacked' | 'row' | 'card';

export interface RadioField extends BaseField {
  type: 'radio';
  display: RadioDisplay;
  options: FieldOption[];
  alert_on_select?: AlertConfig;
}

// Checkbox — multi-select with stacked or card display
export type CheckboxDisplay = 'stacked' | 'card';

export interface CheckboxField extends BaseField {
  type: 'checkbox';
  display: CheckboxDisplay;
  options: FieldOption[];
}

// Pill Select — horizontal/wrapped pill chips
export interface PillSelectField extends BaseField {
  type: 'pill_select';
  options: FieldOption[];
  multi_select?: boolean;
}

// Icon Grid — grid of icon cards (doctor-visit problems, specialist grid)
export interface IconGridField extends BaseField {
  type: 'icon_grid';
  options: FieldOption[];
  columns?: number;
}

// Text Input — single-line text
export interface TextInputField extends BaseField {
  type: 'text_input';
  placeholder?: string;
  hint?: string;
  keyboard_type?: 'default' | 'numeric' | 'email' | 'phone';
  max_length?: number;
}

// Textarea — multiline text
export interface TextAreaField extends BaseField {
  type: 'textarea';
  placeholder?: string;
  min_height?: number;
  max_length?: number;
}

// DateTime — date/time picker
export interface DateTimeField extends BaseField {
  type: 'datetime';
  mode?: 'date' | 'time' | 'datetime';
  min_date?: 'today' | string;
}

// Image Upload — photo/document upload
export interface ImageUploadField extends BaseField {
  type: 'image_upload';
  title?: string;
  subtitle?: string;
  max_images?: number;
  upload_category?: string;
}

// Stepper — increment/decrement counter
export interface StepperField extends BaseField {
  type: 'stepper';
  min?: number;
  max?: number;
  step?: number;
  default_value?: number;
}

// Toggle — on/off switch
export interface ToggleField extends BaseField {
  type: 'toggle';
  description?: string;
}

// Mode Card — radio cards with pricing info
export interface ModeCardField extends BaseField {
  type: 'mode_card';
  options: FieldOption[];
}

// Dropdown — option selector
export interface DropdownField extends BaseField {
  type: 'dropdown';
  options: FieldOption[];
  alert_on_select?: AlertConfig;
}

// Info Banner — static informational banner
export interface InfoBannerField extends BaseField {
  type: 'info_banner';
  title: string;
  subtitle?: string;
  icon_key?: string;
  image_url?: string;
  bg_color?: string;
  text_color?: string;
}

// Union of all field types
export type FormField =
  | RadioField
  | CheckboxField
  | PillSelectField
  | IconGridField
  | TextInputField
  | TextAreaField
  | DateTimeField
  | ImageUploadField
  | StepperField
  | ToggleField
  | ModeCardField
  | DropdownField
  | InfoBannerField;

// ─── Section ───
export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  fields: FormField[];
  visible_when?: VisibilityRule;
  sort_order: number;
  card_style?: 'default' | 'muted' | 'tinted' | 'none';
}

// ─── Layout Config ───
export type HeaderStyle = 'green_bar' | 'green_hero' | 'cream_flat';

export interface LayoutConfig {
  header_style: HeaderStyle;
  header_subtitle?: string;
  description?: string;
  description_highlight?: string;
  hero_image_url?: string;
  hero_subtitle?: string;
  cta_text: string;
  cta_loading_text?: string;
  bg_color?: string;
}

// ─── Top-Level Form Config ───
export interface ServiceFormConfig {
  version: number;
  layout: LayoutConfig;
  sections: FormSection[];
  banners?: InfoBannerField[];
}

// ─── Form State ───
// Runtime state managed by DynamicFormRenderer
export type FormState = Record<string, any>;

// ─── Submission Payload ───
export interface FormSubmissionData {
  serviceId: string;
  cityId: string;
  scheduledDate?: string;
  addressLine?: string;
  formDataJson: Record<string, any>;
}
