/**
 * The kinds of pages MyLinnnk makes. Shared by the hero's floating cards and
 * the "Moments" section. `icon` is a list of SVG path strings (24×24 grid,
 * stroked with currentColor).
 */
export const MOMENTS = [
  {
    id: 'birthday',
    label: 'Birthday',
    title: 'Maya turns 30',
    meta: 'Sat · 7 pm · Rooftop',
    url: 'mylinnnk.com/maya30',
    blurb: 'The date, the details, your photos and a heartfelt message — all on one page.',
    cover: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 55%, #f0abfc 100%)',
    icon: [
      'M4 21h16',
      'M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7',
      'M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 5 0',
      'M12 12V8',
      'M12 5.5c.9-.9.9-2.1 0-3.2-.9 1.1-.9 2.3 0 3.2z',
    ],
  },
  {
    id: 'wedding',
    label: 'Wedding',
    title: 'Sam & Alex',
    meta: 'June 14 · Lisbon',
    url: 'mylinnnk.com/samandalex',
    blurb: 'Your story, the schedule, travel tips and a photo gallery in one place.',
    cover: 'linear-gradient(135deg, #ddd6fe 0%, #a5b4fc 50%, #5eead4 100%)',
    icon: ['M9 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M15 21a5.5 5.5 0 1 0 0-11', 'M9.5 7 12 3l2.5 4'],
  },
  {
    id: 'business',
    label: 'Business',
    title: 'Northwind Studio',
    meta: 'Design · Open Mon–Fri',
    url: 'mylinnnk.com/northwind',
    blurb: 'A clean profile with services, links and contact details — ready to share.',
    cover: 'linear-gradient(135deg, #0a1630 0%, #13244a 45%, #0d9488 100%)',
    icon: ['M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2', 'M3 13h18'],
  },
  {
    id: 'story',
    label: 'Personal story',
    title: 'My year in Lisbon',
    meta: '12 chapters · 86 photos',
    url: 'mylinnnk.com/lena',
    blurb: 'Chapters, photos and memories laid out beautifully, told your way.',
    cover: 'linear-gradient(135deg, #14b8a6 0%, #5eead4 50%, #bae6fd 100%)',
    icon: ['M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20', 'M8 7h8', 'M8 11h5'],
  },
]
