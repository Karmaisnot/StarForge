import { describe, expect, it } from 'vitest';
import { fileTypeLabel, previewKind, safeFileUrl } from './filePreview.js';

describe('material file preview', () => {
  it('accepts secure and local-development file URLs', () => {
    expect(safeFileUrl('https://files.example.test/report.pdf', 'https://app.example.test')).toBe('https://files.example.test/report.pdf');
    expect(safeFileUrl('http://127.0.0.1:9000/report.pdf', 'http://localhost:5173')).toBe('http://127.0.0.1:9000/report.pdf');
  });

  it('rejects unsafe file URLs', () => {
    expect(safeFileUrl('javascript:alert(1)')).toBeNull();
    expect(safeFileUrl('https://user:secret@example.test/file.pdf')).toBeNull();
  });

  it('selects browser-native viewers and labels specialist files', () => {
    expect(previewKind('application/pdf')).toBe('pdf');
    expect(previewKind('image/png')).toBe('image');
    expect(previewKind('video/mp4')).toBe('video');
    expect(previewKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('external');
    expect(fileTypeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCX');
  });
});
