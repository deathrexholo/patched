import { SyntheticEvent } from 'react';

/**
 * Makes all properties of T nullable
 */
export type Nullable<T> = T | null;

/**
 * Makes all properties of T optional
 */
export type Optional<T> = T | undefined;

/**
 * Makes specific keys K of T nullable
 */
export type NullableKeys<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * Makes specific keys K of T optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};

/**
 * Makes all properties of T required (opposite of Partial)
 */
export type RequiredAll<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Async function type
 */
export type AsyncFunction<T = void> = () => Promise<T>;

/**
 * Async function with parameters
 */
export type AsyncFunctionWithParams<TParams extends unknown[], TReturn = void> = (
  ...args: TParams
) => Promise<TReturn>;

/**
 * Generic event handler
 */
export type EventHandler<T = void> = (event: SyntheticEvent) => T;

/**
 * Typed event handler for specific elements
 */
export type TypedEventHandler<TElement extends Element, TReturn = void> = (
  event: SyntheticEvent<TElement>
) => TReturn;

/**
 * Callback function type
 */
export type Callback<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => TReturn;

/**
 * Async callback function type
 */
export type AsyncCallback<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Deep partial - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly - makes all nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Extract keys of T where the value type is V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Omit properties from T that are in K
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Pick properties from T that are in K
 */
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Make specific keys K of T readonly
 */
export type ReadonlyKeys<T, K extends keyof T> = Omit<T, K> & {
  readonly [P in K]: T[P];
};

/**
 * Extracts the type of array elements
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Extracts the return type of a Promise
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Creates a union of all values in an object
 */
export type ValueOf<T> = T[keyof T];

/**
 * Creates a type with all properties of T except those that are functions
 */
export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

/**
 * Creates a type with only the function properties of T
 */
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

/**
 * Tuple type helper
 */
export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;

type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

/**
 * Branded type for nominal typing
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * ID types for type safety
 */
export type UserId = Brand<string, 'UserId'>;
export type PostId = Brand<string, 'PostId'>;
export type CommentId = Brand<string, 'CommentId'>;
export type GroupId = Brand<string, 'GroupId'>;
export type EventId = Brand<string, 'EventId'>;
export type StoryId = Brand<string, 'StoryId'>;
export type MessageId = Brand<string, 'MessageId'>;

/**
 * Timestamp types
 */
export type ISODateString = Brand<string, 'ISODateString'>;
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

/**
 * Form field value types
 */
export type FormFieldValue = string | number | boolean | null | undefined;

/**
 * Form values generic type
 */
export type FormValues<T> = Record<keyof T, FormFieldValue>;

/**
 * Form errors generic type
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Form touched fields type
 */
export type FormTouched<T> = Partial<Record<keyof T, boolean>>;

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Field validation result type
 */
export type FieldValidationResult = string | null | undefined;

/**
 * Validator function type
 */
export type Validator<T> = (value: T) => FieldValidationResult;

/**
 * Async validator function type
 */
export type AsyncValidator<T> = (value: T) => Promise<FieldValidationResult>;
