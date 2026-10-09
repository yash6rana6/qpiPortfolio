export const NAV_LINKS = [
  { label: 'Events', href: '/events' },
  { label: 'Recent', href: '/#recent-events' },
  { label: 'About', href: '/about' }
]

export const MARQUEE_ITEMS = ['Live shows', 'Instant booking codes', 'Secure payments', 'Real-time seats']

export const ABOUT_HERO_LINES = [
  'We build',
  'the stage,',
  'you bring',
  { text: 'the crowd.', className: 'text-vice-pink' }
]

// Matches what the app actually does (see README "How a booking works").
export const VALUES = [
  {
    id: 'fair',
    title: 'Fair by design',
    body: 'Ticket prices are calculated on our server from the event itself — what you see is exactly what you pay.'
  },
  {
    id: 'seats',
    title: 'Never double-booked',
    body: 'Seats are locked with an atomic update, so two people can never walk away with the last ticket.'
  },
  {
    id: 'organizers',
    title: 'Built for organizers',
    body: 'Create an event, set seats and price from the admin panel, and it goes live on the site instantly.'
  }
]

// Photos go in /public/team — e.g. public/team/yash.jpg. Edit names/roles freely.
export const TEAM = [
  
  { id: 'robbin', name: 'Robbin Bajpai', role: 'General Manager', photo: '/team/robbin.jpeg' },
  { id: 'member-3', name: 'Mandeep Singh', role: 'Bussiness Development Manager', photo: '/team/mandeep.png' },
  { id: 'member-4', name: 'Aryan Gupta', role: 'Bussiness Development Manager', photo: '/team/aryan.jpeg' },
  { id: 'yash', name: 'Yash Deep Singh', role: 'Software Developer', photo: '/team/yash.png' },
  { id: 'sumit', name: 'Sumit Dwivedi', role: 'AGM Digital Marketing', photo: '/team/sumit.jpeg' },
  { id: 'amar', name: 'Amar Giri', role: 'SM Manager & Senior Graphic Designer', photo: '/team/amar_giri.jpeg' },
  
  { id: 'santosh', name: 'Santosh Singh', role: 'Grapic Designer', photo: '/team/santosh.jpeg' },
]
