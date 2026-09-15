import { describe, it, expect } from 'vitest';
import { generateKaraokePlaylist } from './engine';
import { Member, Song, MemberSong } from '../../types';

describe('Recommendation & Fairness Engine', () => {
  // Test Data Setup: Qt, Huy, Khang
  const qt: Member = { id: 'm-qt', group_id: 'g1', display_name: 'Qt', avatar: '😎' };
  const huy: Member = { id: 'm-huy', group_id: 'g1', display_name: 'Huy', avatar: '🤠' };
  const khang: Member = { id: 'm-khang', group_id: 'g1', display_name: 'Khang', avatar: '🥳' };
  const nam: Member = { id: 'm-nam', group_id: 'g1', display_name: 'Nam', avatar: '😇' }; // Not attending

  const members = [qt, huy, khang, nam];

  const songNoiNayCoAnh: Song = { id: 's1', title: 'Nơi này có anh', artist: 'Sơn Tùng M-TP', normalized_title: 'noi nay co anh' };
  const songBacPhan: Song = { id: 's2', title: 'Bạc phận', artist: 'Jack x K-ICM', normalized_title: 'bac phan' };
  const songSongGio: Song = { id: 's3', title: 'Sóng gió', artist: 'Jack x K-ICM', normalized_title: 'song gio' };
  const songChungTa: Song = { id: 's4', title: 'Chúng ta của tương lai', artist: 'Sơn Tùng M-TP', normalized_title: 'chung ta cua tuong lai' };
  const songNamSolo: Song = { id: 's5', title: 'Lạc trôi', artist: 'Sơn Tùng M-TP', normalized_title: 'lac troi' };

  const allSongs = [songNoiNayCoAnh, songBacPhan, songSongGio, songChungTa, songNamSolo];

  // Qt: Nơi này có anh, Bạc phận, Sóng gió
  // Huy: Nơi này có anh, Bạc phận, Chúng ta của tương lai
  // Khang: Nơi này có anh, Sóng gió, Chúng ta của tương lai
  // Nam: Lạc trôi
  const memberSongs: MemberSong[] = [
    // Qt
    { id: 'ms1', member_id: 'm-qt', song_id: 's1', favorite: true, priority: 'HIGH' },
    { id: 'ms2', member_id: 'm-qt', song_id: 's2', favorite: false, priority: 'WANT_TO_SING' },
    { id: 'ms3', member_id: 'm-qt', song_id: 's3', favorite: false, priority: 'NORMAL' },
    // Huy
    { id: 'ms4', member_id: 'm-huy', song_id: 's1', favorite: false, priority: 'NORMAL' },
    { id: 'ms5', member_id: 'm-huy', song_id: 's2', favorite: true, priority: 'HIGH' },
    { id: 'ms6', member_id: 'm-huy', song_id: 's4', favorite: false, priority: 'WANT_TO_SING' },
    // Khang
    { id: 'ms7', member_id: 'm-khang', song_id: 's1', favorite: false, priority: 'NORMAL' },
    { id: 'ms8', member_id: 'm-khang', song_id: 's3', favorite: true, priority: 'HIGH' },
    { id: 'ms9', member_id: 'm-khang', song_id: 's4', favorite: false, priority: 'NORMAL' },
    // Nam
    { id: 'ms10', member_id: 'm-nam', song_id: 's5', favorite: true, priority: 'HIGH' },
  ];

  it('should generate ranked playlist prioritizing songs with highest common member overlap', () => {
    const result = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt', 'm-huy', 'm-khang'],
      members,
      memberSongs,
      allSongs,
    });

    expect(result.length).toBe(4);

    // "Nơi này có anh" is known by all 3/3 members -> MUST be rank 1
    expect(result[0].song.title).toBe('Nơi này có anh');
    expect(result[0].matchCount).toBe(3);
    expect(result[0].totalParticipants).toBe(3);

    // Other songs have 2/3 members
    const titles2of3 = result.slice(1).map(r => r.song.title);
    expect(titles2of3).toContain('Bạc phận');
    expect(titles2of3).toContain('Sóng gió');
    expect(titles2of3).toContain('Chúng ta của tương lai');

    // Nam is not selected, so "Lạc trôi" MUST NOT be in the result
    expect(result.some(r => r.song.title === 'Lạc trôi')).toBe(false);
  });

  it('should exclusively consider selected attendees and exclude absent members', () => {
    // Only Qt and Huy attend
    const result = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt', 'm-huy'],
      members,
      memberSongs,
      allSongs,
    });

    // Songs known by both Qt & Huy
    const firstTwo = result.slice(0, 2).map(r => r.song.title);
    expect(firstTwo).toContain('Nơi này có anh');
    expect(firstTwo).toContain('Bạc phận');

    // Sóng gió (known by Qt only in this group of 2) -> 1/2
    const songGioRec = result.find(r => r.song.title === 'Sóng gió');
    expect(songGioRec?.matchCount).toBe(1);
    expect(songGioRec?.totalParticipants).toBe(2);

    // Khang and Nam exclusive songs are not present
    expect(result.some(r => r.song.title === 'Lạc trôi')).toBe(false);
  });

  it('should correctly apply priority bonus and favorite bonus', () => {
    // Single attendee: Qt
    const result = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt'],
      members,
      memberSongs,
      allSongs,
    });

    // Qt has:
    // Nơi này có anh: favorite=true (+3), priority=HIGH (+5), base=10 => rawScore 18
    // Bạc phận: favorite=false, priority=WANT_TO_SING (+2), base=10 => rawScore 12
    // Sóng gió: favorite=false, priority=NORMAL (+0), base=10 => rawScore 10
    const noiNay = result.find(r => r.song.title === 'Nơi này có anh');
    const bacPhan = result.find(r => r.song.title === 'Bạc phận');
    const songGio = result.find(r => r.song.title === 'Sóng gió');

    expect(noiNay?.scoreBreakdown.favoriteBonus).toBe(3);
    expect(noiNay?.scoreBreakdown.priorityBonus).toBe(5);
    expect(noiNay?.score).toBeGreaterThan(bacPhan!.score);
    expect(bacPhan?.score).toBeGreaterThan(songGio!.score);
  });

  it('should apply recently sung penalty to reduce score without outright blocking the song', () => {
    // When "Nơi này có anh" was recently sung
    const withoutPenalty = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt', 'm-huy', 'm-khang'],
      members,
      memberSongs,
      allSongs,
      recentlySungSongIds: [],
    });

    const withPenalty = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt', 'm-huy', 'm-khang'],
      members,
      memberSongs,
      allSongs,
      recentlySungSongIds: ['s1'], // Nơi này có anh
    });

    const scoreBefore = withoutPenalty.find(r => r.song.id === 's1')!.score;
    const scoreAfter = withPenalty.find(r => r.song.id === 's1')!.score;

    expect(scoreAfter).toBe(scoreBefore - 5);
    expect(withPenalty.find(r => r.song.id === 's1')?.isRecentlySung).toBe(true);
  });

  it('should return an empty array if no members are selected', () => {
    const result = generateKaraokePlaylist({
      selectedMemberIds: [],
      members,
      memberSongs,
      allSongs,
    });

    expect(result).toEqual([]);
  });

  it('should apply fairness bonus to balance solo songs between members', () => {
    // Create scenario: Qt has 3 solo songs, Huy has 1 solo song
    const soloQt1: Song = { id: 'sq1', title: 'Qt Solo 1', artist: 'A', normalized_title: 'qt solo 1' };
    const soloQt2: Song = { id: 'sq2', title: 'Qt Solo 2', artist: 'A', normalized_title: 'qt solo 2' };
    const soloQt3: Song = { id: 'sq3', title: 'Qt Solo 3', artist: 'A', normalized_title: 'qt solo 3' };
    const soloHuy1: Song = { id: 'sh1', title: 'Huy Solo 1', artist: 'B', normalized_title: 'huy solo 1' };

    const customSongs = [soloQt1, soloQt2, soloQt3, soloHuy1];
    const customMemberSongs: MemberSong[] = [
      { id: 'msq1', member_id: 'm-qt', song_id: 'sq1', favorite: false, priority: 'NORMAL' },
      { id: 'msq2', member_id: 'm-qt', song_id: 'sq2', favorite: false, priority: 'NORMAL' },
      { id: 'msq3', member_id: 'm-qt', song_id: 'sq3', favorite: false, priority: 'NORMAL' },
      { id: 'msh1', member_id: 'm-huy', song_id: 'sh1', favorite: false, priority: 'NORMAL' },
    ];

    const result = generateKaraokePlaylist({
      selectedMemberIds: ['m-qt', 'm-huy'],
      members: [qt, huy],
      memberSongs: customMemberSongs,
      allSongs: customSongs,
    });

    expect(result.length).toBe(4);
    // Fairness bonus should be applied to candidates to prevent a single person from taking all slots
    expect(result.some(r => r.scoreBreakdown.fairnessBonus > 0)).toBe(true);
  });
});
