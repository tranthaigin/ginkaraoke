import { describe, it, expect } from 'vitest';
import {
  normalizeSongTitle,
  removeVietnameseDiacritics,
  matchesSearchQuery,
  generateSongKey
} from './normalize';

describe('Vietnamese Song Normalization', () => {
  it('should remove Vietnamese diacritics correctly including Đ/đ', () => {
    expect(removeVietnameseDiacritics('Đêm Nay Bác Không Ngủ')).toBe('Dem Nay Bac Khong Ngu');
    expect(removeVietnameseDiacritics('đường một chiều')).toBe('duong mot chieu');
    expect(removeVietnameseDiacritics('Nơi này có anh')).toBe('Noi nay co anh');
  });

  it('should normalize different case and spacing variations of the same title', () => {
    const v1 = normalizeSongTitle('Nơi Này Có Anh');
    const v2 = normalizeSongTitle('nơi này có anh');
    const v3 = normalizeSongTitle('NƠI NÀY CÓ ANH');
    const v4 = normalizeSongTitle('   nơi   này   có   anh   ');

    expect(v1).toBe('noi nay co anh');
    expect(v1).toBe(v2);
    expect(v2).toBe(v3);
    expect(v3).toBe(v4);
  });

  it('should strip common decorative labels like (Karaoke), [Beat], (Cover)', () => {
    expect(normalizeSongTitle('Nơi Này Có Anh (Karaoke)')).toBe('noi nay co anh');
    expect(normalizeSongTitle('Bạc Phận [Beat]')).toBe('bac phan');
    expect(normalizeSongTitle('Sóng Gió (Cover)')).toBe('song gio');
    expect(normalizeSongTitle('Chúng Ta Của Tương Lai (Official MV)')).toBe('chung ta cua tuong lai');
    expect(normalizeSongTitle('Nơi Này Có Anh Karaoke')).toBe('noi nay co anh');
  });

  it('should NOT merge distinct songs', () => {
    expect(normalizeSongTitle('Sóng Gió')).not.toBe(normalizeSongTitle('Bạc Phận'));
    expect(normalizeSongTitle('Nơi Này Có Anh')).not.toBe(normalizeSongTitle('Cơn Mưa Ngang Qua'));
  });

  it('should generate consistent song keys', () => {
    const key1 = generateSongKey('Nơi Này Có Anh', 'Sơn Tùng M-TP');
    const key2 = generateSongKey('nơi này có anh', 'son tung m-tp');
    expect(key1).toBe(key2);
  });

  it('should perform accent-insensitive and case-insensitive search', () => {
    expect(matchesSearchQuery('Nơi này có anh', 'noi nay')).toBe(true);
    expect(matchesSearchQuery('Sơn Tùng M-TP', 'son tung')).toBe(true);
    expect(matchesSearchQuery('Đom Đóm', 'dom dom')).toBe(true);
    expect(matchesSearchQuery('Sóng Gió', 'khong co')).toBe(false);
  });
});
