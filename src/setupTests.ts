import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream } from 'stream/web';

if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TextDecoder;
}
if (typeof globalThis.ReadableStream === 'undefined') {
  (globalThis as any).ReadableStream = ReadableStream;
}
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

