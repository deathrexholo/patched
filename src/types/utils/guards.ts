import { Timestamp } from 'firebase/firestore';
import { User } from '../models/user';
import { Post } from '../models/post';
import { Comment } from '../models/post';
import { Story } from '../models/story';
import { Message } from '../models/message';
import { Event } from '../models/event';
import { Group } from '../models/group';
import { ApiError } from '../api/responses';

/**
 * Type guard to check if a value is a User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'uid' in value &&
    'email' in value &&
    'displayName' in value &&
    typeof (value as User).uid === 'string' &&
    typeof (value as User).email === 'string' &&
    typeof (value as User).displayName === 'string'
  );
}

/**
 * Type guard to check if a value is a Post
 */
export function isPost(value: unknown): value is Post {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'userId' in value &&
    'caption' in value &&
    typeof (value as Post).id === 'string' &&
    typeof (value as Post).userId === 'string' &&
    typeof (value as Post).caption === 'string'
  );
}

/**
 * Type guard to check if a value is a Comment
 */
export function isComment(value: unknown): value is Comment {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'text' in value &&
    'userId' in value &&
    typeof (value as Comment).id === 'string' &&
    typeof (value as Comment).text === 'string' &&
    typeof (value as Comment).userId === 'string'
  );
}

/**
 * Type guard to check if a value is a Story
 */
export function isStory(value: unknown): value is Story {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'userId' in value &&
    'mediaUrl' in value &&
    typeof (value as Story).id === 'string' &&
    typeof (value as Story).userId === 'string' &&
    typeof (value as Story).mediaUrl === 'string'
  );
}

/**
 * Type guard to check if a value is a Message
 */
export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'senderId' in value &&
    'receiverId' in value &&
    'message' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).senderId === 'string' &&
    typeof (value as any).receiverId === 'string' &&
    typeof (value as any).message === 'string'
  );
}

/**
 * Type guard to check if a value is an Event
 */
export function isEvent(value: unknown): value is Event {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'date' in value &&
    'location' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).title === 'string'
  );
}

/**
 * Type guard to check if a value is a Group
 */
export function isGroup(value: unknown): value is Group {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'description' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).description === 'string'
  );
}

/**
 * Type guard to check if a value is a Firebase Timestamp
 */
export function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as Timestamp).seconds === 'number' &&
    typeof (value as Timestamp).nanoseconds === 'number' &&
    typeof (value as Timestamp).toDate === 'function'
  );
}

/**
 * Type guard to check if a value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard to check if a value is a valid timestamp (Timestamp or Date)
 */
export function isValidTimestamp(value: unknown): value is Timestamp | Date {
  return isTimestamp(value) || isDate(value);
}

/**
 * Type guard to check if a value is an ApiError
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard to check if a value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Type guard to check if a value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a non-empty array
 */
export function isNonEmptyArray<T = unknown>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Type guard to check if a value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<T>).then === 'function'
  );
}

/**
 * Type guard to check if a value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard to check if a value is a valid URL
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if a value has a specific property
 */
export function hasProperty<K extends string>(
  value: unknown,
  property: K
): value is Record<K, unknown> {
  return typeof value === 'object' && value !== null && property in value;
}

/**
 * Type guard to check if all elements in an array are of a specific type
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}
